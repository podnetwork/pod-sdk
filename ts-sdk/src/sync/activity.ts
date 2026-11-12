// `pod_activity` sends one batch per tick, so the batch alone is the resume cursor (ADR 0057).

import type {
  ActivityEntry, ActivityEvent, ActivityQuery, ActivityType, Address, OrderEventKind,
} from "../types/public.js";
import type { WireActivityEntry } from "../types/wire.js";
import { decodeActivityEntry, foldActivityBatch } from "../codec/activity.js";
import { decodeOrder } from "../codec/decode.js";
import { msToUs, usToMs } from "../codec/units.js";
import { BaseResource, type ResourceHandle } from "../stores/resource.js";
import type { ActivityPage } from "../transport/rest.js";
import type { SubParams } from "../transport/ws.js";
import type { SeriesResource } from "./candles.js";
import { OrderLedger, readActivityAfter } from "./order-ledger.js";
import { readAtLeast, type SyncContext } from "./sources.js";
import { ResumableStream } from "./stream.js";

export interface ActivityView extends SeriesResource<ActivityEntry> {
  onEvent(listener: (events: ActivityEvent[]) => void): () => void;
}

/** One account's whole feed: the one subscription, batch map and paging state its views share. */
export class ActivityHistory implements ActivityView {
  private readonly base: BaseResource<ActivityEntry[]>;
  private handle: ResourceHandle<ActivityEntry[]> | undefined;
  /** Every batch's rows, from either source; what dedupes one against the other. */
  private readonly batches = new Map<number, ActivityEntry[]>();
  private readonly ledger = new OrderLedger<[number, WireActivityEntry[]], { rows: ActivityEntry[]; events: ActivityEvent[] }>(
    ([batchUs, entries], orders) => foldActivityBatch(batchUs, entries, orders),
  );
  private reconciling = false;
  private rows: ActivityEntry[] = [];
  private nextUs: number | null = null;
  private seedGen = 0;
  private _hasMore = true;
  private _loading = false;
  private readonly eventListeners = new Set<(events: ActivityEvent[]) => void>();
  private readonly stream: ResumableStream;
  private readonly views = new Map<string, FilteredActivity>();

