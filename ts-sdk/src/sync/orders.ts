// OrderHistory: a SeriesResource<Order> seeded from the warm first page, kept
// live by the pod_orders_v2 stream (bidder-filtered, resumed from a (batch, book)
// cursor), and paged backwards by cursor for deep history.
//
// Reconnect: on every (re)connect we re-seed the first page (authoritative open
// orders) and refresh the cursor from its watermark; the WS auto-resubscribes,
// and if the cursor is too old (down too long) `onError` re-seeds and
// resubscribes. A server-initiated close is not the same as a rejection: the
// transport has already advanced the cursor to the server's watermark, so
// resuming from one is a bare `resubscribe()` with no re-seed.

import type { Address, Hash, MarketId, MarketType, Order, OrdersQuery } from "../types/public.js";
import type { WireOrdersFrame } from "../types/wire.js";
import { applyOrdersFrame } from "../codec/orders-v2.js";
import { BaseResource, type ResourceHandle } from "../stores/resource.js";
import { PodSubscriptionClosedError, type Subscription } from "../transport/ws.js";
import type { SeriesResource } from "./candles.js";
import type { SyncContext } from "./sources.js";

/**
 * Consecutive server closes we resume from before falling back to the re-seed
 * path. A lagged close is recoverable by resubscribing, so the fast path is the
 * right default — but a stream that keeps closing is one we are not keeping up
 * with, and re-seeding beats replaying a growing backlog on every attempt.
 */
const FAST_RESUMES_BEFORE_RESEED = 3;

export class OrderHistory implements SeriesResource<Order> {
  private readonly base: BaseResource<Order[]>;
  private handle: ResourceHandle<Order[]> | undefined;
  private readonly byId = new Map<string, Order>();
  private nextCursor: string | null = null;
  private sub: Subscription | undefined;
  private watermarkUs = 0;
  private alive = false;
  private _hasMore = true;
  private _loading = false;
  private subRetries = 0;
  private fastResumes = 0;
  private retryTimer?: ReturnType<typeof setTimeout>;
  /** The last frame accepted: `since` plus the book that completes it. */
  private cursorBook: Hash | undefined;

  constructor(
    private readonly ctx: SyncContext,
    private readonly account: Address,
    private readonly query: OrdersQuery = {},
    /** The market type for a book, when the markets list has loaded. */
    private readonly marketType?: (book: MarketId) => MarketType | undefined,
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
      // appended to `fills` a second time. A page settles whole batches, so a
      // watermark taken from one retires the book half of the cursor.
      const pageUs = page.solutionNow * 1000;
      if (pageUs > this.watermarkUs) {
        this.watermarkUs = pageUs;
        this.cursorBook = undefined;
      }
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
          { account: this.account, since: this.watermarkUs, sinceBook: this.cursorBook },
          (r) => this.onFrame(r),
          (e) => this.onSubError(e),
        );
      } else {
        // Refresh for the next reconnect.
        this.sub.update({ since: this.watermarkUs, sinceBook: this.cursorBook });
      }
    });
  }

  /**
   * The subscription is not running: `eth_subscribe` was rejected, or the server
   * closed it.
   *
   * A resumable close needs neither a re-seed nor a delay — the transport has
   * already moved the cursor to the server's watermark, so resubscribing delivers
   * exactly the frames we never got. Everything else (a rejection, a server bug,
   * or closes that keep coming) takes the slow path: backed off and capped, so a
   * server that keeps refusing cannot spin this into a tight re-seed loop, and
   * after a couple of failures the cursor is dropped (the likely culprit) to just
   * stream live. Both counters reset once live data flows (`onFrame`).
   */
  private onSubError(err: unknown): void {
    if (!this.alive) return;
    if (err instanceof PodSubscriptionClosedError && err.resumable && this.fastResumes < FAST_RESUMES_BEFORE_RESEED) {
      this.fastResumes++;
      this.sub?.resubscribe();
      return;
    }
    this.subRetries++;
    const delay = Math.min(30_000, 500 * 2 ** (this.subRetries - 1));
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      void this.fetchFirstPage().then((ok) => {
        if (!ok || !this.alive) return;
        const tooOld = this.subRetries > 2;
        this.sub?.update({
          since: tooOld ? undefined : this.watermarkUs,
          sinceBook: tooOld ? undefined : this.cursorBook,
        });
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
    if (!frame || typeof frame !== "object" || !Array.isArray(frame.events)) return;

    applyOrdersFrame(frame, this.byId, {
      account: this.account,
      marketType: this.marketType,
      nowMs: Date.now(),
    });
    // Advance both halves together. A batch is delivered as one frame per book,
    // so this pair — not the batch alone — is where the stream actually is, and a
    // socket-level reconnect resubscribes from whatever is stored here. Never
    // backwards: a resumed subscription replays older batches, which must not
    // undo the position we already reached.
    if (frame.batch >= this.watermarkUs) {
      this.watermarkUs = frame.batch;
      this.cursorBook = frame.book;
      this.sub?.update({ since: frame.batch, sinceBook: frame.book });
    }
    this.rebuild();
  }

  private rebuild(): void {
    if (!this.handle) return;
    // Orders arrive with their book named by the frame, so `orderbookId` is set
    // from the start — nothing to resolve here.
    let arr = [...this.byId.values()];
    if (this.query.status) arr = arr.filter((o) => o.status === this.query.status);
    if (this.query.orderbookId) arr = arr.filter((o) => o.orderbookId === this.query.orderbookId);
    arr.sort((a, b) => b.deadlineMs - a.deadlineMs || b.nonce - a.nonce);
    this.handle.set(arr);
  }
}
