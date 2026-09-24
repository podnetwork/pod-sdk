// PnL change over a past window, folded backwards from the live snapshot.
//
// Total PnL is continuous through banking (realized ⇄ unrealized), so the
// change between a past point t and the reference tick needs no leg
// boundaries and no banked amounts:
//   D(t) = Σ value_m(t) − Σ value_m(ref) − Σ_{events in (t, ref]} (F_b − p_b)·Δs_b
//   value_m = (mark − F)·size        spot: F = 0, mark = last clearing
// A spot withdrawal removes proportional cost without realizing, i.e. it is a
// sell at the holding's average cost.
//
// Fills page newest-first, so the walk streams: the newest points only need
// the newest pages, and each chunk is yielded as soon as its fills are in.

import type { Address, MarketId } from "../types/public.js";
import { div, mul } from "../codec/fixed.js";
import { dec } from "../codec/units.js";
import { rpc, rpcBatch, type RpcOptions } from "../transport/jsonrpc.js";
import type { PodRestClient } from "../transport/rest.js";

export interface PnlPoint { time: number; pnl: bigint }
export interface PnlHistory { points: PnlPoint[]; warnings: string[] }
export interface PnlHistoryQuery {
  /** ms */
  from: number;
  /** ms; defaults to the engine's current tick */
  to?: number;
  /** Sample count, at most 500 (the default). The step is the window divided
   * by it, rounded up to a whole batch interval. */
  points?: number;
}
/** One step of the backward walk. Chunks arrive newest-first; within a chunk
 * points are ascending. `pnl` is relative to the reference tick (0 at the
 * newest point), so a chart anchored at `from` shifts by the last chunk's
 * first point once `done`. */
export interface PnlHistoryChunk { points: PnlPoint[]; done: boolean; warnings: string[] }

export interface PnlLeg {
  market: MarketId;
  kind: "perp" | "spot";
  size: bigint;
  /** perp: fundingBasis − costBasis; spot: costBasis. Absent when the node
   * does not serve the bases; the residual check is then skipped. */
  basis?: bigint;
}
export interface PnlEvent {
  market: MarketId;
  timeUs: number;
  deltaSize: bigint;
  /** Fill price; unused for withdrawals. */
  price: bigint;
  kind: "fill" | "withdraw" | "sweep";
}
export interface PnlTick { mark: bigint; funding: bigint }
export interface PnlFoldInput {
  refTimeUs: number;
  /** One per market touched by legs or events. */
  legs: PnlLeg[];
  events: PnlEvent[];
  /** Ascending, all ≤ refTimeUs. */
  gridUs: number[];
  /** Newest tick at or before `timeUs`. */
  tickAt: (market: MarketId, timeUs: number) => PnlTick | undefined;
}

const RESIDUAL_TOLERANCE = 10n ** 12n;
// Within a tick the engine runs sweeps, then matching, then withdrawals;
// walking backwards undoes them in the opposite order.
const RANK = { withdraw: 0, fill: 1, sweep: 2 } as const;
const newestFirst = (a: PnlEvent, b: PnlEvent) => b.timeUs - a.timeUs || RANK[a.kind] - RANK[b.kind];

interface LegState { kind: "perp" | "spot"; size: bigint; basis: bigint; basisKnown: boolean }

/** The backward walk. Feed events newest-first, ask for points newest-first;
 * every event after a point must have been fed before the point is asked. */
export class PnlWalker {
  readonly warnings: string[] = [];
  private readonly state = new Map<MarketId, LegState>();
  private pending: PnlEvent[] = [];
  private acc = 0n;
  private refValue?: bigint;

  constructor(
    legs: PnlLeg[],
    private readonly tickAt: (market: MarketId, timeUs: number) => PnlTick | undefined,
    private readonly refTimeUs: number,
  ) {
    for (const l of legs) this.state.set(l.market, { kind: l.kind, size: l.size, basis: l.basis ?? 0n, basisKnown: l.basis !== undefined });
  }

