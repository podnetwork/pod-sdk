// ActivityHistory: one account's history as the node serves it (ADR 0057) — the
// per-batch frames `pod_activity` streams, with `GET /clob/activity` serving the
// same frames for the batches before the stream. One shape from both sources,
// so a frame folds the same way however it arrived, and a batch folds once:
// every frame names its batch, the stream resumes from the last one folded, and
// REST is asked only for batches the stream did not cover.
//
// REST pages oldest first over an inclusive window, so older history is loaded
// by window: `loadOlder` walks back from the oldest loaded batch in windows that
// double until one holds a frame, or the query's `from` is reached. Order state
// is replayed in batch order whenever an older window lands — a fill folded
// after the cancel that followed it would leave the order wrong.

import type { ActivityEvent, ActivityQuery, Address, Order } from "../types/public.js";
import type { WireActivityFrame } from "../types/wire.js";
import { applyActivityFrame, isMoney } from "../codec/activity.js";
import { msToUs } from "../codec/units.js";
import { BaseResource, type ResourceHandle } from "../stores/resource.js";
import type { SubParams } from "../transport/ws.js";
import type { SeriesResource } from "./candles.js";
import type { SyncContext } from "./sources.js";
import { ResumableStream } from "./stream.js";

/**
 * No types is no filter, and an empty list says the same thing. One form, so
 * `keep()` and the client's memo key cannot read the same query two ways.
 */
export function normalizeActivityQuery(query: ActivityQuery = {}): ActivityQuery {
  return query.types?.length ? query : { ...query, types: undefined };
}

/** The first window `loadOlder` asks for; every next one is twice as long. */
const FIRST_SPAN_US = 3_600_000_000;

export class ActivityHistory implements SeriesResource<ActivityEvent> {
  private readonly base: BaseResource<ActivityEvent[]>;
  private handle: ResourceHandle<ActivityEvent[]> | undefined;
  /** Every frame folded, by batch — the one place a batch is deduplicated. */
  private readonly frames = new Map<number, WireActivityFrame>();
  private orders = new Map<string, Order>();
  /** The folded events, oldest first: the order the frames replay in. */
  private events: ActivityEvent[] = [];
  /** The oldest batch (micros) the loaded windows reach; `loadOlder` continues below it. */
  private oldestUs: number | undefined;
  private spanUs = FIRST_SPAN_US;
  private seedGen = 0;
  private _hasMore = true;
  private _loading = false;
  private readonly eventListeners = new Set<(events: ActivityEvent[]) => void>();
  private readonly stream: ResumableStream;

  private readonly query: ActivityQuery;
  private readonly floorUs: number;

  constructor(
    private readonly ctx: SyncContext,
    private readonly account: Address,
    query: ActivityQuery = {},
  ) {
    this.query = normalizeActivityQuery(query);
    this.floorUs = query.from !== undefined ? msToUs(query.from) : 0;
    this.stream = new ResumableStream({
      ws: ctx.ws,
      channel: "pod_activity",
      params: { account },
      reseed: () => this.seed(),
      onFrame: (r) => this.onFrame(r),
    });
    this.base = new BaseResource<ActivityEvent[]>((h) => {
      this.handle = h;
      this.stream.start();
      return () => {
        this.stream.stop();
        this.handle = undefined;
      };
    });
  }

  get(): ActivityEvent[] | undefined { return this.base.get(); }
  subscribe(listener: () => void): () => void { return this.base.subscribe(listener); }
  ready(): Promise<ActivityEvent[]> { return this.base.ready(); }
  get error(): Error | undefined { return this.base.error; }
  hasMore(): boolean { return this._hasMore; }
  loading(): boolean { return this._loading; }
  destroy(): void { this.base.destroy(); }

  /** An order the loaded history touched, as every loaded event left it. */
  order(id: string): Order | undefined { return this.orders.get(id); }

  /**
   * Observe what the stream reported, a tick at a time: the order transitions and
   * the money that moved. Nothing is emitted for history loaded over REST.
   */
  onEvent(listener: (events: ActivityEvent[]) => void): () => void {
    this.eventListeners.add(listener);
    // Listening starts the stream, like subscribing does — the resource is
    // ref-counted from `subscribe`/`ready` alone.
    const release = this.base.subscribe(() => {});
    return () => { this.eventListeners.delete(listener); release(); };
  }

  setWindow(): void { /* the window is the query's; older history comes by `loadOlder` */ }

  /** Load the next older window — widened until it holds a frame, or the query's `from` is reached. */
  async loadOlder(): Promise<void> {
    const oldest = this.oldestUs;
    if (!this.handle || this._loading || !this._hasMore || oldest === undefined) return;
    this._loading = true;
    this.rebuild();
    try {
      await this.extendBack(oldest);
      this.refold();
    } finally {
      this._loading = false;
      this.rebuild();
    }
  }

