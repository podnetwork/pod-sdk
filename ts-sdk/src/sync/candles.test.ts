// Candle reads have one hard rule: a chart takes the answer to a history
// request as the truth for that range and never asks again. So a read must
// either deliver its whole window or fail loudly — a short answer is worse than
// an error, because nothing detects it. Two bugs came from breaking that:
//
//   - history waited on the memoised `CandleSeries`' single `loading()` flag, so
//     an unrelated load finishing resolved it with pages still in flight. The
//     bars arrived (HTTP 200) and the chart drew a hole where they belonged.
//   - a page whose fetch failed was stored as an empty page, which is
//     indistinguishable from "no bars here" — so the hole was permanent: later
//     loads only fetch pages they don't already have.

import { describe, expect, it, vi } from "vitest";

import { RESOLUTION_PAGE_BUCKETS, RESOLUTION_SECONDS } from "../codec/resolution.js";
import type { PodRestClient } from "../transport/rest.js";
import type { Bar, MarketId, Resolution } from "../types/public.js";
import { PodHttpError } from "../transport/rest.js";
import {
  candlePageWindows, CandleSeries, candleTailFrom, fetchCandleHistory, type SeriesResource,
} from "./candles.js";
import type { SyncContext } from "./sources.js";

const ID = `0x${"8".padStart(64, "0")}` as MarketId;
const MIN = 60_000;
const T0 = Date.UTC(2026, 7, 19, 12, 0, 0); // a fixed "now", so no wall clock leaks in

const bar = (time: number): Bar =>
  ({ time, open: 1n, high: 1n, low: 1n, close: 1n, volume: 0n, quoteVolume: 0n });
const series1m = (count: number, end = T0) =>
  Array.from({ length: count }, (_, i) => bar(end - (count - 1 - i) * MIN));

/**
 * REST stub over a fixed bar set; records the windows asked for. `solutionNow`
 * is the indexer watermark the real endpoint returns, and it truncates the
 * answer the way the server does — bars past it are not indexed yet.
 */
const restStub = (bars: Bar[], opts: { fail?: (from: number) => boolean | Error; solutionNow?: number } = {}) => {
  const asked: { from: number; to: number }[] = [];
  const state = { solutionNow: opts.solutionNow ?? Number.MAX_SAFE_INTEGER };
  const rest = {
    candles: async (_id: MarketId, q: { from: number; to: number }) => {
      asked.push({ from: q.from, to: q.to });
      const fail = opts.fail?.(q.from);
      if (fail) throw fail instanceof Error ? fail : new Error(`page ${q.from} failed`);
      return {
        bars: bars.filter((b) => b.time >= q.from && b.time < q.to && b.time < state.solutionNow),
        solutionNow: state.solutionNow,
      };
    },
  } as unknown as PodRestClient;
  return { rest, asked, state };
};

describe("candlePageWindows", () => {
  const pageMs = (res: Resolution) => RESOLUTION_PAGE_BUCKETS[res] * RESOLUTION_SECONDS[res] * 1000;

  it("tiles the range on epoch-anchored pages, so URLs repeat across requests", () => {
    const narrow = candlePageWindows("1m", T0 - 30 * MIN, T0, T0 + MIN);
    const wide = candlePageWindows("1m", T0 - 5 * 60 * MIN, T0, T0 + MIN);
    for (const w of [...narrow, ...wide]) {
      expect(w.fromMs % pageMs("1m")).toBe(0); // anchored: same grid every time
      expect(w.toMs - w.fromMs).toBeLessThanOrEqual(pageMs("1m"));
    }
    // The page they share is byte-identical, which is what makes the server's
    // `immutable` response reusable from cache.
    expect(wide.at(-1)).toEqual(narrow.at(-1));
    // Consecutive pages meet exactly: no gap, no overlap.
    for (let i = 1; i < wide.length; i++) expect(wide[i]!.fromMs).toBe(wide[i - 1]!.toMs);
  });

  it("clamps the trailing window to the last closed bucket", () => {
    const now = T0 + 3 * MIN + 20_000; // mid-bucket
    const [w] = candlePageWindows("1m", T0, T0 + 10 * MIN, now);
    expect(w!.toMs).toBe(T0 + 3 * MIN); // the forming bucket is never requested
  });

  it("yields nothing when the range holds only the forming bucket", () => {
    expect(candlePageWindows("1m", T0, T0 + MIN, T0 + 20_000)).toEqual([]);
  });
});

