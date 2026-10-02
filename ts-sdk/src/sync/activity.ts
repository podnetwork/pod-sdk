// ActivityHistory: one account's whole activity (ADR 0057) — `OrderHistory`
// widened to the money the account moved. Seeded from the first REST page, kept
// live by `pod_activity`, paged backwards by cursor.
//
// The cursor is the batch alone. `pod_activity` sends one frame per tick,
// covering every book, so a frame is already delivered exactly when its batch is
// at or below `since` — there is no `sinceBook` to resume inside a tick with.

import type {
  ActivityEntry, ActivityEvent, ActivityQuery, Address, MoneyActivity, Order,
} from "../types/public.js";
import type { WireActivityFrame } from "../types/wire.js";
import { applyActivityFrame, isMoney } from "../codec/activity.js";
import { msToUs, usToMs } from "../codec/units.js";
import { BaseResource, type ResourceHandle } from "../stores/resource.js";
import type { SubParams } from "../transport/ws.js";
import type { SeriesResource } from "./candles.js";
import type { SyncContext } from "./sources.js";
import { compareCursor, ResumableStream } from "./stream.js";

/**
 * No types is no filter, and an empty list says the same thing. One form, so REST,
 * `keep()` and the client's memo key cannot read the same query three ways.
 */
export function normalizeActivityQuery(query: ActivityQuery = {}): ActivityQuery {
  return query.types?.length ? query : { ...query, types: undefined };
}

/** The node's page order within a tick: `(timestamp, ordinal, key)` descending. */
const ORDINAL = { order: 1, backstop: 2, bridge_transfer: 3, transfer: 4 } as const;

/**
 * A money row's identity, read off the row itself — so the same row keys the same
 * whichever page it arrives on and however many of its kind share its tick. A
 * backstop leg has no id of its own, but a sweep touches each market once.
 */
function moneyKey(entry: MoneyActivity): string {
  switch (entry.activityType) {
    case "transfer": return `transfer:${entry.transferId}`;
    case "bridge_transfer": return `bridge:${entry.txHash}:${entry.idx}`;
    case "backstop": return `backstop:${entry.timeMs}:${entry.orderbookId ?? "cash"}`;
  }
}

const cmp = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

/**
 * Separate two rows the tick and the ordinal cannot. Insertion order would do it
 * for one source alone, but a tick that arrives as a frame and a tick that arrives
 * as a page are built in different orders, and a reload must not reshuffle the list.
 */
function tiebreak(a: ActivityEntry, b: ActivityEntry): number {
  if (a.activityType === "order" && b.activityType === "order") {
    return b.order.nonce - a.order.nonce || cmp(a.order.id, b.order.id);
  }
  // Equal ordinals, so neither is an order.
  return cmp(moneyKey(a as MoneyActivity), moneyKey(b as MoneyActivity));
}

export class ActivityHistory implements SeriesResource<ActivityEntry> {
  private readonly base: BaseResource<ActivityEntry[]>;
  private handle: ResourceHandle<ActivityEntry[]> | undefined;
  private readonly orders = new Map<string, Order>();
  /**
   * When each order was reported, by order id. Kept beside the row rather than on
   * it: the node times an order by its signed deadline, which no frame carries, so
   * neither a later frame nor a re-seed must be able to retime a row already placed.
   */
  private readonly orderTimeMs = new Map<string, number>();
  /** The money rows, by {@link moneyKey}. */
  private readonly money = new Map<string, ActivityEntry>();
  private nextCursor: string | null = null;
  private painted = false;
  private seedGen = 0;
  private _hasMore = true;
  private _loading = false;
  private readonly eventListeners = new Set<(events: ActivityEvent[]) => void>();
  private readonly stream: ResumableStream;

  private readonly query: ActivityQuery;

  constructor(
    private readonly ctx: SyncContext,
    private readonly account: Address,
    query: ActivityQuery = {},
  ) {
    this.query = normalizeActivityQuery(query);
    this.stream = new ResumableStream({
      ws: ctx.ws,
      channel: "pod_activity",
      params: { account },
      reseed: () => this.fetchFirstPage(),
      onFrame: (r) => this.onFrame(r),
    });
    this.base = new BaseResource<ActivityEntry[]>((h) => {
      this.handle = h;
      this.stream.start();
      return () => {
        this.stream.stop();
        this.handle = undefined;
      };
    });
  }

  get(): ActivityEntry[] | undefined { return this.base.get(); }
  subscribe(listener: () => void): () => void { return this.base.subscribe(listener); }
  ready(): Promise<ActivityEntry[]> { return this.base.ready(); }
  get error(): Error | undefined { return this.base.error; }
  hasMore(): boolean { return this._hasMore; }
  loading(): boolean { return this._loading; }
  destroy(): void { this.base.destroy(); }

  /**
   * Observe what the stream reported, a tick at a time: the order transitions and
   * the money that moved. Nothing is emitted for the REST seed.
   */
  onEvent(listener: (events: ActivityEvent[]) => void): () => void {
    this.eventListeners.add(listener);
    // Listening starts the stream, like subscribing does — the resource is
    // ref-counted from `subscribe`/`ready` alone.
    const release = this.base.subscribe(() => {});
    return () => { this.eventListeners.delete(listener); release(); };
  }

  setWindow(): void { /* activity pages by cursor, not by time window */ }