  // --- internals ---

  /**
   * Walk back from `oldest` (exclusive) in doubling windows until one holds a
   * frame or the floor is reached, and record how far the history now reaches.
   */
  private async extendBack(oldest: number): Promise<void> {
    while (oldest > this.floorUs) {
      const from = Math.max(this.floorUs, oldest - this.spanUs);
      const found = await this.fetchWindow(from, oldest - 1);
      oldest = from;
      this.spanUs *= 2;
      if (found) break;
    }
    this.oldestUs = oldest;
    this._hasMore = oldest > this.floorUs;
  }

  /** Every frame of `[fromUs, toUs]` into `frames`; whether any new one was kept. */
  private async fetchWindow(fromUs: number, toUs: number): Promise<boolean> {
    let found = false;
    let from: number | null = fromUs;
    while (from !== null && from <= toUs) {
      const page = await this.ctx.rest.activity(this.account, { fromUs: from, toUs, limit: this.query.limit });
      for (const frame of page.frames) {
        const kept = this.keep(frame);
        if (kept && !this.frames.has(kept.batch)) {
          this.frames.set(kept.batch, kept);
          found = true;
        }
      }
      from = page.nextCursorUs;
    }
    return found;
  }

  /**
   * The first paint loads the newest window; a reconnect loads the batches the
   * stream missed. Either way the cursor is raised to the indexer's watermark,
   * so the subscription resumes right after what REST served.
   */
  private async seed(): Promise<boolean> {
    const gen = ++this.seedGen;
    try {
      const nowUs = msToUs((await this.ctx.rest.status()).solutionNow);
      const end = this.query.to !== undefined ? Math.min(nowUs, msToUs(this.query.to)) : nowUs;
      if (this.oldestUs === undefined) {
        await this.extendBack(end + 1);
      } else if (this.stream.cursor.since !== undefined && this.stream.cursor.since < end) {
        await this.fetchWindow(this.stream.cursor.since + 1, end);
      }
      // A seed overtaken by a fresher one has nothing left to decide: its frames
      // are in the map either way, and the fresher seed sets the watermark.
      if (!this.stream.running || gen !== this.seedGen) return false;
      this.refold();
      this.stream.raise({ since: nowUs });
      this.rebuild();
      return true;
    } catch (e) {
      // Only before the first paint: an account whose history is genuinely empty has
      // a resource, and reporting a later transient failure on it would blank the view.
      if (this.handle && this.handle.current() === undefined) this.handle.fail(e as Error);
      throw e;
    }
  }

  /** One live frame: everything that happened to the account in one batch. */
  private onFrame(result: unknown): void {
    const frame = result as WireActivityFrame;
    if (!frame || !Array.isArray(frame.orders) || !Array.isArray(frame.events)) return;
    // Applying a frame is not idempotent — a fill appends to `order.fills` — and
    // re-delivery is designed in: a resumed subscription replays from the cursor.
    const at: SubParams = { since: frame.batch };
    if (this.stream.delivered(at) || this.frames.has(frame.batch)) return;
    this.stream.advance(at);
    const kept = this.keep(frame);
    if (!kept) return;
    this.frames.set(kept.batch, kept);
    // Live frames arrive in batch order, after everything loaded, so they fold
    // on top of the state as they come; only an older window needs a replay.
    const events = this.fold(kept);
    this.events.push(...events);
    this.rebuild();
    // Strictly after `rebuild()`: a listener that reads the resource in response to an
    // event must see the state that event produced.
    for (const listener of this.eventListeners) {
      try { listener(events); } catch { /* a listener's failure is not the stream's */ }
    }
  }

  private fold(frame: WireActivityFrame): ActivityEvent[] {
    return applyActivityFrame(frame, this.orders, { account: this.account });
  }

  private refold(): void {
    this.orders = new Map();
    this.events = [];
    for (const batch of [...this.frames.keys()].sort((a, b) => a - b)) {
      this.events.push(...this.fold(this.frames.get(batch)!));
    }
  }

  /** Narrow a frame to what the query asked for, or drop it. Neither source filters for us. */
  private keep(frame: WireActivityFrame): WireActivityFrame | undefined {
    const { types, to } = this.query;
    if (frame.batch < this.floorUs) return undefined;
    if (to !== undefined && frame.batch > msToUs(to)) return undefined;
    if (!types) return frame;
    const want = new Set<string>(types);
    const events = frame.events.filter((e) => want.has(isMoney(e.k) ? e.k : "order"));
    if (!events.length) return undefined;
    // The order events index `orders`, so the two are kept or dropped together.
    return { ...frame, orders: want.has("order") ? frame.orders : [], events };
  }

  private rebuild(): void {
    if (!this.handle) return;
    this.handle.set([...this.events].reverse());
  }
}
