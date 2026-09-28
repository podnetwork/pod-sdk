import { describe, expect, it } from "vitest";

import { div, mul } from "../codec/fixed.js";
import { WAD } from "../codec/units.js";
import type { MarketId } from "../types/public.js";
import { fetchFills, fetchPnlHistory, foldPnlHistory, PnlHistoryCache, streamPnlHistory, type PnlEvent, type PnlTick } from "./pnl-history.js";

const PERP = `0x${"00".repeat(31)}01` as MarketId;
const SPOT = `0x${"00".repeat(31)}02` as MarketId;
const W = (n: number) => (BigInt(Math.round(n * 1e6)) * WAD) / 1_000_000n;
const TICK_US = 1_000_000;

const tickAt = (market: MarketId, timeUs: number): PnlTick => {
  const i = Math.floor(timeUs / TICK_US);
  return market === PERP
    ? { mark: W(100 + i), funding: W(0.01 * i) }
    : { mark: W(50 + 2 * i), funding: 0n };
};

// Forward simulation of the engine's leg rules, the oracle the fold must match.
function simulate(schedule: { tick: number; run: (e: Engine) => void }[], lastTick: number) {
  const e = new Engine();
  const pnl: bigint[] = [];
  for (let i = 0; i <= lastTick; i++) {
    for (const s of schedule) if (s.tick === i) s.run(e.at(i));
    pnl.push(e.pnl(i));
  }
  return { pnl, e };
}

class Engine {
  s = 0n; cb = 0n; fb = 0n; R = 0n;
  q = 0n; c = 0n; Rs = 0n;
  events: PnlEvent[] = [];
  private i = 0;
  at(i: number) { this.i = i; return this; }
  private get F() { return tickAt(PERP, this.i * TICK_US).funding; }
  private move(d: bigint, p: bigint) { this.cb += mul(p, d); this.fb += mul(this.F, d); this.s += d; }
  private bank() { this.R += this.fb - this.cb; this.cb = 0n; this.fb = 0n; }
  perp(ds: bigint, p: bigint) {
    const target = this.s + ds;
    if (this.s !== 0n && target !== 0n && (this.s > 0n) !== (target > 0n)) { this.move(-this.s, p); this.bank(); }
    this.move(target - this.s, p);
    if (this.s === 0n) this.bank();
    this.events.push({ market: PERP, timeUs: this.i * TICK_US, deltaSize: ds, price: p, kind: "fill" });
  }
  spot(dq: bigint, p: bigint) {
    if (dq > 0n) this.c += mul(p, dq);
    else { const a = div(this.c, this.q); this.Rs += mul(p - a, -dq); this.c -= mul(a, -dq); }
    this.q += dq;
    if (this.q === 0n) this.c = 0n;
    this.events.push({ market: SPOT, timeUs: this.i * TICK_US, deltaSize: dq, price: p, kind: "fill" });
  }
  withdraw(qty: bigint) {
    const a = div(this.c, this.q);
    this.c -= mul(a, qty);
    this.q -= qty;
    this.events.push({ market: SPOT, timeUs: this.i * TICK_US, deltaSize: -qty, price: 0n, kind: "withdraw" });
  }
  pnl(i: number) {
    const pt = tickAt(PERP, i * TICK_US);
    const st = tickAt(SPOT, i * TICK_US);
    return this.R + (mul(pt.mark, this.s) - this.cb) - (mul(pt.funding, this.s) - this.fb)
      + this.Rs + mul(st.mark, this.q) - this.c;
  }
}

const schedule = [
  { tick: 1, run: (e: Engine) => e.perp(W(2), W(101)) },
  { tick: 2, run: (e: Engine) => e.spot(W(10), W(54)) },
  { tick: 3, run: (e: Engine) => e.perp(W(1), W(103)) },
  { tick: 4, run: (e: Engine) => e.perp(W(-1), W(104)) },
  { tick: 5, run: (e: Engine) => e.withdraw(W(4)) },
  { tick: 6, run: (e: Engine) => e.perp(W(-5), W(106)) },
  // buy and withdraw in the same tick: the engine settles the fill first, the
  // withdrawal then leaves at the post-fill average cost
  { tick: 7, run: (e: Engine) => { e.spot(W(6), W(64)); e.withdraw(W(3)); } },
  { tick: 8, run: (e: Engine) => e.perp(W(3), W(108)) },
  { tick: 9, run: (e: Engine) => e.spot(W(-8), W(68)) },
  { tick: 10, run: (e: Engine) => e.perp(W(-2), W(110)) },
];
const LAST = 12;