  constructor(
    private readonly ctx: SyncContext,
    private readonly account: Address,
  ) {
    this.stream = new ResumableStream({
      ws: ctx.ws,
      channel: "pod_activity",
      params: { account },
      reseed: () => this.seed(),
      onFrame: (r) => this.onFrame(r),
    });
    this.base = new BaseResource<ActivityEntry[]>((h) => {
      this.handle = h;
      this.stream.start();
      const timer = ctx.historyResyncMs > 0 ? setInterval(() => void this.reconcile(), ctx.historyResyncMs) : undefined;
      return () => {
        clearInterval(timer);
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

  /** The rows of `types` whose `timeMs` is within inclusive `from`/`to`. */
  view(query: ActivityQuery): ActivityView {
    // An empty `types` is no filter; sorted, since key order is an argument's accident.
    const q = query.types?.length ? query : { ...query, types: undefined };
    const key = JSON.stringify(q, Object.keys(q).sort());
    let view = this.views.get(key);
    if (!view) this.views.set(key, view = new FilteredActivity(this, q));
    return view;
  }

  /**
   * Observe what the stream reported, a tick at a time: the order transitions and
   * the money that moved. Nothing is emitted for REST pages.
   */
  onEvent(listener: (events: ActivityEvent[]) => void): () => void {
    this.eventListeners.add(listener);
    // Listening starts the stream, like subscribing does.
    const release = this.base.subscribe(() => {});
    return () => { this.eventListeners.delete(listener); release(); };
  }

  setWindow(): void { /* activity pages by batch, not by time window */ }

  async loadOlder(): Promise<void> {
    if (!this.handle || this.nextUs === null || this._loading) return;
    this._loading = true;
    this.rebuild();
    try {
      const toUs = this.nextUs;
      const page = await readAtLeast(
        (min) => this.ctx.rest.activity(this.account, { toUs }, min),
        this.minimum(),
      );
      if (!this.store([page])) return;
      this.nextUs = page.nextUs;
      this._hasMore = page.nextUs !== null;
      this.restack();
    } finally {
      this._loading = false;
      this.rebuild();
    }
  }

  private async seed(): Promise<boolean> {
    const gen = ++this.seedGen;
    const since = this.stream.cursor.since;
    const stale = () => !this.stream.running || gen !== this.seedGen;
    try {
      if (since === undefined) {
        const page = await this.ctx.rest.activity(this.account);
        if (stale()) return false;
        if (!this.store([page])) throw new Error("activity read below the held frames");
        this.ledger.stampUs ||= page.solutionNowUs;
        this.nextUs = page.nextUs;
        this._hasMore = page.nextUs !== null;
        this.restack();
        this.stream.raise({ since: msToUs(page.solutionNow) });
        return true;
      }
      // A reconnect: fill the gap above the cursor, and keep the consumer's paging position.
      const fromUs = since + 1;
      let toUs: number | undefined;
      const pages: ActivityPage[] = [];
      do {
        const page = await readAtLeast(
          (min) => this.ctx.rest.activity(this.account, { fromUs, toUs }, min),
          Math.max(since, this.ledger.minimum()),
        );
        if (stale()) return false;
        pages.push(page);
        toUs = page.nextUs ?? undefined;
      } while (toUs !== undefined);
      if (!this.store(pages)) throw new Error("activity read below the held frames");
      this.restack();
      for (const page of pages) this.stream.raise({ since: msToUs(page.solutionNow) });
      return true;
    } catch (e) {
      // Only before the first paint: an account whose history is genuinely empty has
      // a resource, and reporting a later transient failure on it would blank the view.
      if (this.handle && this.handle.current() === undefined) this.handle.fail(e as Error);
      throw e;
    }
  }

  /**
   * A page's `order` rows are each order's state at the page's read; its batches are
   * folded like frames, so the ledger skips the orders those rows already cover.
   */
  private store(pages: ActivityPage[]): boolean {
    const kept = pages.filter((p) => this.ledger.rows(
      p.batches.flatMap(([, entries]) => entries.flatMap((e) => (e.k === "order" ? [decodeOrder(e)] : []))),
      p.solutionNowUs,
    ));
    const fresh = kept.flatMap((p) => p.batches).filter(([batchUs]) => !this.batches.has(batchUs));
    for (const [batchUs, entries] of fresh.sort((a, b) => a[0] - b[0])) {
      this.batches.set(batchUs, this.shown(this.ledger.live(batchUs, [batchUs, entries]).rows));
    }
    return kept.length === pages.length;
  }

  /** Point `order` rows at the ledger's order, which later transitions and reconciles update in place. */
  private shown(rows: ActivityEntry[]): ActivityEntry[] {
    for (const row of rows) {
      if (row.activityType === "order") row.order = this.ledger.view.get(row.order.id) ?? row.order;
    }
    return rows;
  }

  private minimum(): number | undefined {
    return Math.max(this.stream.cursor.since ?? 0, this.ledger.minimum()) || undefined;
  }

  /** Activity since the last reconcile: adds the batches the stream lost and corrects the orders. */
  private async reconcile(): Promise<void> {
    if (this.reconciling || !this.ledger.stampUs || !this.stream.running) return;
    this.reconciling = true;
    try {
      const pages = await readActivityAfter(this.ctx.rest, this.account, this.ledger.stampUs, this.ledger.minimum());
      if (!this.stream.running || !this.ledger.reconcile(pages)) return;
      const fresh = pages.flatMap((p) => p.batches).filter(([batchUs]) => !this.batches.has(batchUs));
      for (const [batchUs, entries] of fresh) {
        const rows = entries.flatMap((e) => decodeActivityEntry(e, usToMs(batchUs)) ?? []);
        this.batches.set(batchUs, this.shown(rows));
      }
      this.restack();
    } catch {
      // The next interval asks again.
    } finally {
      this.reconciling = false;
    }
  }

  private onFrame(result: unknown): void {
    if (!result || typeof result !== "object") return;
    const keys = Object.keys(result);
    if (keys.length !== 1) return;
    const key = keys[0]!;
    const entries = (result as Record<string, unknown>)[key];
    const batchUs = Number(key);
    if (!Array.isArray(entries) || !Number.isSafeInteger(batchUs)) return;
    // Folding is not idempotent (events would be reported twice) and a resume replays from the cursor.
    const at: SubParams = { since: batchUs };
    if (this.stream.delivered(at)) return;
    this.stream.advance(at);
    if (!entries.length) return;
    const frame: [number, WireActivityEntry[]] = [batchUs, entries as WireActivityEntry[]];
    let events: ActivityEvent[];
    if (this.batches.has(batchUs)) {
      // A REST read already applied this batch; the app still hears about it.
      events = this.ledger.report(frame).events;
    } else {
      const folded = this.ledger.live(batchUs, frame);
      events = folded.events;
      this.batches.set(batchUs, this.shown(folded.rows));
      this.rows = [...folded.rows, ...this.rows];
      // Listeners run after rebuild() so one that reads the resource sees what the event produced.
      this.rebuild();
    }
    if (events.length) {
      for (const listener of this.eventListeners) {
        try { listener(events); } catch { /* a listener's failure is not the stream's */ }
      }
    }
  }

  /** Rows newest batch first, wire order within a batch. */
  private restack(): void {
    this.rows = [...this.batches.keys()].sort((a, b) => b - a).flatMap((b) => this.batches.get(b)!);
    this.rebuild();
  }

  private rebuild(): void {
    this.handle?.set(this.rows.slice());
  }
}

const EVENT_TYPE: Record<OrderEventKind, ActivityType> = {
  new: "order", reject: "order", modify_reject: "modify_reject", cancel_reject: "cancel_reject",
  fill: "fill", modify: "modify", cancel: "termination", expire: "termination",
};

class FilteredActivity implements ActivityView {
  private readonly want: Set<ActivityType> | undefined;
  private held: ActivityEntry[] | undefined;
  private shown: ActivityEntry[] | undefined;

  constructor(private readonly parent: ActivityHistory, private readonly query: ActivityQuery) {
    this.want = query.types && new Set(query.types);
  }

  get(): ActivityEntry[] | undefined {
    const rows = this.parent.get();
    if (rows !== this.held) {
      this.held = rows;
      this.shown = rows?.filter((r) => this.keeps(r));
    }
    return this.shown;
  }

  subscribe(listener: () => void): () => void { return this.parent.subscribe(listener); }
  async ready(): Promise<ActivityEntry[]> { return (await this.parent.ready()).filter((r) => this.keeps(r)); }
  get error(): Error | undefined { return this.parent.error; }
  loading(): boolean { return this.parent.loading(); }
  setWindow(): void { /* a view's window is its query */ }

  hasMore(): boolean {
    const oldest = this.parent.get()?.at(-1)?.timeMs;
    const floor = this.query.from;
    return this.parent.hasMore() && (floor === undefined || oldest === undefined || oldest > floor);
  }

  async loadOlder(): Promise<void> {
    if (this.hasMore()) await this.parent.loadOlder();
  }

  onEvent(listener: (events: ActivityEvent[]) => void): () => void {
    const want = this.want;
    if (!want) return this.parent.onEvent(listener);
    return this.parent.onEvent((events) => {
      const kept = events.filter((e) => want.has("activityType" in e ? e.activityType : EVENT_TYPE[e.kind]));
      if (kept.length) listener(kept);
    });
  }

  private keeps(r: ActivityEntry): boolean {
    const { from, to } = this.query;
    if (from !== undefined && r.timeMs < from) return false;
    if (to !== undefined && r.timeMs > to) return false;
    return !this.want || this.want.has(r.activityType);
  }
}
