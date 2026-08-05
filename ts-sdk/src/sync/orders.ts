// OrderHistory: a SeriesResource<Order> seeded from the warm first page, kept
// live by the pod_orders_v2 stream (bidder-filtered, resumed from a (batch, book)
// cursor), and paged backwards by cursor for deep history.
//
// Reconnect: on every (re)connect we re-seed the first page (authoritative open
// orders) and refresh the cursor from its watermark; the WS auto-resubscribes,
// and if the cursor is too old (down too long) `onError` re-seeds and
// resubscribes. A server-initiated close is not the same as a rejection: it
// reports where delivery stopped, so resuming from one is a bare `resubscribe()`
// with no re-seed.

import type { Address, MarketId, Order, OrdersQuery } from "../types/public.js";
import type { WireOrdersFrame } from "../types/wire.js";
import { applyOrdersFrame } from "../codec/orders-v2.js";
import { BaseResource, type ResourceHandle } from "../stores/resource.js";
import { PodSubscriptionClosedError, type SubParams, type Subscription } from "../transport/ws.js";
import type { SeriesResource } from "./candles.js";
import type { SyncContext } from "./sources.js";

/**
 * Consecutive server closes we resume from before falling back to the re-seed
 * path. A lagged close is recoverable by resubscribing, so the fast path is the
 * right default — but a stream that keeps closing is one we are not keeping up
 * with, and re-seeding beats replaying a growing backlog on every attempt.
 */
const FAST_RESUMES_BEFORE_RESEED = 3;

/**
 * Re-seed attempts that keep the cursor before we conclude the cursor is what the
 * server is rejecting, drop it, and settle for streaming live.
 */
const RETRIES_BEFORE_DROPPING_CURSOR = 2;

/** The largest book id, which is what an absent `sinceBook` means. */
const WHOLE_BATCH = `0x${"ff".repeat(32)}` as MarketId;

/**
 * Order two positions in the stream, the way the server does.
 *
 * A batch is delivered as one frame per book, so a position is the pair
 * `(batch, book)` — and an absent book means the whole batch, which sorts *above*
 * every book in it. This mirrors `already_delivered` in
 * `node/src/rpc/orders_v2.rs`: `(frame_batch, frame_book) <= (since,
 * since_book.unwrap_or(0xff…))`. Getting the absent case wrong turns "all of batch
 * N" into "up to book B of batch N", which asks the server to re-send the rest.
 *
 * Book ids are fixed-width lowercase hex, so comparing them as strings is
 * comparing their bytes.
 */
export function compareCursor(a: SubParams, b: SubParams): number {
  const [ab, bb] = [a.since ?? 0, b.since ?? 0];
  if (ab !== bb) return ab < bb ? -1 : 1;
  const [abook, bbook] = [a.sinceBook ?? WHOLE_BATCH, b.sinceBook ?? WHOLE_BATCH];
  return abook === bbook ? 0 : abook < bbook ? -1 : 1;
}

export class OrderHistory implements SeriesResource<Order> {
  private readonly base: BaseResource<Order[]>;
  private handle: ResourceHandle<Order[]> | undefined;
  private readonly byId = new Map<string, Order>();
  private nextCursor: string | null = null;
  private sub: Subscription | undefined;
  private alive = false;
  private _hasMore = true;
  private _loading = false;
  private subRetries = 0;
  private fastResumes = 0;
  private retryTimer?: ReturnType<typeof setTimeout>;
  /**
   * Where the stream is: the last frame accepted, as the `(batch, book)` pair the
   * channel resumes from. Replaced whole rather than patched half at a time —
   * `sinceBook` names a book *within* `since`, so the two are one fact and a
   * mismatched pair asks the server to skip books we never saw.
   */
  private cursor: SubParams = { since: 0 };

  constructor(
    private readonly ctx: SyncContext,
    private readonly account: Address,
    private readonly query: OrdersQuery = {},
  ) {
    this.base = new BaseResource<Order[]>((h) => {
      this.handle = h;
      this.alive = true;
      const offOpen = this.ctx.ws.on("open", () => { if (this.alive) this.seed(); });
      this.seed(); // initial paint (REST is independent of the socket being open)
      return () => {
        this.alive = false;
        offOpen();
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.sub?.unsubscribe();
        this.sub = undefined;
        this.handle = undefined;
      };
    });
  }

  get(): Order[] | undefined { return this.base.get(); }
  subscribe(listener: () => void): () => void { return this.base.subscribe(listener); }
  ready(): Promise<Order[]> { return this.base.ready(); }
  get error(): Error | undefined { return this.base.error; }
  hasMore(): boolean { return this._hasMore; }
  loading(): boolean { return this._loading; }
  destroy(): void { this.base.destroy(); }

  setWindow(): void { /* order history pages by cursor, not by time window */ }

  async loadOlder(): Promise<void> {
    if (!this.handle || !this.nextCursor || this._loading) return;
    this._loading = true;
    this.rebuild();
    try {
      const page = await this.ctx.rest.orders(this.account, {
        cursor: this.nextCursor,
        limit: this.query.limit ?? 100,
      });
      for (const o of page.orders) if (!this.byId.has(o.id)) this.byId.set(o.id, o);
      this.nextCursor = page.nextCursor;
      this._hasMore = page.nextCursor !== null;
    } finally {
      this._loading = false;
      this.rebuild();
    }
  }

  // --- internals ---