const foldFrom = (e: Engine, gridTicks: number[]) => foldPnlHistory({
  refTimeUs: LAST * TICK_US,
  legs: [
    { market: PERP, kind: "perp", size: e.s, basis: e.fb - e.cb },
    { market: SPOT, kind: "spot", size: e.q, basis: e.c },
  ],
  events: e.events,
  gridUs: gridTicks.map((t) => t * TICK_US),
  tickAt,
});

const close = (a: bigint, b: bigint) => (a > b ? a - b : b - a) <= 10n ** 6n;

describe("foldPnlHistory", () => {
  it("reproduces the forward engine on every tick, starting at 0", () => {
    const { pnl, e } = simulate(schedule, LAST);
    const grid = Array.from({ length: LAST + 1 }, (_, i) => i);
    const out = foldFrom(e, grid);
    expect(out.warnings).toEqual([]);
    expect(out.points.map((p) => p.time)).toEqual(grid.map((t) => t * 1000));
    expect(out.points[0]?.pnl).toBe(0n);
    out.points.forEach((p, i) => {
      expect(close(p.pnl, (pnl[i] ?? 0n) - (pnl[0] ?? 0n)), `tick ${i}`).toBe(true);
    });
  });

  it("agrees on a coarser grid that groups several events per step", () => {
    const { pnl, e } = simulate(schedule, LAST);
    const grid = [2, 5, 8, 11];
    const out = foldFrom(e, grid);
    expect(out.points).toHaveLength(grid.length);
    out.points.forEach((p, i) => {
      const t = grid[i] ?? 0;
      expect(close(p.pnl, (pnl[t] ?? 0n) - (pnl[2] ?? 0n)), `tick ${t}`).toBe(true);
    });
  });

  it("flags a missing event as a basis residual at the leg's open", () => {
    const { e } = simulate(schedule, LAST);
    const events = e.events.filter((ev) => !(ev.market === PERP && ev.timeUs === 10 * TICK_US));
    const out = foldPnlHistory({
      refTimeUs: LAST * TICK_US,
      legs: [{ market: PERP, kind: "perp", size: e.s, basis: e.fb - e.cb }, { market: SPOT, kind: "spot", size: e.q, basis: e.c }],
      events,
      gridUs: [0, LAST * TICK_US],
      tickAt,
    });
    expect(out.warnings.some((w) => w.includes("basis residual"))).toBe(true);
  });
});

describe("fetchFills", () => {
  it("keeps every row of a batch that straddles a page boundary, duplicates included", async () => {
    // two fills per batch on one order id, like ADL slices
    const rows = Array.from({ length: 600 }, (_, i) => i + 1).flatMap((t) => [
      { orderbook_id: PERP, order_id: "0xabc", initial_size: "1", base_amount: "0x1", timestamp: t, price: "0x1" },
      { orderbook_id: PERP, order_id: "0xabc", initial_size: "-1", base_amount: "0x1", timestamp: t, price: "0x1" },
    ]);
    const calls: { from_ts: number; to_ts: number }[] = [];
    const fakeFetch = (async (_url: string, init: { body: string }) => {
      const q = JSON.parse(init.body).params[1] as { from_ts: number; to_ts: number; limit: number };
      calls.push(q);
      const fills = rows.filter((r) => r.timestamp >= q.from_ts && r.timestamp < q.to_ts).sort((a, b) => b.timestamp - a.timestamp).slice(0, q.limit);
      return { json: async () => ({ jsonrpc: "2.0", id: 1, result: { fills } }) };
    }) as unknown as typeof fetch;
    const out = await fetchFills("http://pod", "0x1", 1, 601, { fetch: fakeFetch });
    expect(out).toHaveLength(rows.length);
    expect(new Set(out.map((f) => f.timestamp)).size).toBe(600);
    expect(calls.length).toBe(3);
  });
});

