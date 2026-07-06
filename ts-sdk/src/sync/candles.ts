// CandleSeries: a SeriesResource<Bar> that loads history as epoch-anchored
// canonical pages (so settled pages are byte-identical across clients and the
// server flags them immutable) and builds the forming bar in memory by folding
// the pod_candles tick stream. No polling of the hot edge.
//
// Every REST request this class makes is a fully-elapsed window, so every
// response is `immutable` and browser/CDN-cacheable: full canonical pages
// forever, and the trailing page clamped to the last closed bucket (its URL
// rotates once per bucket close). The forming bucket never comes from REST —
// the tick subscription replays it from the bucket boundary; for buckets
// longer than the server's tick-replay ring, the forming bar is first seeded
// from settled 1h bars (also cacheable) and ticks fold on top.

import type { Bar, MarketId, Resolution, TimeRange } from "../types/public.js";
import type { WireCandleTick } from "../types/wire.js";
import { dec, usToMs, WAD } from "../codec/units.js";
import { RESOLUTION_PAGE_BUCKETS, RESOLUTION_SECONDS } from "../codec/resolution.js";
import { BaseResource, type ResourceHandle } from "../stores/resource.js";
import type { Subscription } from "../transport/ws.js";
import type { SyncContext } from "./sources.js";

export interface SeriesResource<Item> {
  get(): Item[] | undefined;
  subscribe(listener: () => void): () => void;
  ready(): Promise<Item[]>;
  readonly error?: Error;
  setWindow(range: TimeRange): void;
  loadOlder(): Promise<void>;
  hasMore(): boolean;
  loading(): boolean;
}

const bmax = (a: bigint, b: bigint) => (a > b ? a : b);
const bmin = (a: bigint, b: bigint) => (a < b ? a : b);

// pod_candles `since` replays from a bounded server-side tick ring (~16k
// batches ≈ 2.3h at a 500ms cadence). An hour of ticks fits comfortably, so
// resolutions up to 1h replay their whole forming bucket; coarser buckets
// can't, and seed their forming bar from settled 1h bars instead.
const REPLAY_SAFE_SECS = 3_600;
const SEED_RESOLUTION: Resolution = "1h";

export class CandleSeries implements SeriesResource<Bar> {
  private readonly base: BaseResource<Bar[]>;
  private handle: ResourceHandle<Bar[]> | undefined;

  private readonly pages = new Map<number, Bar[]>(); // pageIndex -> closed bars
  private readonly live = new Map<number, Bar>(); // bucketStartMs -> forming bar
  private readonly resSecs: number;
  private readonly pageBuckets: number;
  private readonly pageSpanSecs: number;

