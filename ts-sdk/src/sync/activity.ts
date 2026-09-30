// ActivityHistory: one account's whole activity (ADR 0057) — `OrderHistory`
// widened to the money the account moved. Seeded from the first REST page, kept
// live by `pod_activity_v2`, paged backwards by cursor.
//
// The cursor is the batch alone. `pod_activity_v2` sends one frame per tick,
// covering every book, so a frame is already delivered exactly when its batch is
// at or below `since` — there is no `sinceBook` to resume inside a tick with.

import type {
  ActivityEntry, ActivityEvent, ActivityQuery, Address, Order,
} from "../types/public.js";
import type { WireActivityFrame, WireMoneyEvent } from "../types/wire.js";
import { applyActivityFrame } from "../codec/activity-v2.js";
import { msToUs } from "../codec/units.js";
import { BaseResource, type ResourceHandle } from "../stores/resource.js";
import type { SubParams } from "../transport/ws.js";
import type { SeriesResource } from "./candles.js";
import type { SyncContext } from "./sources.js";
import { ResumableStream } from "./stream.js";

const compareBatch = (a: SubParams, b: SubParams): number => (a.since ?? 0) - (b.since ?? 0);

/** The node's page order within a tick: `(timestamp, ordinal, key)` descending. */
const ORDINAL = { order: 1, backstop: 2, bridge_transfer: 3, transfer: 4 } as const;

const isMoney = (k: string): k is WireMoneyEvent["k"] =>
  k === "backstop" || k === "bridge_transfer" || k === "transfer";

export class ActivityHistory implements SeriesResource<ActivityEntry> {
  private readonly base: BaseResource<ActivityEntry[]>;
  private handle: ResourceHandle<ActivityEntry[]> | undefined;
  private readonly orders = new Map<string, Order>();
  /**
   * The money rows, by where they happened. Nothing on the wire identifies one —
   * a backstop leg has no id at all, and a self-transfer is two rows sharing a
   * `transfer_id` — so the key is the kind, the tick, and the position within that
   * tick's run of the kind, which is stable across a re-fetch of the same page.
   */
  private readonly money = new Map<string, ActivityEntry>();
  private nextCursor: string | null = null;
  private _hasMore = true;
  private _loading = false;
  private readonly eventListeners = new Set<(events: ActivityEvent[]) => void>();
  private readonly stream: ResumableStream;

  constructor(
    private readonly ctx: SyncContext,
    private readonly account: Address,
    private readonly query: ActivityQuery = {},
  ) {
    this.stream = new ResumableStream({
      ws: ctx.ws,
      channel: "pod_activity_v2",
      params: { account },
      cursor: { since: 0 },
      compare: compareBatch,
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
    return {
      limit: this.query.limit ?? 100,
      types: this.query.types,
      from: this.query.from,
      to: this.query.to,
    };
  }

  private async fetchFirstPage(): Promise<boolean> {
    const before = this.stream.cursor;
    try {
      const page = await this.ctx.rest.activity(this.account, this.restQuery());
      if (!this.stream.running) return false;
      // Replayed frames can land while this is in flight, and the indexer trails the
      // stream by design. Overwriting a row the stream has already advanced would
      // revert it permanently: the cursor refuses to rewind and `onFrame` drops a
      // re-delivery, so nothing would repair it.
      this.absorb(page.activity, compareBatch(this.stream.cursor, before) <= 0);
      this.nextCursor = page.nextCursor;
      this._hasMore = page.nextCursor !== null;
      this.stream.raise({ since: msToUs(page.solutionNow) });
      this.rebuild();
      return true;
    } catch (e) {
      if (this.orders.size === 0 && this.money.size === 0) this.handle?.fail(e as Error);
      return false;
    }
  }

  private absorb(entries: ActivityEntry[], overwriteOrders: boolean): void {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      if (entry.activityType === "order") {
        if (!overwriteOrders && this.orders.has(entry.order.id)) continue;
        this.orders.set(entry.order.id, entry.order);
        continue;
      }
      const group = `${entry.activityType}:${entry.timeMs}`;
      const index = counts.get(group) ?? 0;
      counts.set(group, index + 1);
      const key = `${group}:${index}`;
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

    const entries: ActivityEntry[] = [];
    const events = applyActivityFrame(this.keep(frame), { orders: this.orders, entries }, {
      account: this.account,
    });
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

  /** Drop what `query.types` excludes, before it can reach the state or a listener. */
  private keep(frame: WireActivityFrame): WireActivityFrame {
    const types = this.query.types;
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
    for (const order of this.orders.values()) {
      // Keyed by when the order became real, not by the signed deadline the seed
      // sorts on: the batch is the one time both sources report, so a REST row and a
      // streamed row sort against each other. An order with none has not been in a
      // batch yet, so it is newer than every order that has.
      arr[i++] = {
        activityType: "order",
        timeMs: order.includedMs ?? Number.MAX_SAFE_INTEGER,
        order,
      };
    }
    for (const entry of this.money.values()) arr[i++] = entry;
    arr.sort((a, b) => b.timeMs - a.timeMs || ORDINAL[b.activityType] - ORDINAL[a.activityType]);
    this.handle.set(arr);
  }
}