describe("fetchCandleHistory", () => {
  it("returns every bar in the window, in order, across pages", async () => {
    const bars = series1m(700); // more than one 1m page (360 buckets)
    const { rest, asked } = restStub(bars);
    const got = await fetchCandleHistory(rest, ID, "1m", { from: T0 - 699 * MIN, to: T0 + MIN }, T0 + MIN);
    expect(asked.length).toBeGreaterThan(1);
    expect(got.map((b) => b.time)).toEqual(bars.map((b) => b.time));
  });

  it("excludes bars outside the window", async () => {
    const { rest } = restStub(series1m(700));
    const got = await fetchCandleHistory(rest, ID, "1m", { from: T0 - 9 * MIN, to: T0 - 4 * MIN }, T0 + MIN);
    expect(got.map((b) => b.time)).toEqual([9, 8, 7, 6, 5].map((n) => T0 - n * MIN));
  });

  it("retries a page that fails once, and still completes the window", async () => {
    const bars = series1m(700);
    const pageMs = RESOLUTION_PAGE_BUCKETS["1m"] * MIN;
    const oldest = Math.floor((T0 - 699 * MIN) / pageMs) * pageMs;
    const { rest, asked } = restStub(bars, {
      // Fails only the first attempt at that page — a cold window on a busy node.
      fail: (from) => from === oldest && asked.filter((a) => a.from === from).length === 1,
    });
    const got = await fetchCandleHistory(rest, ID, "1m", { from: T0 - 699 * MIN, to: T0 + MIN }, T0 + MIN);
    expect(got.map((b) => b.time)).toEqual(bars.map((b) => b.time));
    expect(asked.filter((a) => a.from === oldest)).toHaveLength(2);
  });

  it("does not retry a request the server called invalid", async () => {
    const bars = series1m(700);
    const pageMs = RESOLUTION_PAGE_BUCKETS["1m"] * MIN;
    const middle = Math.floor((T0 - 699 * MIN) / pageMs) * pageMs + pageMs;
    const { rest, asked } = restStub(bars, {
      fail: (from) => (from === middle ? new PodHttpError(400, "url", "bad request") : false),
    });
    await expect(
      fetchCandleHistory(rest, ID, "1m", { from: T0 - 699 * MIN, to: T0 + MIN }, T0 + MIN),
    ).rejects.toThrow(/bad request/);
    expect(asked.filter((a) => a.from === middle)).toHaveLength(1); // asked once, not retried
  });

  it("stops at a gap on the old end instead of failing the window", async () => {
    const bars = series1m(700);
    const pageMs = RESOLUTION_PAGE_BUCKETS["1m"] * MIN;
    const oldest = Math.floor((T0 - 699 * MIN) / pageMs) * pageMs;
    const { rest } = restStub(bars, { fail: (from) => from === oldest });
    const got = await fetchCandleHistory(rest, ID, "1m", { from: T0 - 699 * MIN, to: T0 + MIN }, T0 + MIN);
    // History simply starts at the next page; the caller re-asks when it pans.
    expect(got[0]!.time).toBe(oldest + pageMs);
    expect(got.at(-1)!.time).toBe(T0);
  });

  it("rejects when a dropped old page leaves nothing to show", async () => {
    // The trap: a quiet stretch next to a shed page. Slicing the failed prefix
    // off leaves an empty array, which a chart reads as "no bars here, stop
    // asking" — hiding the shed page's bars for as long as it lives.
    const bars = series1m(700);
    const pageMs = RESOLUTION_PAGE_BUCKETS["1m"] * MIN;
    const oldest = Math.floor((T0 - 699 * MIN) / pageMs) * pageMs;
    const { rest } = restStub(
      // Only the oldest page has any trades in it, and that page fails.
      bars.filter((b) => b.time < oldest + pageMs),
      { fail: (from) => from === oldest },
    );
    await expect(
      fetchCandleHistory(rest, ID, "1m", { from: T0 - 699 * MIN, to: T0 + MIN }, T0 + MIN),
    ).rejects.toThrow(/failed/);
  });

  it("rejects a gap that would sit between bars it is returning", async () => {
    const bars = series1m(700);
    const pageMs = RESOLUTION_PAGE_BUCKETS["1m"] * MIN;
    const middle = Math.floor((T0 - 699 * MIN) / pageMs) * pageMs + pageMs;
    const { rest } = restStub(bars, { fail: (from) => from === middle });
    await expect(
      fetchCandleHistory(rest, ID, "1m", { from: T0 - 699 * MIN, to: T0 + MIN }, T0 + MIN),
    ).rejects.toThrow(/failed/);
  });
});