  async loadOlder(): Promise<void> {
    if (!this.handle || !this.nextCursor || this._loading) return;
    this._loading = true;
    this.rebuild();
    try {
      const page = await this.ctx.rest.activity(this.account, {
        ...this.restQuery(),
        cursor: this.nextCursor,
      });
      this.absorb(page.activity, false);
      this.nextCursor = page.nextCursor;
      this._hasMore = page.nextCursor !== null;
    } finally {
      this._loading = false;
      this.rebuild();
    }
  }

  // --- internals ---

  private restQuery() {
    return { ...this.query, limit: this.query.limit ?? 100 };
  }

  private async fetchFirstPage(): Promise<boolean> {
    const gen = ++this.seedGen;
    const before = this.stream.cursor;
    try {
      const page = await this.ctx.rest.activity(this.account, this.restQuery());
      // A seed overtaken by a fresher one is dropped whole: it would absorb rows the
      // newer page has already corrected, and raise the cursor to an older watermark.
      if (!this.stream.running || gen !== this.seedGen) return false;
      // Replayed frames can land while this is in flight, and the indexer trails the
      // stream by design. Overwriting a row the stream has already advanced would
      // revert it permanently: the cursor refuses to rewind and `onFrame` drops a
      // re-delivery, so nothing would repair it.
      this.absorb(page.activity, compareCursor(this.stream.cursor, before) <= 0);
      // Paging is the consumer's position in history, not the seed's: a reconnect
      // re-paints the first page, and taking its cursor again would hand back pages
      // `loadOlder` has already walked past.
      if (!this.painted) {
        this.painted = true;
        this.nextCursor = page.nextCursor;
        this._hasMore = page.nextCursor !== null;
      }
      this.stream.raise({ since: msToUs(page.solutionNow) });
      this.rebuild();
      return true;
    } catch (e) {
      // Only before the first paint: an account whose history is genuinely empty has
      // a resource, and reporting a later transient failure on it would blank the view.
      if (this.handle && this.handle.current() === undefined) this.handle.fail(e as Error);
      throw e;
    }
  }

  private absorb(entries: ActivityEntry[], overwriteOrders: boolean): void {
    for (const entry of entries) {
      if (entry.activityType === "order") {
        if (!overwriteOrders && this.orders.has(entry.order.id)) continue;
        this.orders.set(entry.order.id, entry.order);
        // Only the source that first reported the order gets to time it. A re-seed
        // carries the node's row time for an order the stream already placed by its
        // batch, and taking it would move the row on every reconnect.
        if (!this.orderTimeMs.has(entry.order.id)) this.orderTimeMs.set(entry.order.id, entry.timeMs);
        continue;
      }
      const key = moneyKey(entry);
      if (!this.money.has(key)) this.money.set(key, entry);
    }
  }

  /** One frame: everything that happened to the account in one auction batch. */
  private onFrame(result: unknown): void {
    const frame = result as WireActivityFrame;
    if (!frame || !Array.isArray(frame.orders) || !Array.isArray(frame.events)) return;
    // Applying a frame is not idempotent — a fill appends to `order.fills` — and
    // re-delivery is designed in: a resumed subscription replays from the cursor.
    const at: SubParams = { since: frame.batch };
    if (this.stream.delivered(at)) return;
    const kept = this.keep(frame);
    if (!kept) return;

    const entries: ActivityEntry[] = [];
    const events = applyActivityFrame(kept, { orders: this.orders, entries }, {
      account: this.account,
    });
    // An order the stream is the first to report is timed by its batch; one the
    // seed already placed keeps the time the node gave it.
    const batchMs = usToMs(kept.batch);
    for (const o of kept.orders) if (!this.orderTimeMs.has(o.id)) this.orderTimeMs.set(o.id, batchMs);
    this.absorb(entries, false);
    this.stream.advance(at);
    this.rebuild();
    // Strictly after `rebuild()`: a listener that reads the resource in response to an
    // event must see the state that event produced.
    if (events.length) {
      for (const listener of this.eventListeners) {
        try { listener(events); } catch { /* a listener's failure is not the stream's */ }
      }
    }
  }

  /**
   * Narrow a frame to what the query asked for, or drop it. REST filters both the
   * kinds and the window server-side; the stream filters neither.
   */
  private keep(frame: WireActivityFrame): WireActivityFrame | undefined {
    const { types, from, to } = this.query;
    if (from !== undefined && frame.batch < msToUs(from)) return undefined;
    if (to !== undefined && frame.batch >= msToUs(to)) return undefined;
    if (!types) return frame;
    const want = new Set<string>(types);
    return {
      ...frame,
      // The order events index `orders`, so the two are kept or dropped together.
      orders: want.has("order") ? frame.orders : [],
      events: frame.events.filter((e) => want.has(isMoney(e.k) ? e.k : "order")),
    };
  }

  private rebuild(): void {
    if (!this.handle) return;
    const arr: ActivityEntry[] = new Array(this.orders.size + this.money.size);
    let i = 0;
    for (const [id, order] of this.orders) {
      arr[i++] = {
        activityType: "order",
        timeMs: this.orderTimeMs.get(id) ?? Number.MAX_SAFE_INTEGER,
        order,
      };
    }
    for (const entry of this.money.values()) arr[i++] = entry;
    arr.sort((a, b) =>
      b.timeMs - a.timeMs
      || ORDINAL[b.activityType] - ORDINAL[a.activityType]
      || tiebreak(a, b));
    this.handle.set(arr);
  }
}