  private async fetchFirstPage(): Promise<boolean> {
    try {
      const page = await this.ctx.rest.orders(this.account, { limit: this.query.limit ?? 100 });
      if (!this.alive) return false;
      for (const o of page.orders) this.byId.set(o.id, o);
      this.nextCursor = page.nextCursor;
      this._hasMore = page.nextCursor !== null;
      // Only ever forward, and a page settles whole batches, so its watermark
      // carries no book — which makes it *ahead* of a stream position in the same
      // batch, not equal to it.
      const settled: SubParams = { since: page.solutionNow * 1000 };
      if (compareCursor(settled, this.cursor) > 0) this.cursor = settled;
      this.rebuild();
      return true;
    } catch (e) {
      if (this.byId.size === 0) this.handle?.fail(e as Error);
      return false;
    }
  }

  private seed(): void {
    void this.fetchFirstPage().then((ok) => {
      if (!ok || !this.alive) return;
      if (!this.sub) {
        this.sub = this.ctx.ws.subscribe(
          "pod_orders_v2",
          { account: this.account, ...this.cursor },
          (r) => this.onFrame(r),
          (e) => this.onSubError(e),
        );
      } else {
        this.sub.update(this.cursor); // refresh for the next reconnect
      }
    });
  }

  /**
   * The subscription is not running: `eth_subscribe` was rejected, or the server
   * closed it.
   *
   * A resumable close needs neither a re-seed nor a delay: the server reports where
   * it stopped, so resubscribing from that delivers exactly the frames we never got.
   * That fast path is only taken while the socket is actually open — `resubscribe()`
   * is a no-op otherwise, which would spend the budget without an attempt and leave
   * nothing scheduled, and `-32021` (node shutting down) arrives exactly as the
   * socket goes away.
   *
   * Everything else (a rejection, a server bug, a close with the socket already
   * gone, or closes that keep coming) takes the slow path: backed off and capped, so
   * a server that keeps refusing cannot spin this into a tight re-seed loop, and
   * eventually the cursor is dropped (the likely culprit) to just stream live. Both
   * counters reset once live data flows (`onFrame`).
   */
  private onSubError(err: unknown): void {
    if (!this.alive) return;
    const canFastResume = err instanceof PodSubscriptionClosedError && err.resumable
      && this.fastResumes < FAST_RESUMES_BEFORE_RESEED && this.ctx.ws.state === "open";
    if (canFastResume) {
      this.fastResumes++;
      // Adopt the server's watermark only when it is ahead of ours: it knows which
      // frames it handed over, but a re-seed may already have carried us past it,
      // and rewinding would re-deliver frames we have applied.
      const closed = err as PodSubscriptionClosedError;
      const reported: SubParams = { since: closed.resumeSince, sinceBook: closed.resumeSinceBook };
      if (closed.resumeSince !== undefined && compareCursor(reported, this.cursor) > 0) this.cursor = reported;
      this.sub?.resubscribe();
      return;
    }
    // The slow path, and the one that answers "what if we fell behind the server's
    // replay buffer": `eth_subscribe` rejects a `since` older than what the buffer
    // retains, and the prescribed recovery is to backfill over REST and resubscribe.
    // That is what this is. `fetchFirstPage` also *replaces the cursor* with the
    // page's watermark, so the position that was too old is gone by the first retry
    // and the resubscribe is accepted with no gap — the server replays from the page
    // forward. Dropping the cursor below is the backstop for when even that fresh
    // watermark is refused (the indexer further behind than the buffer retains):
    // live-only resubscribe, trading the unreplayable window for a working stream.
    this.subRetries++;
    const delay = Math.min(30_000, 500 * 2 ** (this.subRetries - 1));
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      void this.fetchFirstPage().then((ok) => {
        if (!ok || !this.alive) return;
        const tooOld = this.subRetries > RETRIES_BEFORE_DROPPING_CURSOR;
        this.sub?.update(tooOld ? { since: undefined, sinceBook: undefined } : this.cursor);
        this.sub?.resubscribe();
      });
    }, delay);
  }

  /** One frame: everything that happened to one book in one auction batch. */
  private onFrame(result: unknown): void {
    // Live data flowing → the subscription is healthy on both paths.
    this.subRetries = 0;
    this.fastResumes = 0;
    const frame = result as WireOrdersFrame;
    if (!frame || !Array.isArray(frame.orders) || !Array.isArray(frame.events)) return;

    // Drop what we already hold. Applying a frame is not idempotent — a fill event
    // appends to `order.fills`, and re-creating an entity resets its totals — and
    // re-delivery is designed in: a resumed subscription replays from a cursor, and
    // the replay boundary is a whole batch. Same predicate as the server's
    // `already_delivered`, so client and server agree on what "already sent" means.
    const at: SubParams = { since: frame.batch, sinceBook: frame.book };
    if (compareCursor(at, this.cursor) <= 0) return;

    applyOrdersFrame(frame, this.byId, { account: this.account, nowMs: Date.now() });
    // A socket-level reconnect resubscribes from whatever is stored here.
    this.cursor = at;
    this.sub?.update(at);
    this.rebuild();
  }

  private rebuild(): void {
    if (!this.handle) return;
    let arr = [...this.byId.values()];
    if (this.query.status) arr = arr.filter((o) => o.status === this.query.status);
    if (this.query.orderbookId) arr = arr.filter((o) => o.orderbookId === this.query.orderbookId);
    // Newest first by when the order became real. Inclusion time is the key both
    // sources report — REST sends it alongside the signed deadline, and a frame's
    // batch *is* it — so a REST row and a streamed row sort against each other. An
    // order with none has not been in a batch yet, so it is newer than every order
    // that has; the signed deadline is deliberately not a fallback, since it is a
    // future time and would sort on a different clock.
    const at = (o: Order) => o.includedMs ?? Number.MAX_SAFE_INTEGER;
    arr.sort((a, b) => at(b) - at(a) || b.nonce - a.nonce);
    this.handle.set(arr);
  }
}
