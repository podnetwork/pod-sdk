// CandleSeries: a SeriesResource<Bar> that loads history as epoch-anchored
// canonical pages (so settled pages are byte-identical across clients and the
// server flags them immutable) and builds the forming bar in memory by folding
// the pod_candles tick stream. No polling of the hot edge.

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
  private watermarkUs = 0; // newest indexer solution time seen (micros), for `since`
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
      // Load the initial window first so we capture the indexer watermark, then
      // subscribe with `since` — the server replays ticks after it then streams
      // live (no gap), and the fold dedups by bucket. `since` is advanced as
      // ticks arrive (so reconnects replay minimally) and falls back to a REST
      // re-seed via onError when it is too old (down too long).
      void this.loadWindow(this.window).then(() => {
        if (!this.alive) return;
        this.tickSub = this.ctx.ws.subscribe(
          "pod_candles",
          { clobIds: [this.id], since: this.watermarkUs || undefined },
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
      await Promise.all(pageIndices.map(async (p) => {
        const fromMs = p * this.pageSpanSecs * 1000;
        const toMs = (p + 1) * this.pageSpanSecs * 1000;
        try {
          const page = await this.ctx.rest.candles(this.id, {
            resolution: this.resolution,
            from: fromMs,
            to: toMs,
            limit: this.pageBuckets,
          });
          this.pages.set(p, page.bars);
          this.watermarkUs = Math.max(this.watermarkUs, page.solutionNow * 1000);
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
      void this.loadWindow(this.window).then(() => {
        if (!this.alive) return;
        this.lastTickUs = this.watermarkUs;
        this.tickSub?.update({ since: this.subRetries > 2 ? undefined : (this.watermarkUs || undefined) });
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