  /** A market first seen in an old fill: flat at the reference. */
  touch(market: MarketId, kind: "perp" | "spot"): void {
    if (!this.state.has(market)) this.state.set(market, { kind, size: 0n, basis: 0n, basisKnown: true });
  }

  feed(events: PnlEvent[]): void {
    this.pending = this.pending.concat(events).sort(newestFirst);
  }

  point(t: number): PnlPoint {
    this.refValue ??= this.value(this.refTimeUs);
    for (let e = this.pending[0]; e && e.timeUs > t; e = this.pending[0]) {
      this.pending.shift();
      this.acc += this.unapply(e);
    }
    return { time: t / 1000, pnl: this.value(t) - this.refValue - this.acc };
  }

  private value(t: number): bigint {
    let sum = 0n;
    for (const [m, st] of this.state) {
      if (st.size === 0n) continue;
      const tick = this.tickAt(m, t);
      if (!tick) { this.warnings.push(`${m}: no tick at or before ${t}`); continue; }
      sum += mul(tick.mark - tick.funding, st.size);
    }
    return sum;
  }

  private unapply(e: PnlEvent): bigint {
    const st = this.state.get(e.market);
    if (!st) throw new Error(`pnlHistory: event on unknown market ${e.market}`);
    const tick = this.tickAt(e.market, e.timeUs);
    const F = tick?.funding ?? 0n;
    const sizeBefore = st.size - e.deltaSize;
    let price = e.price;

    if (st.kind === "spot") {
      const average = st.size !== 0n && st.basisKnown ? div(st.basis, st.size) : undefined;
      if (e.kind === "withdraw") {
        if (average === undefined) {
          this.warnings.push(`${e.market}: withdrawal at ${e.timeUs} with unknown cost basis, treated as neutral`);
          price = tick?.mark ?? 0n;
        } else price = average;
      }
      if (sizeBefore === 0n) { st.basis = 0n; st.basisKnown = true; }
      else if (e.deltaSize > 0n) st.basis -= mul(e.price, e.deltaSize);
      else if (average !== undefined) st.basis = mul(average, sizeBefore);
      else st.basisKnown = false;
    } else {
      const crossed = st.size !== 0n && sizeBefore !== 0n && (st.size > 0n) !== (sizeBefore > 0n);
      if (st.size === 0n || crossed) st.basisKnown = false;
      else if (st.basisKnown) st.basis -= mul(F - price, e.deltaSize);
      if (sizeBefore === 0n && st.basisKnown) {
        const r = st.basis < 0n ? -st.basis : st.basis;
        if (r > RESIDUAL_TOLERANCE) this.warnings.push(`${e.market}: basis residual ${st.basis} at flat ${e.timeUs}`);
        st.basis = 0n;
      }
    }

    st.size = sizeBefore;
    return mul(F - price, e.deltaSize);
  }
}

export function foldPnlHistory(input: PnlFoldInput): PnlHistory {
  const walker = new PnlWalker(input.legs, input.tickAt, input.refTimeUs);
  walker.feed(input.events);
  const points = [...input.gridUs].reverse().map((t) => walker.point(t)).reverse();
  const base = points[0]?.pnl ?? 0n;
  return { points: points.map((p) => ({ time: p.time, pnl: p.pnl - base })), warnings: walker.warnings };
}

// --- fetch ---

interface WireFill {
  orderbook_id: string;
  order_id: string;
  initial_size: string;
  base_amount: string;
  timestamp: number;
  price: string;
}
interface WireSolution {
  orderbook_id: string;
  timestamp: number;
  clearing_price?: string;
  mark_price: string;
  funding_index?: string;
}

/** Immutable inputs shared by every window size and every refresh: fills as
 * events keyed by the time ranges they cover, and ticks keyed by market and
 * time. The fold is recomputed per request; only uncovered ranges and unseen
 * ticks are fetched. */