  private window: TimeRange;
  private minPage: number | undefined;
  private maxPage: number | undefined;
  private _loading = false;
  private _hasMore = true;
  private lastTickUs = 0;
  private tickSub: Subscription | undefined;
  private alive = false;
  private subRetries = 0;
  private retryTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly ctx: SyncContext,
    private readonly id: MarketId,
    private readonly resolution: Resolution,
    range?: TimeRange,
  ) {
    this.resSecs = RESOLUTION_SECONDS[resolution];
    this.pageBuckets = RESOLUTION_PAGE_BUCKETS[resolution];
    this.pageSpanSecs = this.resSecs * this.pageBuckets;
    const span = this.pageSpanSecs * 1000;
    this.window = range ?? { from: Date.now() - span };

    this.base = new BaseResource<Bar[]>((h) => {
      this.handle = h;
      this.alive = true;
      // Load the initial window, then subscribe from the forming bucket's
      // boundary — the server replays the ticks inside it then streams live
      // (no gap), so the forming bar is complete from its first trade. Never
      // anchor `since` on a REST response watermark: settled responses are
      // immutable and may come from the HTTP cache with a stale solutionNow.
      // `since` advances as ticks arrive (so reconnects replay minimally) and
      // falls back to a REST re-seed via onError when it is too old.
      void this.loadWindow(this.window).then(async () => {
        if (!this.alive) return;
        const sinceUs = await this.prepareLiveEdge();
        if (!this.alive) return;
        this.lastTickUs = sinceUs;
        this.tickSub = this.ctx.ws.subscribe(
          "pod_candles",
          { clobIds: [this.id], since: sinceUs },
          (r) => this.onTick(r),
          () => this.onSubError(),
        );
      });
      // On reconnect, refresh closed bars (the WS auto-resubscribes pod_candles
      // itself with the advanced `since`).
      const offOpen = this.ctx.ws.on("open", () => { if (this.alive) void this.loadWindow(this.window); });
      return () => {
        this.alive = false;
        offOpen();
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.tickSub?.unsubscribe();
        this.tickSub = undefined;
        this.handle = undefined;
      };
    });
  }

  get(): Bar[] | undefined { return this.base.get(); }
  subscribe(listener: () => void): () => void { return this.base.subscribe(listener); }
  ready(): Promise<Bar[]> { return this.base.ready(); }
  get error(): Error | undefined { return this.base.error; }
  hasMore(): boolean { return this._hasMore; }
  loading(): boolean { return this._loading; }
  destroy(): void { this.base.destroy(); }

  setWindow(range: TimeRange): void {
    this.window = range;
    if (this.handle) void this.loadWindow(range);
  }

  async loadOlder(): Promise<void> {
    if (!this.handle || this.minPage === undefined) return;
    const target = this.minPage - 1;
    if (target < 0) { this._hasMore = false; return; }
    await this.fetchPages([target]);
  }

  // --- internals ---

  private pageOf(secs: number): number {
    return Math.floor(secs / this.pageSpanSecs);
  }

  private async loadWindow(range: TimeRange): Promise<void> {
    const fromSecs = Math.floor(range.from / 1000);
    const toSecs = Math.floor((range.to ?? Date.now()) / 1000);
    const startPage = this.pageOf(fromSecs);
    const endPage = this.pageOf(Math.max(fromSecs, toSecs - 1));
    const nowSecs = Math.floor(Date.now() / 1000);
    const trailingPage = this.pageOf(nowSecs);

    const wanted: number[] = [];
    for (let p = startPage; p <= endPage; p++) {
      if (p === trailingPage || !this.pages.has(p)) wanted.push(p);
    }
    await this.fetchPages(wanted);
  }

  private async fetchPages(pageIndices: number[]): Promise<void> {
    if (!pageIndices.length) { this.rebuild(); return; }
    this._loading = true;
    this.rebuild(); // surface loading state
    try {
      // The trailing page's window is clamped to the last closed bucket: the
      // server returns only closed bars either way, so the content is
      // identical — but a fully-elapsed window is served `immutable`
      // (browser/CDN-cacheable; its URL rotates once per bucket close), while
      // a `to` in the future would be `no-store` on every open. The forming
      // bucket comes from the tick subscription (see prepareLiveEdge).
      const lastClosedMs = Math.floor(Date.now() / 1000 / this.resSecs) * this.resSecs * 1000;
      await Promise.all(pageIndices.map(async (p) => {
        const fromMs = p * this.pageSpanSecs * 1000;
        const toMs = Math.min((p + 1) * this.pageSpanSecs * 1000, lastClosedMs);
        if (toMs <= fromMs) {
          // Page holds nothing but the forming bucket (it just started) —
          // nothing closed to fetch yet; keep bookkeeping consistent.
          this.pages.set(p, this.pages.get(p) ?? []);
          this.minPage = this.minPage === undefined ? p : Math.min(this.minPage, p);
          this.maxPage = this.maxPage === undefined ? p : Math.max(this.maxPage, p);
          return;
        }
        try {
          const page = await this.ctx.rest.candles(this.id, {
            resolution: this.resolution,
            from: fromMs,
            to: toMs,
            limit: this.pageBuckets,
          });
          this.pages.set(p, page.bars);
          this.minPage = this.minPage === undefined ? p : Math.min(this.minPage, p);
          this.maxPage = this.maxPage === undefined ? p : Math.max(this.maxPage, p);
          if (page.bars.length === 0 && this.minPage === p) this._hasMore = false;
        } catch {
          this.pages.set(p, this.pages.get(p) ?? []);
        }
      }));
    } finally {
      this._loading = false;
      this.rebuild();
    }
  }

  /**
   * Decide the tick subscription's `since` watermark (µs), and — for buckets
   * longer than the replay ring — seed the forming bar from settled finer
   * bars first: REST never returns the forming bucket and the ring can't
   * replay a whole 4h/1d/1W/1M of ticks, so without the seed those bars would
   * only reflect trades since page load. Seed requests are fully-elapsed
   * windows, so they're `immutable` and cacheable like everything else.
   * Returns `bucketBoundaryUs - 1` (`since` replays strictly-greater
   * deadlines, and a batch can land exactly on the boundary).
   */
  private async prepareLiveEdge(): Promise<number> {
    const nowSecs = Math.floor(Date.now() / 1000);
    const bucketStart = Math.floor(nowSecs / this.resSecs) * this.resSecs;
    if (this.resSecs <= REPLAY_SAFE_SECS) return bucketStart * 1_000_000 - 1;

    const seedSecs = RESOLUTION_SECONDS[SEED_RESOLUTION];
    const seedEnd = Math.floor(nowSecs / seedSecs) * seedSecs;
    try {
      // Chunked by the server's row cap; ≥2 chunks only for 1M (≤744 hours).
      const bars: Bar[] = [];
      for (let from = bucketStart; from < seedEnd; ) {
        const to = Math.min(seedEnd, from + 500 * seedSecs);
        const page = await this.ctx.rest.candles(this.id, {
          resolution: SEED_RESOLUTION, from: from * 1000, to: to * 1000, limit: 500,
        });
        bars.push(...page.bars);
        from = to;
      }
      if (bars.length && this.alive) {
        bars.sort((a, b) => a.time - b.time);
        const first = bars[0]!;
        const last = bars[bars.length - 1]!;
        this.live.set(bucketStart * 1000, {
          time: bucketStart * 1000,
          open: first.open,
          high: bars.reduce((m, b) => bmax(m, b.high), first.high),
          low: bars.reduce((m, b) => bmin(m, b.low), first.low),
          close: last.close,
          volume: bars.reduce((s, b) => s + b.volume, 0n),
          quoteVolume: bars.reduce((s, b) => s + b.quoteVolume, 0n),
        });
        this.rebuild();
      }
    } catch { /* seed is best-effort — ticks still build the bar from here on */ }
    return seedEnd * 1_000_000 - 1;
  }

  private onTick(result: unknown): void {
    this.subRetries = 0; // live ticks flowing → subscription is healthy
    const ticks = Array.isArray(result) ? result : [result];
    const bucketMs = this.resSecs * 1000;
    let maxUs = this.lastTickUs;
    for (const t of ticks) {
      const w = t as WireCandleTick;
      maxUs = Math.max(maxUs, w.timestamp_us);
      const tMs = usToMs(w.timestamp_us);
      const start = Math.floor(tMs / bucketMs) * bucketMs;
      const price = dec(w.price);
      // Ticks arrive for every orderbook in the batch; price 0 means the
      // market has never cleared (the indexer skips these rows too) — folding
      // it would draw a $0 forming bar on never-traded markets.
      if (price === 0n) continue;
      const vol = dec(w.volume);
      const quote = (vol * price) / WAD;
      const cur = this.live.get(start);
      if (cur) {
        cur.high = bmax(cur.high, price);
        cur.low = bmin(cur.low, price);
        cur.close = price;
        cur.volume += vol;
        cur.quoteVolume += quote;
      } else {
        this.live.set(start, {
          time: start, open: price, high: price, low: price, close: price,
          volume: vol, quoteVolume: quote,
        });
      }
    }
    // Advance the subscription watermark so a reconnect resumes from here
    // instead of replaying from the original `since`.
    if (maxUs > this.lastTickUs) {
      this.lastTickUs = maxUs;
      this.tickSub?.update({ since: maxUs });
    }
    // Keep the live map small: only retain the most recent few buckets.
    if (this.live.size > 8) {
      const cutoff = [...this.live.keys()].sort((a, b) => b - a)[7]!;
      for (const k of this.live.keys()) if (k < cutoff) this.live.delete(k);
    }
    this.rebuild();
  }

  /**
   * Subscription rejected — re-seed from REST, then resubscribe. Backed off (and
   * capped) so a server that keeps rejecting can't spin this into a tight loop;
   * after a couple of failures we drop `since` (the likely culprit). Reset once
   * live ticks flow (`onTick`).
   */
  private onSubError(): void {
    if (!this.alive) return;
    this.subRetries++;
    const delay = Math.min(30_000, 500 * 2 ** (this.subRetries - 1));
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      void this.loadWindow(this.window).then(async () => {
        if (!this.alive) return;
        // Re-anchor at the current bucket boundary (re-seeding the forming
        // bar for coarse resolutions). If the server keeps rejecting, drop
        // `since` and go live-only — the fresh seed keeps the forming bar
        // right up to now, and ticks take it from there.
        const anchorUs = await this.prepareLiveEdge();
        if (!this.alive) return;
        const sinceUs = this.subRetries > 2 ? undefined : anchorUs;
        this.lastTickUs = sinceUs ?? 0;
        this.tickSub?.update({ since: sinceUs });
        this.tickSub?.resubscribe();
      });
    }, delay);
  }

  private rebuild(): void {
    if (!this.handle) return;
    const merged = new Map<number, Bar>();
    for (const bars of this.pages.values()) for (const b of bars) merged.set(b.time, b);
    // Live wins only where REST has no (yet) closed bar — i.e. the forming bucket.
    for (const [time, bar] of this.live) if (!merged.has(time)) merged.set(time, bar);
    const out = [...merged.values()].sort((a, b) => a.time - b.time);
    this.handle.set(out);
  }
}
