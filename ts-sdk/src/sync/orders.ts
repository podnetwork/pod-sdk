// OrderHistory: a SeriesResource<Order> seeded from the warm first page, kept
// live by the pod_orders_v2 stream (bidder-filtered, resumed from a (batch, book)
// cursor by `ResumableStream`), and paged backwards by cursor for deep history.

import type { Address, Order, OrderEvent, OrdersQuery } from "../types/public.js";
import type { WireOrdersFrame } from "../types/wire.js";
import { applyOrdersFrame } from "../codec/orders-v2.js";
import { BaseResource, type ResourceHandle, type Snapshot, type SnapshotSlot } from "../stores/resource.js";
import type { SubParams } from "../transport/ws.js";
import type { SeriesResource } from "./candles.js";
import type { SyncContext } from "./sources.js";
import { compareCursor, ResumableStream } from "./stream.js";

export { compareCursor } from "./stream.js";

export class OrderHistory implements SeriesResource<Order> {
  private readonly base: BaseResource<Order[]>;
  private handle: ResourceHandle<Order[]> | undefined;
  private readonly byId = new Map<string, Order>();
  private nextCursor: string | null = null;
  private painted = false;
  private seedGen = 0;
  private _hasMore = true;
  private _loading = false;
  private readonly eventListeners = new Set<(events: OrderEvent[]) => void>();
  private readonly stream: ResumableStream;

  constructor(
    private readonly ctx: SyncContext,
    private readonly account: Address,
    private readonly query: OrdersQuery = {},
    slot?: SnapshotSlot,
  ) {
    this.stream = new ResumableStream({
      ws: ctx.ws,
      channel: "pod_orders_v2",
      params: { account },
      reseed: () => this.fetchFirstPage(),
      onFrame: (r) => this.onFrame(r),
    });
    this.base = new BaseResource<Order[]>((h) => {
      this.handle = h;
      this.stream.start();
      return () => {
        this.stream.stop();
        this.handle = undefined;
      };
    }, slot);
  }

  get(): Order[] | undefined { return this.base.get(); }
  lastKnown(): Snapshot<Order[]> | undefined { return this.base.lastKnown(); }
  isProvisional(): boolean { return this.base.isProvisional(); }
  subscribe(listener: () => void): () => void { return this.base.subscribe(listener); }
  ready(): Promise<Order[]> { return this.base.ready(); }
  get error(): Error | undefined { return this.base.error; }
  hasMore(): boolean { return this._hasMore; }
  loading(): boolean { return this._loading; }
  destroy(): void { this.base.destroy(); }

  /**
   * Observe the transitions the stream reports, as they arrive — a frame at a time, in
   * the order the engine caused them.
   *
   * The snapshot (`get`/`subscribe`) is what to render; this is what *happened*, which
   * a snapshot cannot express: two fills in one batch are one state change, and a
   * refused amendment is none at all. Nothing is emitted for the REST seed, so a
   * consumer never has to filter out a backlog of history as if it were live.
   */
  onEvent(listener: (events: OrderEvent[]) => void): () => void {
    this.eventListeners.add(listener);
    // Listening starts the stream, like subscribing does. The resource is ref-counted
    // from `subscribe`/`ready` alone, so without holding one an event-only consumer
    // would wait forever — and would fall silent the moment the last snapshot
    // subscriber left, since teardown drops the websocket subscription and leaves the
    // listeners registered.
    const release = this.base.subscribe(() => {});
    return () => { this.eventListeners.delete(listener); release(); };
  }

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
    const gen = ++this.seedGen;
    const before = this.stream.cursor;
    try {
      const page = await this.ctx.rest.orders(this.account, { limit: this.query.limit ?? 100 });
      // A seed overtaken by a fresher one is dropped whole: it would absorb rows the
      // newer page has already corrected, and raise the cursor to an older watermark.
      if (!this.stream.running || gen !== this.seedGen) return false;
      // The transport resubscribes synchronously right after the `open` event that
      // starts this fetch, so replayed frames can land while it is still in flight —
      // and the indexer trails the stream by design. Overwriting a row the stream has
      // already advanced would revert it, permanently: the cursor refuses to rewind
      // and `onFrame` drops a re-delivery, so nothing would repair it.
      const streamMovedOn = compareCursor(this.stream.cursor, before) > 0;
      for (const o of page.orders) {
        if (streamMovedOn && this.byId.has(o.id)) continue;
        this.byId.set(o.id, o);
      }
      // Paging is the consumer's position in history, not the seed's: a reconnect
      // re-paints the first page, and taking its cursor again would hand back pages
      // `loadOlder` has already walked past.
      if (!this.painted) {
        this.painted = true;
        this.nextCursor = page.nextCursor;
        this._hasMore = page.nextCursor !== null;
      }
      // Only ever forward, and a page settles whole batches, so its watermark
      // carries no book — which makes it *ahead* of a stream position in the same
      // batch, not equal to it.
      this.stream.raise({ since: page.solutionNow * 1000, sinceBook: undefined });
      this.rebuild();
      return true;
    } catch (e) {
      // Only before the first paint: an account whose history is genuinely empty has
      // a resource, and reporting a later transient failure on it would blank the view.
      if (this.handle && this.handle.current() === undefined) this.handle.fail(e as Error);
      throw e;
    }
  }

  /** One frame: everything that happened to one book in one auction batch. */
  private onFrame(result: unknown): void {
    const frame = result as WireOrdersFrame;
    if (!frame || !Array.isArray(frame.orders) || !Array.isArray(frame.events)) return;

    // Drop what we already hold. Applying a frame is not idempotent — a fill event
    // appends to `order.fills`, and re-creating an entity resets its totals — and
    // re-delivery is designed in: a resumed subscription replays from a cursor, and
    // the replay boundary is a whole batch.
    const at: SubParams = { since: frame.batch, sinceBook: frame.book };
    if (this.stream.delivered(at)) return;

    const events = applyOrdersFrame(frame, this.byId, { account: this.account });
    this.stream.advance(at);
    this.rebuild();
    // Strictly after `rebuild()`: a listener that reads the resource in response to an
    // event must see the state that event produced, not the state before it.
    if (events.length) {
      for (const listener of this.eventListeners) {
        try { listener(events); } catch { /* a listener's failure is not the stream's */ }
      }
    }
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