describe("candleTailFrom", () => {
  /** A series whose bars arrive after the caller starts waiting, and whose
   * `ready()` resolves on the empty seed the way the real one does. */
  const stubSeries = () => {
    let bars: Bar[] = [];
    const listeners = new Set<() => void>();
    const series = {
      get: () => bars,
      ready: async () => bars,
      subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
      loading: () => false, error: undefined,
      setWindow: () => {}, loadOlder: async () => {}, hasMore: () => false,
    } as unknown as SeriesResource<Bar>;
    return { series, listeners, push: (next: Bar[]) => { bars = next; listeners.forEach((l) => l()); } };
  };

  it("waits for a bar in the window rather than taking the empty seed", async () => {
    const { series, listeners, push } = stubSeries();
    const pending = candleTailFrom(series, { from: T0, to: T0 + MIN }, 2_000);
    push([bar(T0)]); // the forming bucket lands a beat after the call
    expect((await pending).map((b) => b.time)).toEqual([T0]);
    expect(listeners.size).toBe(0); // and it lets go of the series again
  });

  it("releases its listener when the series emits inside subscribe()", async () => {
    // `subscribe` starts the source, and the first `rebuild()` runs before its
    // first await — so the listener can fire while it is still being registered.
    let bars: Bar[] = [];
    const listeners = new Set<() => void>();
    const series = {
      get: () => bars,
      ready: async () => bars,
      subscribe: (l: () => void) => {
        listeners.add(l);
        bars = [bar(T0)];
        l(); // synchronous emit, before `subscribe` has returned
        return () => listeners.delete(l);
      },
      loading: () => false, error: undefined,
      setWindow: () => {}, loadOlder: async () => {}, hasMore: () => false,
    } as unknown as SeriesResource<Bar>;
    expect((await candleTailFrom(series, { from: T0, to: T0 + MIN }, 2_000)).map((b) => b.time)).toEqual([T0]);
    expect(listeners.size).toBe(0); // and the tick fold is not left running
  });

  it("gives up at the timeout instead of hanging the caller", async () => {
    const { series, listeners } = stubSeries();
    expect(await candleTailFrom(series, { from: T0, to: T0 + MIN }, 20)).toEqual([]);
    expect(listeners.size).toBe(0);
  });

  it("ignores bars outside the window", async () => {
    const { series, push } = stubSeries();
    const pending = candleTailFrom(series, { from: T0, to: T0 + MIN }, 60);
    push([bar(T0 - 5 * MIN)]); // older than the window: keep waiting, then time out
    expect(await pending).toEqual([]);
  });
});

