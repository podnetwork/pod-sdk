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
import { PodHttpError, type PodRestClient } from "../transport/rest.js";
import type { SyncContext } from "./sources.js";

export interface SeriesResource<Item> {
  get(): Item[] | undefined;
  subscribe(listener: () => void): () => void;
  /** First committed value, not "window loaded" — see `Resource.ready`. */
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

/** One canonical page window: an epoch-anchored span of `RESOLUTION_PAGE_BUCKETS`
 * buckets, identified by its page index. */
export interface CandlePageWindow { page: number; fromMs: number; toMs: number }

const pageSpanMs = (resolution: Resolution) =>
  RESOLUTION_PAGE_BUCKETS[resolution] * RESOLUTION_SECONDS[resolution] * 1000;

/**
 * Page index of `ms` on a resolution's epoch-anchored grid — the single
 * definition of that grid. Every candle read goes through it on purpose: the
 * server's `immutable` responses and the REST client's URL-keyed in-flight
 * dedupe both only pay off while every request lands on the same boundaries, so
 * a second implementation of this arithmetic would silently turn cache hits
 * into node traffic.
 */
export function candlePageAt(resolution: Resolution, ms: number): number {
  return Math.floor(Math.max(0, ms) / pageSpanMs(resolution));
}

/**
 * One page's canonical window — `undefined` when the page holds nothing but the
 * forming bucket, because there is nothing closed to fetch. The window is
 * clamped to the last closed bucket so it stays fully elapsed: those are the
 * responses the server marks `immutable`, while a `to` in the future is
 * `no-store` on every open.
 */
export function candlePageWindow(
  resolution: Resolution,
  page: number,
  nowMs = Date.now(),
): CandlePageWindow | undefined {
  const stepMs = RESOLUTION_SECONDS[resolution] * 1000;
  const fromMs = page * pageSpanMs(resolution);
  const toMs = Math.min(fromMs + pageSpanMs(resolution), Math.floor(nowMs / stepMs) * stepMs);
  return toMs > fromMs ? { page, fromMs, toMs } : undefined;
}

/** The canonical windows covering `[fromMs, toMs)`, oldest first. */
export function candlePageWindows(
  resolution: Resolution,
  fromMs: number,
  toMs: number,
  nowMs = Date.now(),
): CandlePageWindow[] {
  const windows: CandlePageWindow[] = [];
  const last = candlePageAt(resolution, toMs - 1);
  for (let page = candlePageAt(resolution, fromMs); page <= last; page++) {
    const window = candlePageWindow(resolution, page, nowMs);
    if (window) windows.push(window);
  }
  return windows;
}

/**
 * Decoded pages, per REST client — so per host, never shared between clients
 * pointed at different environments. A page is only stored once it can never
 * change again, which takes BOTH of: a full span (not the trailing page, which
 * still grows as buckets close) and an indexer watermark past the window's end.
 * Wall clock is not enough — the server gates its own `immutable` header on
 * solution time, and a window that has elapsed by the clock while the indexer
 * lags comes back SHORT of its newest buckets. Caching that would pin a hole
 * for the process's lifetime, which is the failure this whole read exists to
 * avoid.
 *
 * Without this, overlapping requests re-decode the same bars, and overlap is
 * the norm: a chart's opening window reaches further back than it has been
 * served, and every pan-left ends mid-page. Decoding costs six `BigInt` parses
 * per bar (see `decodeCandle`) on the thread that draws the chart.
 */
const pageCaches = new WeakMap<PodRestClient, Map<string, Bar[]>>();
const PAGE_CACHE_MAX = 256;

/** One canonical page, served from this client's page cache when it is final. */
async function fetchCandlePage(
  rest: PodRestClient,
  id: MarketId,
  resolution: Resolution,
  window: CandlePageWindow,
): Promise<Bar[]> {
  const wholePage = window.toMs - window.fromMs === pageSpanMs(resolution);
  const key = `${id}:${resolution}:${window.page}`;
  let cache = pageCaches.get(rest);
  if (!cache) pageCaches.set(rest, (cache = new Map()));
  // Cached entries were verified final when stored, so a hit needs no re-check.
  const hit = wholePage ? cache.get(key) : undefined;
  if (hit) return hit;
  for (let attempt = 1; ; attempt++) {
    try {
      const page = await rest.candles(id, {
        resolution,
        from: window.fromMs,
        to: window.toMs,
        limit: RESOLUTION_PAGE_BUCKETS[resolution],
      });
      if (wholePage && page.solutionNow >= window.toMs) {
        // Oldest insertion out first; the bound is on memory, not a policy.
        if (cache.size >= PAGE_CACHE_MAX) cache.delete(cache.keys().next().value!);
        cache.set(key, page.bars);
      }
      return page.bars;
    } catch (err) {
      if (attempt >= PAGE_ATTEMPTS || !worthRetrying(err)) throw err;
      // Exponential with jitter: the node sheds load in bursts, and a read that
      // retries on a fixed short delay just lands inside the same burst.
      const backoff = PAGE_RETRY_MS * 2 ** (attempt - 1) * (1 + Math.random());
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
}

/** How many pages a history read has in flight at once. */
const HISTORY_CONCURRENCY = 8;

/**
 * Attempts per page, and the backoff between them. One failure must not decide
 * a whole read: `fetchCandleHistory` rejects the window on a failed page, and a
 * chart shows that as a hard error it will not retry on its own. Cold windows
 * on a busy node do fail once and then answer in half a second, which is
 * exactly what a retry is for. A 4xx (other than 429) is the server saying the
 * request itself is wrong — asking again cannot help.
 */
const PAGE_ATTEMPTS = 3;
const PAGE_RETRY_MS = 400;

const worthRetrying = (err: unknown) =>
  !(err instanceof PodHttpError) || err.status === 429 || err.status >= 500;

/**
 * Closed bars covering `[range.from, range.to)` — the one-shot read behind a
 * chart's history request, with no resource, no subscription and no shared
 * mutable state.
 *
 * A page that fails after its retries decides how much of the window is
 * deliverable, and WHERE it failed is what matters:
 *
 * - at the old end, the answer is simply shorter — history stops at the gap,
 *   and the caller asks again for the older range when it needs it (a chart
 *   does exactly that on the next pan). Nothing is misrepresented.
 * - anywhere inside, the read REJECTS. A chart treats the answer as the truth
 *   for the range it asked about and does not re-ask, so bars either side of a
 *   swallowed gap would draw a hole nobody can detect — the failure this whole
 *   read exists to prevent. Callers get an error they can retry.
 *
 * (The live series takes the opposite side of that trade — see `fetchPages`.)
 */
export async function fetchCandleHistory(
  rest: PodRestClient,
  id: MarketId,
  resolution: Resolution,
  range: TimeRange,
  nowMs = Date.now(),
): Promise<Bar[]> {
  const toMs = range.to ?? nowMs;
  const windows = candlePageWindows(resolution, range.from, toMs, nowMs);
  const pages: Bar[][] = new Array(windows.length);
  const failures: unknown[] = new Array(windows.length);
  // Newest page first, `HISTORY_CONCURRENCY` at a time: a wide window is tens
  // of pages (56 for a fortnight of 1m bars, thousands for a year), and firing
  // them all at once queues the visible edge behind the oldest history on
  // HTTP/1.1 and lands the whole fan-out on the node at once on HTTP/2.
  let next = windows.length - 1;
  const worker = async () => {
    while (next >= 0) {
      const i = next--;
      try {
        pages[i] = await fetchCandlePage(rest, id, resolution, windows[i]!);
      } catch (err) {
        failures[i] = err;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(HISTORY_CONCURRENCY, windows.length) }, worker));

  // An unfetched page reads as `undefined`; an empty page is an empty array, so
  // "no bars here" and "never arrived" stay distinguishable.
  const oldestOk = pages.findIndex((page) => page !== undefined);
  if (windows.length && oldestOk === -1) throw failures.find((err) => err !== undefined);
  for (let i = oldestOk; i < pages.length; i++) {
    if (pages[i] === undefined) throw failures[i]; // a gap with bars on both sides
  }
  // Pages tile the window in ascending order and never overlap, so this is
  // already sorted; the filter drops the partial buckets at either edge.
  return pages.slice(Math.max(0, oldestOk)).flat().filter((b) => b.time >= range.from && b.time < toMs);
}

export class CandleSeries implements SeriesResource<Bar> {
  private readonly base: BaseResource<Bar[]>;
  private handle: ResourceHandle<Bar[]> | undefined;

  private readonly pages = new Map<number, Bar[]>(); // pageIndex -> closed bars
  private readonly live = new Map<number, Bar>(); // bucketStartMs -> forming bar
  private readonly resSecs: number;

  private window: TimeRange;
  private minPage: number | undefined;
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
    this.window = range ?? { from: Date.now() - pageSpanMs(resolution) };

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

  private async loadWindow(range: TimeRange): Promise<void> {
    const nowMs = Date.now();
    const toMs = range.to ?? nowMs;
    const startPage = candlePageAt(this.resolution, range.from);
    const endPage = candlePageAt(this.resolution, Math.max(range.from, toMs - 1));
    const trailingPage = candlePageAt(this.resolution, nowMs);

    const wanted: number[] = [];
    for (let p = startPage; p <= endPage; p++) {
      if (p === trailingPage || !this.pages.has(p)) wanted.push(p);
    }
    await this.fetchPages(wanted);
  }

  /** The oldest page loaded — `loadOlder` walks down from it. */
  private notePage(page: number): void {
    this.minPage = Math.min(this.minPage ?? page, page);
  }

  private async fetchPages(pageIndices: number[]): Promise<void> {
    if (!pageIndices.length) { this.rebuild(); return; }
    this._loading = true;
    this.rebuild(); // surface loading state
    try {
      const nowMs = Date.now(); // one clock read, so every page agrees on it
      await Promise.all(pageIndices.map(async (p) => {
        const window = candlePageWindow(this.resolution, p, nowMs);
        if (!window) { this.notePage(p); return; }
        try {
          const bars = await fetchCandlePage(this.ctx.rest, this.id, this.resolution, window);
          this.pages.set(p, bars);
          this.notePage(p);
          if (bars.length === 0 && this.minPage === p) this._hasMore = false;
        } catch {
          // A live series tolerates a missing page where `fetchCandleHistory`
          // rejects: it will ask again. But leave the page MISSING rather than
          // storing it empty — a stored empty page is indistinguishable from
          // "no bars in this span", so a transient failure would become a
          // permanent hole, since `loadWindow` only fetches pages it does not
          // already have.
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