export class PnlHistoryCache {
  readonly ticks = new Map<string, PnlTick>();
  /** Times at which every market's row was fetched at once. */
  readonly tickTimes = new Set<number>();
  private events: PnlEvent[] = [];
  private coverage: { from: number; to: number }[] = [];

  /** About 150 bytes per event and per tick, so the default cap is on the
   * order of 50 MB with its ticks. */
  constructor(readonly maxEvents = 250_000) {}

  clear(): void {
    this.ticks.clear();
    this.tickTimes.clear();
    this.events = [];
    this.coverage = [];
  }

  /** Sub-ranges of [from, to) not yet covered. */
  missing(from: number, to: number): { from: number; to: number }[] {
    const out: { from: number; to: number }[] = [];
    let cursor = from;
    for (const c of this.coverage) {
      if (c.to <= cursor) continue;
      if (c.from >= to) break;
      if (c.from > cursor) out.push({ from: cursor, to: c.from });
      cursor = Math.max(cursor, c.to);
    }
    if (cursor < to) out.push({ from: cursor, to });
    return out;
  }

  add(from: number, to: number, events: PnlEvent[]): void {
    this.events = this.events.concat(events).sort(newestFirst);
    this.coverage.push({ from, to });
    this.coverage.sort((a, b) => a.from - b.from);
    const merged: { from: number; to: number }[] = [];
    for (const c of this.coverage) {
      const last = merged[merged.length - 1];
      if (last && c.from <= last.to) last.to = Math.max(last.to, c.to);
      else merged.push({ ...c });
    }
    this.coverage = merged;
    if (this.events.length > this.maxEvents) {
      // ponytail: evict the oldest events, their ticks, and coverage below them.
      const cut = this.events[this.maxEvents - 1]?.timeUs ?? 0;
      this.events = this.events.filter((e) => e.timeUs >= cut);
      this.coverage = this.coverage.filter((c) => c.to > cut).map((c) => ({ from: Math.max(c.from, cut), to: c.to }));
      for (const k of this.ticks.keys()) if (Number(k.slice(k.indexOf(":") + 1)) < cut) this.ticks.delete(k);
      for (const t of this.tickTimes) if (t < cut) this.tickTimes.delete(t);
    }
  }

  /** Events with from ≤ time < to, newest first. */
  slice(from: number, to: number): PnlEvent[] {
    return this.events.filter((e) => e.timeUs >= from && e.timeUs < to);
  }
}

export interface PnlHistoryDeps { rest: PodRestClient; rpcUrl: string; fetch?: typeof fetch; cache?: PnlHistoryCache }

const MAX_POINTS = 500;
const CHUNK_POINTS = 50;
const IN_FLIGHT = 4;
const WIDE_ACCOUNT_MARKETS = 10;
const RPC_BATCH = 200;
const FILLS_PAGE = 500;

/** Pages newest-first. A full page may cut a batch in half, so its oldest
 * batch is dropped and refetched whole with the next page; rows are never
 * keyed, since one order can legitimately fill several times in one batch
 * (ADL slices). */
class FillsCursor {
  done = false;
  readonly warnings: string[] = [];
  private to: number;
  constructor(private readonly rpcUrl: string, private readonly account: Address, private readonly fromUs: number, toUs: number, private readonly opts: RpcOptions) {
    this.to = toUs;
  }

  async next(): Promise<WireFill[]> {
    const page = await rpc<{ fills: WireFill[] }>(this.rpcUrl, "ob_getFills", [this.account, { from_ts: this.fromUs, to_ts: this.to, limit: FILLS_PAGE }], this.opts);
    if (page.fills.length < FILLS_PAGE) {
      this.done = true;
      return page.fills;
    }
    const oldest = Math.min(...page.fills.map((f) => f.timestamp));
    if (oldest + 1 === this.to) {
      // ponytail: a single batch with more than FILLS_PAGE fills is truncated here.
      this.warnings.push(`batch ${oldest} has more than ${FILLS_PAGE} fills; only the first page is used`);
      this.to = oldest;
      return page.fills;
    }
    this.to = oldest + 1;
    return page.fills.filter((f) => f.timestamp !== oldest);
  }
}

