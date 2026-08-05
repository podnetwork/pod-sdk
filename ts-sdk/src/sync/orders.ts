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

import type { Address, Order, OrdersQuery } from "../types/public.js";
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
      // Only ever forward. The indexer can be behind the stream, and resuming from
      // a point already applied re-delivers frames — harmless for entities and
      // modifications, which carry absolute values, but a replayed fill would be
      // appended to `fills` a second time. A page settles whole batches, so its
      // watermark carries no book.
      const pageUs = page.solutionNow * 1000;
      if (pageUs > (this.cursor.since ?? 0)) this.cursor = { since: pageUs };
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
   * Everything else (a rejection, a server bug, or closes that keep coming) takes
   * the slow path: backed off and capped, so a server that keeps refusing cannot
   * spin this into a tight re-seed loop, and eventually the cursor is dropped (the
   * likely culprit) to just stream live. Both counters reset once live data flows
   * (`onFrame`).
   */
  private onSubError(err: unknown): void {
    if (!this.alive) return;
    if (err instanceof PodSubscriptionClosedError && err.resumable && this.fastResumes < FAST_RESUMES_BEFORE_RESEED) {
      this.fastResumes++;
      // The server's watermark beats ours — it knows which frames it managed to
      // hand over — and taking it here keeps `cursor` the one place the position
      // lives, rather than leaving it to the copy the transport advanced.
      if (err.resumeSince !== undefined) this.cursor = { since: err.resumeSince, sinceBook: err.resumeSinceBook };
      this.sub?.resubscribe();
      return;
    }
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

    applyOrdersFrame(frame, this.byId, { account: this.account, nowMs: Date.now() });
    // A socket-level reconnect resubscribes from whatever is stored here, so the
    // pair advances per frame — never backwards, since a resumed subscription
    // replays older batches and must not undo the position we already reached.
    if (frame.batch >= (this.cursor.since ?? 0)) {
      this.cursor = { since: frame.batch, sinceBook: frame.book };
      this.sub?.update(this.cursor);
    }
    this.rebuild();
  }

  private rebuild(): void {
    if (!this.handle) return;
    let arr = [...this.byId.values()];
    if (this.query.status) arr = arr.filter((o) => o.status === this.query.status);
    if (this.query.orderbookId) arr = arr.filter((o) => o.orderbookId === this.query.orderbookId);
    arr.sort((a, b) => b.deadlineMs - a.deadlineMs || b.nonce - a.nonce);
    this.handle.set(arr);
  }
}