describe("page cache", () => {
  it("serves a repeat read of a final page without asking again", async () => {
    const bars = series1m(700);
    const { rest, asked } = restStub(bars);
    const range = { from: bars[0]!.time, to: T0 + MIN };
    const first = await fetchCandleHistory(rest, ID, "1m", range, T0 + MIN);
    const asksAfterFirst = asked.length;
    const second = await fetchCandleHistory(rest, ID, "1m", range, T0 + MIN);
    expect(second.map((b) => b.time)).toEqual(first.map((b) => b.time));
    // Only the trailing (still-growing) page is re-asked; the full pages are not.
    expect(asked.length - asksAfterFirst).toBeLessThan(asksAfterFirst);
  });

  it("retries a window the indexer had not reached, instead of answering short", async () => {
    const bars = series1m(700);
    const pageMs = RESOLUTION_PAGE_BUCKETS["1m"] * MIN;
    const page = Math.floor(bars[0]!.time / pageMs) + 1;
    const range = { from: page * pageMs, to: (page + 1) * pageMs };
    let asks = 0;
    const rest = {
      candles: async (_id: MarketId, q: { from: number; to: number }) => {
        asks += 1;
        // First answer is behind the window's end; the indexer catches up after.
        const solutionNow = asks === 1 ? range.to - 10 * MIN : Number.MAX_SAFE_INTEGER;
        return {
          bars: bars.filter((b) => b.time >= q.from && b.time < q.to && b.time < solutionNow),
          solutionNow,
        };
      },
    } as unknown as PodRestClient;
    const got = await fetchCandleHistory(rest, ID, "1m", range, T0 + MIN);
    expect(asks).toBe(2); // the short answer was not taken as final
    expect(got.at(-1)!.time).toBe(range.to - MIN);
  });

  it("does not retry the trailing page for being short — that is its normal state", async () => {
    const bars = series1m(700);
    const pageMs = RESOLUTION_PAGE_BUCKETS["1m"] * MIN;
    const page = Math.floor(bars[0]!.time / pageMs) + 1;
    // A clock mid-page, so the trailing window is clamped and cannot be whole.
    const nowMs = page * pageMs + 10 * MIN;
    let asks = 0;
    const rest = {
      candles: async (_id: MarketId, q: { from: number; to: number }) => {
        asks += 1;
        const solutionNow = q.to - MIN; // behind the window's end, as a lagging indexer is
        return { bars: bars.filter((b) => b.time >= q.from && b.time < q.to), solutionNow };
      },
    } as unknown as PodRestClient;
    await fetchCandleHistory(rest, ID, "1m", { from: page * pageMs, to: nowMs }, nowMs);
    expect(asks).toBe(1); // no spin, no seconds of backoff against a healthy node
  });

  it("claims only what the indexer had reached, not every bar it was handed", async () => {
    const bars = series1m(700);
    const pageMs = RESOLUTION_PAGE_BUCKETS["1m"] * MIN;
    const page = Math.floor(bars[0]!.time / pageMs) + 1;
    const nowMs = page * pageMs + 10 * MIN;
    const watermark = page * pageMs + 4 * MIN;
    const rest = {
      // A server that answers past its own watermark: the read must not pass
      // those bars off as covered history.
      candles: async (_id: MarketId, q: { from: number; to: number }) => ({
        bars: bars.filter((b) => b.time >= q.from && b.time < q.to),
        solutionNow: watermark,
      }),
    } as unknown as PodRestClient;
    const got = await fetchCandleHistory(rest, ID, "1m", { from: page * pageMs, to: nowMs }, nowMs);
    expect(got.at(-1)!.time).toBe(watermark - MIN);
  });

  it("never stores a page the indexer had not caught up to", async () => {
    const bars = series1m(700);
    const pageMs = RESOLUTION_PAGE_BUCKETS["1m"] * MIN;
    // A page that is whole by the clock, but whose last bars are not indexed yet.
    const page = Math.floor(bars[0]!.time / pageMs) + 1;
    const lagging = page * pageMs + 10 * MIN;
    const { rest, state } = restStub(bars, { solutionNow: lagging });
    const range = { from: page * pageMs, to: (page + 1) * pageMs };
    const short = await fetchCandleHistory(rest, ID, "1m", range, T0 + MIN);
    expect(short.at(-1)!.time).toBeLessThan(lagging); // truncated, as the server would

    // Once the indexer catches up the same window must come back complete —
    // caching the short answer would have pinned that hole forever.
    state.solutionNow = Number.MAX_SAFE_INTEGER;
    const full = await fetchCandleHistory(rest, ID, "1m", range, T0 + MIN);
    expect(full.length).toBeGreaterThan(short.length);
    expect(full.at(-1)!.time).toBe(range.to - MIN);
  });
});

describe("CandleSeries page cache", () => {
  const ctxWith = (rest: PodRestClient): SyncContext => ({
    rest,
    ws: {
      subscribe: () => ({ unsubscribe() {}, update() {}, resubscribe() {} }),
      on: () => () => {},
    },
  } as unknown as SyncContext);

  // A failing page burns its retries and backoff before the load settles.
  const until = (cond: () => boolean) => vi.waitUntil(cond, { timeout: 8000, interval: 10 });

  it("does not cache a failed page, so a later load retries it", async () => {
    const bars = series1m(400); // spans two 1m pages
    let failing = true;
    const pageMs = RESOLUTION_PAGE_BUCKETS["1m"] * MIN;
    const oldest = Math.floor(bars[0]!.time / pageMs) * pageMs;
    const { rest, asked } = restStub(bars, { fail: (from) => failing && from === oldest });

    const s = new CandleSeries(ctxWith(rest), ID, "1m", { from: bars[0]!.time, to: T0 + MIN });
    const off = s.subscribe(() => {});
    await until(() => asked.some((a) => a.from === oldest));
    await until(() => !s.loading());
    // The failed page contributed nothing...
    expect((s.get() ?? []).some((b) => b.time === bars[0]!.time)).toBe(false);

    // ...and is not remembered as empty: the same window asks for it again.
    failing = false;
    const before = asked.filter((a) => a.from === oldest).length;
    s.setWindow({ from: bars[0]!.time, to: T0 + MIN });
    await until(() => asked.filter((a) => a.from === oldest).length > before);
    await until(() => (s.get() ?? []).some((b) => b.time === bars[0]!.time));
    off();
  });
});