const NOW_US = 2_000 * TICK_US;
const perpSize = W(3);
const markPerp = (tUs: number) => W(100 + (tUs / TICK_US) * 0.01);
const fundingRaw = (tUs: number) => BigInt(Math.floor(tUs / TICK_US)) * 10n ** 15n; // window 1 → F = raw
const fillRows = Array.from({ length: 1_200 }, (_, i) => {
  const tUs = (1_990 - Math.floor(i / 2)) * TICK_US;
  return { orderbook_id: PERP, order_id: `0x${i.toString(16)}`, initial_size: i % 3 === 0 ? "-1" : "1", base_amount: "0x" + (10n ** 16n).toString(16), timestamp: tUs, price: "0x" + markPerp(tUs).toString(16) };
});
const stubTickAt = (_m: MarketId, tUs: number): PnlTick => { const t = Math.floor(tUs / TICK_US) * TICK_US; return { mark: markPerp(t), funding: fundingRaw(t) }; };
const stubEvents = (): PnlEvent[] => fillRows.map((r) => ({ market: PERP, timeUs: r.timestamp, deltaSize: r.initial_size === "-1" ? -(10n ** 16n) : 10n ** 16n, price: BigInt(r.price), kind: "fill" }));

/** A fake node: one perp market, the fill rows above, ticks from the functions above. Counts fills calls. */
function stubDeps(cache?: PnlHistoryCache) {
  const calls = { fills: 0 };
  const rest = {
    markets: async () => [{ id: PERP, type: "perp", base: { address: "0x01" }, fundingWindowUs: 1, auctionIntervalMs: 500 }],
    // no bases: the synthetic fills are not engine-consistent, so the residual check must stay off
    positions: async () => ({ positions: [{ kind: "perp", orderbookId: PERP, size: perpSize }] }),
    balances: async () => ({ holdings: [] }),
    status: async () => ({ solutionNow: NOW_US / 1000 }),
    backstopTransfers: async () => ({ transfers: [] }),
    bridgeWithdrawals: async () => [],
  };
  const fakeFetch = (async (_url: string, init: { body: string }) => {
    const body = JSON.parse(init.body);
    const answer = (req: { id: number; method: string; params: unknown[] }) => {
      if (req.method === "pod_getSolverState") return { id: req.id, result: { last_executed_batch: { deadline: String(NOW_US) } } };
      if (req.method === "ob_getFills") {
        calls.fills++;
        const q = req.params[1] as { from_ts: number; to_ts: number; limit: number };
        return { id: req.id, result: { fills: fillRows.filter((r) => r.timestamp >= q.from_ts && r.timestamp < q.to_ts).sort((a, b) => b.timestamp - a.timestamp).slice(0, q.limit) } };
      }
      const q = req.params[0] as { until: number; since?: number; orderbook_id?: string };
      const t = Math.floor((q.until - 1) / TICK_US) * TICK_US;
      if (q.since !== undefined && t < q.since) return { id: req.id, result: { solutions: [] } };
      return { id: req.id, result: { solutions: [{ orderbook_id: PERP, timestamp: t, mark_price: "0x" + markPerp(t).toString(16), funding_index: fundingRaw(t).toString() }] } };
    };
    return { json: async () => (Array.isArray(body) ? body.map(answer) : answer(body)) };
  }) as unknown as typeof fetch;
  const deps = { rest: rest as unknown as import("../transport/rest.js").PodRestClient, rpcUrl: "http://pod", fetch: fakeFetch, cache };
  return { deps, calls };
}