async function drainFills(rpcUrl: string, account: Address, fromUs: number, toUs: number, opts: RpcOptions): Promise<{ fills: WireFill[]; warnings: string[] }> {
  const cursor = new FillsCursor(rpcUrl, account, fromUs, toUs, opts);
  const fills: WireFill[] = [];
  while (!cursor.done) fills.push(...(await cursor.next()));
  return { fills, warnings: cursor.warnings };
}

export async function fetchFills(rpcUrl: string, account: Address, fromUs: number, toUs: number, opts: RpcOptions): Promise<WireFill[]> {
  return (await drainFills(rpcUrl, account, fromUs, toUs, opts)).fills;
}

export async function* streamPnlHistory(
  deps: PnlHistoryDeps,
  account: Address,
  q: PnlHistoryQuery,
): AsyncGenerator<PnlHistoryChunk> {
  const rpcOpts: RpcOptions = { fetch: deps.fetch };

  // The snapshot is served from the live engine, fills and ticks from the
  // indexer. Pair them: the engine's last executed batch is read together with
  // the snapshot, one request sent just before it and one just after, and the
  // read is retried when the two disagree. Sequential reads would be exact but
  // straddle a 500 ms tick on every attempt from far away; concurrent ones
  // land within a few ms of server time, so a boundary inside that gap is rare
  // and the next refresh heals it.
  const engineTick = async (): Promise<number> => {
    const st = await rpc<{ last_executed_batch?: { deadline: string | number } | null }>(deps.rpcUrl, "pod_getSolverState", [], rpcOpts);
    return Number(st.last_executed_batch?.deadline ?? 0);
  };
  const readSnapshot = async () => {
    for (let attempt = 0; ; attempt++) {
      const [before, snap, balances, after] = await Promise.all([engineTick(), deps.rest.positions(account), deps.rest.balances(account), engineTick()]);
      if (before === after || attempt >= 4) return { nowUs: before, snap, balances };
    }
  };
  const [markets, snapshot] = await Promise.all([deps.rest.markets(), readSnapshot()]);
  const { snap, balances } = snapshot;
  let nowUs = snapshot.nowUs;
  const batchUs = Math.max(500, ...markets.map((m) => m.auctionIntervalMs)) * 1000;
  // Grid points sit on batch ticks so one range call per point serves every market.
  const fromUs = Math.ceil((q.from * 1000) / batchUs) * batchUs;

  const indexerCaughtUp = async () => {
    if (nowUs === 0) { nowUs = (await deps.rest.status()).solutionNow * 1000; return; }
    for (let i = 0; i < 30 && (await deps.rest.status()).solutionNow * 1000 < nowUs; i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
  };
  const [backstop, withdrawals] = await Promise.all([
    deps.rest.backstopTransfers(account),
    deps.rest.bridgeWithdrawals(account, { since: fromUs - 1 }),
    indexerCaughtUp(),
  ]);
  const toUs = Math.min(q.to === undefined ? nowUs : Math.floor((q.to * 1000) / batchUs) * batchUs, nowUs);
  if (fromUs >= toUs) throw new Error("pnlHistory: from must be before to");

  const points = Math.min(Math.max(2, Math.floor(q.points ?? MAX_POINTS)), MAX_POINTS);
  const stepUs = Math.ceil((toUs - fromUs) / (points - 1) / batchUs) * batchUs;
  // The series starts at `from` and ends at `to`; the points between sit on
  // epoch multiples of the step, so a refreshed window shares them, and their
  // ticks, with the previous one.
  const gridUs: number[] = [fromUs];
  for (let t = (Math.floor(fromUs / stepUs) + 1) * stepUs; t < toUs; t += stepUs) gridUs.push(t);
  gridUs.push(toUs);

  const byId = new Map(markets.map((m) => [m.id, m]));
  const spotByToken = new Map(markets.filter((m) => m.type === "spot").map((m) => [m.base.address, m]));
  const kindOf = (id: MarketId): "perp" | "spot" => (byId.get(id)?.type === "spot" ? "spot" : "perp");
  const legs: PnlLeg[] = [];
  for (const p of snap.positions) {
    if (p.kind !== "perp") continue;
    const basis = p.fundingBasis !== undefined && p.costBasis !== undefined ? p.fundingBasis - p.costBasis : undefined;
    legs.push({ market: p.orderbookId, kind: "perp", size: p.size, basis });
  }
  for (const h of balances.holdings) legs.push({ market: h.orderbookId, kind: "spot", size: h.balance, basis: h.costBasis });

  const cache = deps.cache ?? new PnlHistoryCache();
  const ticks = cache.ticks;
  const key = (m: MarketId, t: number) => `${m}:${t}`;
  const walker = new PnlWalker(legs, (m, t) => ticks.get(key(m, t)), nowUs);
  const known = new Set<MarketId>(legs.map((l) => l.market));
  const use = (id: MarketId) => { if (!known.has(id)) { known.add(id); walker.touch(id, kindOf(id)); } };

  const store = (row: WireSolution, t: number) => {
    const id = row.orderbook_id as MarketId;
    const perp = kindOf(id) === "perp";
    const window = byId.get(id)?.fundingWindowUs ?? 0;
    ticks.set(key(id, t), {
      mark: perp ? dec(row.mark_price) : dec(row.clearing_price),
      funding: perp && row.funding_index !== undefined && window > 0 ? dec(row.funding_index) / BigInt(window) : 0n,
    });
  };
  // Every batch of 200 calls goes out at once; the node runs them concurrently.
  const solutions = async (params: object[]): Promise<WireSolution[][]> => {
    const batches: object[][] = [];
    for (let i = 0; i < params.length; i += RPC_BATCH) batches.push(params.slice(i, i + RPC_BATCH));
    const res = await Promise.all(batches.map((b) => rpcBatch<{ solutions: WireSolution[] }>(deps.rpcUrl, b.map((p) => ({ method: "ob_getSolutions", params: [p] })), rpcOpts)));
    return res.flat().map((r) => r.solutions);
  };
  /** All markets' rows at each tick, one call per tick. */
  const fetchAllAt = async (times: number[]) => {
    const wanted = times.filter((t) => !cache.tickTimes.has(t));
    const rows = await solutions(wanted.map((t) => ({ since: t, until: t + 1, limit: RPC_BATCH })));
    rows.forEach((rs, i) => { const t = wanted[i] ?? 0; cache.tickTimes.add(t); for (const r of rs) store(r, t); });
  };
  /** Ticks for every known market at the grid points. One call per tick when
   * the account spans many markets, else one lookup per market: the wide call
   * returns every market's row whether needed or not. */
  const fetchTicks = async (times: number[]) => {
    if (known.size >= WIDE_ACCOUNT_MARKETS) await fetchAllAt(times);
    else await fetchPairs(times.flatMap((t) => [...known].map((market) => ({ market, timeUs: t }))));
  };
  /** Newest row at or before the time, per pair; the fallback and the per-fill path. */
  const fetchPairs = async (pairs: { market: MarketId; timeUs: number }[]) => {
    const wanted = pairs.filter((n, i, all) => !ticks.has(key(n.market, n.timeUs)) && all.findIndex((o) => o.market === n.market && o.timeUs === n.timeUs) === i);
    const rows = await solutions(wanted.map((n) => ({ orderbook_id: n.market, until: n.timeUs + 1, limit: 1 })));
    rows.forEach((rs, i) => { const r = rs[0]; const n = wanted[i]; if (r && n) store(r, n.timeUs); });
  };

  const fixed: PnlEvent[] = [];
  for (const b of backstop.transfers) {
    const timeUs = b.time * 1000;
    if (!b.orderbookId || b.size === 0n || timeUs < fromUs || timeUs > nowUs) continue;
    use(b.orderbookId);
    fixed.push({ market: b.orderbookId, timeUs, deltaSize: -b.size, price: b.markPrice, kind: "sweep" });
  }
  for (const w of withdrawals) {
    if (w.error || w.timeUs < fromUs || w.timeUs > nowUs) continue;
    const m = spotByToken.get(w.token);
    if (!m) continue;
    use(m.id);
    fixed.push({ market: m.id, timeUs: w.timeUs, deltaSize: -w.amount, price: 0n, kind: "withdraw" });
  }
  walker.feed(fixed);
  const preface = Promise.all([fetchTicks([nowUs]), fetchPairs(fixed.map((e) => ({ market: e.market, timeUs: e.timeUs })))]);

  const toEvent = (f: WireFill): PnlEvent => {
    const base = dec(f.base_amount);
    return { market: f.orderbook_id as MarketId, timeUs: f.timestamp, deltaSize: dec(f.initial_size) < 0n ? -base : base, price: dec(f.price), kind: "fill" };
  };
  // Chunks newest-first. Chunk k needs the events in (oldest_k, oldest_{k−1}],
  // an explicit window, so the next windows load while earlier ones are folded.
  const chunks: number[][] = [];
  const newestFirstGrid = [...gridUs].reverse();
  for (let i = 0; i < newestFirstGrid.length; i += CHUNK_POINTS) chunks.push(newestFirstGrid.slice(i, i + CHUNK_POINTS));
  const prep = async (k: number): Promise<{ events: PnlEvent[]; warnings: string[] }> => {
    const pts = chunks[k] ?? [];
    const oldest = pts[pts.length - 1] ?? 0;
    const bound = k === 0 ? nowUs : (chunks[k - 1]?.at(-1) ?? nowUs);
    const warnings: string[] = [];
    await Promise.all(cache.missing(oldest + 1, bound + 1).map(async (r) => {
      const page = await drainFills(deps.rpcUrl, account, r.from, r.to, rpcOpts);
      cache.add(r.from, r.to, page.fills.map(toEvent));
      warnings.push(...page.warnings);
    }));
    const events = cache.slice(oldest + 1, bound + 1);
    await Promise.all([fetchTicks(pts), fetchPairs(events.map((e) => ({ market: e.market, timeUs: e.timeUs })))]);
    return { events, warnings };
  };
  const queue: Promise<{ events: PnlEvent[]; warnings: string[] }>[] = [];
  let nextPrep = 0;
  for (let k = 0; k < chunks.length; k++) {
    while (queue.length < IN_FLIGHT && nextPrep < chunks.length) {
      const p = prep(nextPrep++);
      p.catch(() => {});
      queue.push(p);
    }
    const { events, warnings } = await (queue.shift() as Promise<{ events: PnlEvent[]; warnings: string[] }>);
    await preface;
    for (const e of events) use(e.market);
    walker.feed(events);
    const pts = chunks[k] ?? [];
    await fetchPairs(pts.flatMap((t) => [...known].map((market) => ({ market, timeUs: t }))));
    const out = pts.map((t) => walker.point(t)).reverse();
    yield { points: out, done: k === chunks.length - 1, warnings: [...walker.warnings.splice(0), ...warnings] };
  }
}

export async function fetchPnlHistory(deps: PnlHistoryDeps, account: Address, q: PnlHistoryQuery): Promise<PnlHistory> {
  let points: PnlPoint[] = [];
  const warnings: string[] = [];
  for await (const c of streamPnlHistory(deps, account, q)) {
    points = c.points.concat(points);
    warnings.push(...c.warnings);
  }
  const base = points[0]?.pnl ?? 0n;
  return { points: points.map((p) => ({ time: p.time, pnl: p.pnl - base })), warnings };
}