describe("streamPnlHistory", () => {
  it("yields newest-first chunks that assemble to the one-shot fold", async () => {
    const FROM_MS = 0;
    const { deps } = stubDeps();

    const chunks: { first: number; last: number; n: number }[] = [];
    let streamed: { time: number; pnl: bigint }[] = [];
    for await (const c of streamPnlHistory(deps, "0x1", { from: FROM_MS, points: 200 })) {
      chunks.push({ first: c.points[0]?.time ?? -1, last: c.points.at(-1)?.time ?? -1, n: c.points.length });
      streamed = c.points.concat(streamed);
      expect(c.warnings).toEqual([]);
    }
    expect(chunks.length).toBeGreaterThan(1);
    for (let i = 1; i < chunks.length; i++) expect(chunks[i]?.last ?? 0).toBeLessThan(chunks[i - 1]?.first ?? 0);
    expect(streamed.at(-1)?.pnl).toBe(0n);

    const oneShot = foldPnlHistory({ refTimeUs: NOW_US, legs: [{ market: PERP, kind: "perp", size: perpSize }], events: stubEvents(), gridUs: streamed.map((p) => p.time * 1000), tickAt: stubTickAt });
    const base = streamed[0]?.pnl ?? 0n;
    expect(streamed.map((p) => p.pnl - base)).toEqual(oneShot.points.map((p) => p.pnl));
    expect(oneShot.warnings).toEqual([]);
  });
});

describe("PnlHistoryCache", () => {
  it("reports only the uncovered sub-ranges", () => {
    const c = new PnlHistoryCache();
    c.add(100, 200, []);
    c.add(300, 400, []);
    expect(c.missing(0, 500)).toEqual([{ from: 0, to: 100 }, { from: 200, to: 300 }, { from: 400, to: 500 }]);
    expect(c.missing(120, 180)).toEqual([]);
    c.add(200, 300, []);
    expect(c.missing(100, 400)).toEqual([]);
  });

  it("makes a wider window reuse the narrower one's fills and still match the one-shot fold", async () => {
    const cache = new PnlHistoryCache();
    const narrow = stubDeps(cache);
    await fetchPnlHistory(narrow.deps, "0x1", { from: 1_700 * TICK_US / 1000, points: 50 });
    const narrowCalls = narrow.calls.fills;
    expect(narrowCalls).toBeGreaterThan(0);

    const wide = stubDeps(cache);
    const r = await fetchPnlHistory(wide.deps, "0x1", { from: 0, points: 200 });
    const oneShot = foldPnlHistory({ refTimeUs: NOW_US, legs: [{ market: PERP, kind: "perp", size: perpSize }], events: stubEvents(), gridUs: r.points.map((p) => p.time * 1000), tickAt: stubTickAt });
    expect(r.points.map((p) => p.pnl)).toEqual(oneShot.points.map((p) => p.pnl));

    const again = stubDeps(cache);
    await fetchPnlHistory(again.deps, "0x1", { from: 0, points: 200 });
    expect(again.calls.fills).toBe(0);
    // the narrow run covered (1700 ticks, now]; the wide run fetched only below it
    const below = stubDeps(new PnlHistoryCache());
    await fetchPnlHistory(below.deps, "0x1", { from: 0, points: 200 });
    expect(wide.calls.fills).toBeLessThan(below.calls.fills);
  });
});

describe("PnlHistoryCache eviction", () => {
  it("drops the oldest events, their ticks and their coverage past the cap", () => {
    const c = new PnlHistoryCache(3);
    const ev = (t: number): PnlEvent => ({ market: PERP, timeUs: t, deltaSize: 1n, price: 1n, kind: "fill" });
    for (const t of [10, 20, 30, 40, 50]) c.ticks.set(`${PERP}:${t}`, { mark: 1n, funding: 0n });
    c.tickTimes.add(10).add(50);
    c.add(0, 60, [ev(10), ev(20), ev(30), ev(40), ev(50)]);
    expect(c.slice(0, 60).map((e) => e.timeUs)).toEqual([50, 40, 30]);
    expect(c.missing(0, 60)).toEqual([{ from: 0, to: 30 }]);
    expect([...c.ticks.keys()].map((k) => Number(k.split(":")[1]))).toEqual([30, 40, 50]);
    expect([...c.tickTimes]).toEqual([50]);
    c.clear();
    expect(c.missing(0, 60)).toEqual([{ from: 0, to: 60 }]);
  });
});
