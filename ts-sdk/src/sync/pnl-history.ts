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

import type { Address, MarketId, MoneyActivity } from "../types/public.js";
import { div, mul } from "../codec/fixed.js";
import { dec } from "../codec/units.js";
import type { WireFillRow, WireSolutionRow } from "../types/wire.js";
import { rpc, type RpcOptions } from "../transport/jsonrpc.js";
import { PodHttpError, type PodRestClient } from "../transport/rest.js";

export interface PnlPoint {
  time: number;
  pnl: bigint;
  /** Absolute account value at the point; absent when the node does not
   * serve the activity feed the deposits and transfers come from. */
  accountValue?: bigint;
}
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
  /** Absent on a cash movement. */
  market?: MarketId;
  timeUs: number;
  /** Signed size for a market event; the signed native amount for `cash`. */
  deltaSize: bigint;
  /** Fill price; unused for withdrawals, deposits and cash. */
  price: bigint;
  /** `withdraw` and `deposit` are spot token movements: a withdrawal leaves at
   * the average cost, a deposit arrives marked at the tick's clearing price.
   * `cash` is native money in or out, which moves account value only. */
  kind: "fill" | "withdraw" | "deposit" | "sweep" | "cash";
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
  /** Account value at the reference tick; points carry `accountValue` when given. */
  accountValueRef?: bigint;
}

const RESIDUAL_TOLERANCE = 10n ** 12n;
// Within a tick the engine runs sweeps, then deposits, then matching, then
// transfers and withdrawals; walking backwards undoes them in the opposite
// order. Cash never touches a size, so its place only has to be consistent.
const RANK = { withdraw: 0, cash: 1, fill: 2, deposit: 3, sweep: 4 } as const;
const newestFirst = (a: PnlEvent, b: PnlEvent) => b.timeUs - a.timeUs || RANK[a.kind] - RANK[b.kind];

interface LegState { kind: "perp" | "spot"; size: bigint; basis: bigint; basisKnown: boolean }

/** The backward walk. Feed events newest-first, ask for points newest-first;
 * every event after a point must have been fed before the point is asked. */
export class PnlWalker {
  readonly warnings: string[] = [];
  private readonly state = new Map<MarketId, LegState>();
  private pending: PnlEvent[] = [];
  private acc = 0n;
  private flows = 0n;
  private refValue?: bigint;

  constructor(
    legs: PnlLeg[],
    private readonly tickAt: (market: MarketId, timeUs: number) => PnlTick | undefined,
    private readonly refTimeUs: number,
    private readonly accountValueRef?: bigint,
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
      const u = this.unapply(e);
      this.acc += u.pnl;
      this.flows += u.flow;
    }
    const pnl = this.value(t) - this.refValue - this.acc;
    const point: PnlPoint = { time: t / 1000, pnl };
    // Account value is PnL plus every movement that is not PnL.
    if (this.accountValueRef !== undefined) point.accountValue = this.accountValueRef + pnl - this.flows;
    return point;
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

  /** The PnL adjustment and the non-PnL money value carried by the event. */
  private unapply(e: PnlEvent): { pnl: bigint; flow: bigint } {
    if (e.kind === "cash" || e.market === undefined) return { pnl: 0n, flow: e.deltaSize };
    const st = this.state.get(e.market);
    if (!st) throw new Error(`pnlHistory: event on unknown market ${e.market}`);
    const tick = this.tickAt(e.market, e.timeUs);
    const F = tick?.funding ?? 0n;
    const sizeBefore = st.size - e.deltaSize;
    let price = e.price;
    let flow = 0n;

    if (st.kind === "spot") {
      const average = st.size !== 0n && st.basisKnown ? div(st.basis, st.size) : undefined;
      if (e.kind === "withdraw") {
        if (average === undefined) {
          this.warnings.push(`${e.market}: withdrawal at ${e.timeUs} with unknown cost basis, treated as neutral`);
          price = tick?.mark ?? 0n;
        } else price = average;
      }
      if (e.kind === "deposit") price = tick?.mark ?? 0n;
      // Tokens leave at their cost and arrive at the clearing price; either
      // way the value that moved is what the event is priced at.
      if (e.kind === "withdraw" || e.kind === "deposit") flow = mul(price, e.deltaSize);
      if (sizeBefore === 0n) { st.basis = 0n; st.basisKnown = true; }
      else if (e.deltaSize > 0n) st.basis -= mul(price, e.deltaSize);
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
    return { pnl: mul(F - price, e.deltaSize), flow };
  }
}

export function foldPnlHistory(input: PnlFoldInput): PnlHistory {
  const walker = new PnlWalker(input.legs, input.tickAt, input.refTimeUs, input.accountValueRef);
  walker.feed(input.events);
  const points = [...input.gridUs].reverse().map((t) => walker.point(t)).reverse();
  const base = points[0]?.pnl ?? 0n;
  return { points: points.map((p) => ({ ...p, pnl: p.pnl - base })), warnings: walker.warnings };
}

// --- fetch ---

type WireFill = WireFillRow;
type WireSolution = WireSolutionRow;

/** The REST reads, with the `ob_*` JSON-RPC twins behind them for nodes that
 * predate the routes. ponytail: drop the fallback once every network serves
 * /clob/solutions and /clob/fills. */
function reads(rest: PodRestClient, rpcUrl: string, opts: RpcOptions) {
  const missing = (e: unknown) => e instanceof PodHttpError && e.status === 404;
  return {
    async fills(account: Address, q: { fromUs: number; toUs: number; limit: number }): Promise<WireFill[]> {
      try { return await rest.fills(account, q); }
      catch (e) {
        if (!missing(e)) throw e;
        return (await rpc<{ fills: WireFill[] }>(rpcUrl, "ob_getFills", [account, { from_ts: q.fromUs, to_ts: q.toUs, limit: q.limit }], opts)).fills;
      }
    },
    async solutions(q: { orderbook?: MarketId; sinceUs?: number; untilUs?: number; limit?: number }): Promise<WireSolution[]> {
      try { return await rest.solutions(q); }
      catch (e) {
        if (!missing(e)) throw e;
        // Older nodes count rows, not ticks: ask for enough rows to cover every market of one tick.
        return (await rpc<{ solutions: WireSolution[] }>(rpcUrl, "ob_getSolutions", [{ orderbook_id: q.orderbook, since: q.sinceUs, until: q.untilUs, limit: q.orderbook ? q.limit : 200 }], opts)).solutions;
      }
    },
  };
}
type Reads = ReturnType<typeof reads>;

/** Run `fn` over `items` with at most `n` in flight, keeping order. */
async function mapLimit<A, B>(items: A[], n: number, fn: (a: A) => Promise<B>): Promise<B[]> {
  const out = new Array<B>(items.length);
  let next = 0;
  const worker = async () => {
    for (let i = next++; i < items.length; i = next++) out[i] = await fn(items[i] as A);
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

/** Immutable inputs shared by every window size and every refresh: fills as
 * events keyed by the time ranges they cover, and ticks keyed by market and
 * time. The fold is recomputed per request; only uncovered ranges and unseen
 * ticks are fetched. */
export class PnlHistoryCache {
  readonly ticks = new Map<string, PnlTick>();
  /** Times at which every market's row was fetched at once. */
  readonly tickTimes = new Set<number>();
  /** Per market, the latest time known to have no row at or before it. A
   * market has no rows before its first tick, so one empty answer rules out
   * every earlier point without a call. */
  readonly noRowBefore = new Map<MarketId, number>();
  /** Set when a range was cached from a node without the activity feed; the
   * next run that does get flows drops the cache so those ranges are refetched. */
  flowsMissing = false;
  private events: PnlEvent[] = [];
  private coverage: { from: number; to: number }[] = [];

  /** About 150 bytes per event and per tick, so the default cap is on the
   * order of 50 MB with its ticks. */
  constructor(readonly maxEvents = 250_000) {}

  clear(): void {
    this.ticks.clear();
    this.tickTimes.clear();
    this.noRowBefore.clear();
    this.flowsMissing = false;
    this.events = [];
    this.coverage = [];
  }

  /** Whether a tick for the market at the time can exist at all. */
  mayHaveTick(market: MarketId, timeUs: number): boolean {
    return timeUs > (this.noRowBefore.get(market) ?? -1);
  }

  noteEmpty(market: MarketId, timeUs: number): void {
    if (timeUs > (this.noRowBefore.get(market) ?? -1)) this.noRowBefore.set(market, timeUs);
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

  /** Drop a range so it is fetched again. */
  forget(from: number, to: number): void {
    this.events = this.events.filter((e) => e.timeUs < from || e.timeUs >= to);
    this.coverage = this.coverage.flatMap((c) => {
      if (c.to <= from || c.from >= to) return [c];
      const kept: { from: number; to: number }[] = [];
      if (c.from < from) kept.push({ from: c.from, to: from });
      if (c.to > to) kept.push({ from: to, to: c.to });
      return kept;
    });
  }
}

export interface PnlHistoryDeps { rest: PodRestClient; rpcUrl: string; fetch?: typeof fetch; cache?: PnlHistoryCache }

const MAX_POINTS = 500;
// The first chunks are small so the newest points draw after one window's
// fetch; later ones grow to keep the call count down.
const CHUNK_SIZES = [10, 20, 40, 50];
const IN_FLIGHT = 4;
const WIDE_ACCOUNT_MARKETS = 10;
const LOOKUPS_IN_FLIGHT = 24;
const FILLS_PAGE = 500;

/** Pages newest-first. A full page may cut a batch in half, so its oldest
 * batch is dropped and refetched whole with the next page; rows are never
 * keyed, since one order can legitimately fill several times in one batch
 * (ADL slices). */
class FillsCursor {
  done = false;
  readonly warnings: string[] = [];
  private to: number;
  constructor(private readonly reads: Reads, private readonly account: Address, private readonly fromUs: number, toUs: number) {
    this.to = toUs;
  }

  async next(): Promise<WireFill[]> {
    const fills = await this.reads.fills(this.account, { fromUs: this.fromUs, toUs: this.to, limit: FILLS_PAGE });
    if (fills.length < FILLS_PAGE) {
      this.done = true;
      return fills;
    }
    const oldest = Math.min(...fills.map((f) => f.timestamp));
    if (oldest + 1 === this.to) {
      // ponytail: a single batch with more than FILLS_PAGE fills is truncated here.
      this.warnings.push(`batch ${oldest} has more than ${FILLS_PAGE} fills; only the first page is used`);
      this.to = oldest;
      return fills;
    }
    this.to = oldest + 1;
    return fills.filter((f) => f.timestamp !== oldest);
  }
}

async function drainFills(r: Reads, account: Address, fromUs: number, toUs: number): Promise<{ fills: WireFill[]; warnings: string[] }> {
  const cursor = new FillsCursor(r, account, fromUs, toUs);
  const fills: WireFill[] = [];
  while (!cursor.done) fills.push(...(await cursor.next()));
  return { fills, warnings: cursor.warnings };
}

export async function fetchFills(rest: PodRestClient, account: Address, fromUs: number, toUs: number, rpcUrl = "", opts: RpcOptions = {}): Promise<WireFill[]> {
  return (await drainFills(reads(rest, rpcUrl, opts), account, fromUs, toUs)).fills;
}

const FLOW_TYPES = ["backstop", "bridge_transfer", "transfer"] as const;

/** Money movements in [fromUs, toUs) from the activity feed, or `undefined`
 * when the node does not serve it. */
async function drainFlows(rest: PodRestClient, account: Address, fromUs: number, toUs: number): Promise<MoneyActivity[] | undefined> {
  const out: MoneyActivity[] = [];
  let cursor: string | undefined;
  try {
    do {
      const page = await rest.activity(account, { types: [...FLOW_TYPES], from: fromUs / 1000, to: toUs / 1000, limit: 200, cursor });
      for (const e of page.activity) if (e.activityType !== "order") out.push(e);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
  } catch (e) {
    // Only a missing route means the node has no feed. Anything else (a 503,
    // a timeout) must fail the run, or the range would be cached without
    // its flows and every later account value would be wrong and silent.
    if (e instanceof PodHttpError && e.status === 404) return undefined;
    throw e;
  }
  return out;
}

export async function* streamPnlHistory(
  deps: PnlHistoryDeps,
  account: Address,
  q: PnlHistoryQuery,
): AsyncGenerator<PnlHistoryChunk> {
  const rpcOpts: RpcOptions = { fetch: deps.fetch };
  const io = reads(deps.rest, deps.rpcUrl, rpcOpts);

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
  const [markets, snapshot, backstop, withdrawals] = await Promise.all([
    deps.rest.markets(),
    readSnapshot(),
    deps.rest.backstopTransfers(account),
    deps.rest.bridgeWithdrawals(account, { since: q.from * 1000 - 1 }),
  ]);
  const { snap, balances } = snapshot;
  let nowUs = snapshot.nowUs;
  const batchUs = Math.max(500, ...markets.map((m) => m.auctionIntervalMs)) * 1000;
  // Grid points sit on batch ticks so one range call per point serves every market.
  const fromUs = Math.ceil((q.from * 1000) / batchUs) * batchUs;
  if (nowUs === 0) nowUs = (await deps.rest.status()).solutionNow * 1000;

  // The indexer is normally at the engine's tick already, so the first windows
  // are fetched while this checks; if it was behind, the newest window is
  // fetched again once it has caught up.
  const indexerLagged = (async () => {
    let lagged = false;
    for (let i = 0; i < 30 && (await deps.rest.status()).solutionNow * 1000 < nowUs; i++) {
      lagged = true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return lagged;
  })();
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
  const walker = new PnlWalker(legs, (m, t) => ticks.get(key(m, t)), nowUs, snap.accountValue);
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
  type SolutionsQuery = Parameters<Reads["solutions"]>[0];
  // A "newest row at or before t" answer is only right once the indexer has
  // reached t, so no tick lookup goes out before the watermark check resolves.
  // Fills do not wait: the lag retry below fetches the newest window again.
  const solutions = async (queries: SolutionsQuery[]): Promise<WireSolution[][]> => {
    await indexerLagged;
    return mapLimit(queries, LOOKUPS_IN_FLIGHT, (q) => io.solutions(q));
  };
  /** All markets' rows at each tick, one call per tick; skipped before every
   * known market's first tick. */
  const fetchAllAt = async (times: number[]) => {
    const wanted = times.filter((t) => !cache.tickTimes.has(t) && [...known].some((m) => cache.mayHaveTick(m, t)));
    const rows = await solutions(wanted.map((t) => ({ sinceUs: t, untilUs: t + 1, limit: 1 })));
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
    const seen = new Set<string>();
    const wanted = pairs.filter((n) => {
      const k = key(n.market, n.timeUs);
      if (ticks.has(k) || seen.has(k) || !cache.mayHaveTick(n.market, n.timeUs)) return false;
      seen.add(k);
      return true;
    });
    const rows = await solutions(wanted.map((n) => ({ orderbook: n.market, untilUs: n.timeUs + 1, limit: 1 })));
    rows.forEach((rs, i) => {
      const n = wanted[i];
      if (!n) return;
      const r = rs[0];
      if (r) store(r, n.timeUs);
      else cache.noteEmpty(n.market, n.timeUs);
    });
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
    if (!m) { fixed.push({ timeUs: w.timeUs, deltaSize: -w.amount, price: 0n, kind: "cash" }); continue; }
    use(m.id);
    fixed.push({ market: m.id, timeUs: w.timeUs, deltaSize: -w.amount, price: 0n, kind: "withdraw" });
  }
  walker.feed(fixed);
  // Ranges cached from a node without the activity feed hold no flows. If the
  // feed is there now, drop them so this run fetches everything with it.
  if (cache.flowsMissing && (await drainFlows(deps.rest, account, nowUs, nowUs + 1)) !== undefined) {
    cache.flowsMissing = false;
    cache.forget(0, Number.MAX_SAFE_INTEGER);
  }
  // Deposits, transfers and backstop cash sweeps come from the activity feed;
  // withdrawals and sweep legs already arrived above, so those rows are skipped.
  let flowsAvailable = true;
  const toFlowEvents = (rows: MoneyActivity[]): PnlEvent[] => {
    const out: PnlEvent[] = [];
    for (const r of rows) {
      const timeUs = r.timeMs * 1000;
      if (r.activityType === "backstop") {
        if (!r.orderbookId) out.push({ timeUs, deltaSize: -r.cash, price: 0n, kind: "cash" });
        continue;
      }
      if (r.error || (r.activityType === "bridge_transfer" && r.amount < 0n)) continue;
      const m = spotByToken.get(r.token);
      if (!m) { out.push({ timeUs, deltaSize: r.amount, price: 0n, kind: "cash" }); continue; }
      use(m.id);
      out.push({ market: m.id, timeUs, deltaSize: r.amount, price: 0n, kind: r.amount < 0n ? "withdraw" : "deposit" });
    }
    return out;
  };
  const pairsOf = (events: PnlEvent[]) => events.flatMap((e) => (e.market ? [{ market: e.market, timeUs: e.timeUs }] : []));
  const preface = Promise.all([fetchTicks([nowUs]), fetchPairs(pairsOf(fixed))]);

  const toEvent = (f: WireFill): PnlEvent => {
    const base = dec(f.base_amount);
    return { market: f.orderbook_id as MarketId, timeUs: f.timestamp, deltaSize: dec(f.initial_size) < 0n ? -base : base, price: dec(f.price), kind: "fill" };
  };
  // Chunks newest-first. Chunk k needs the events in (oldest_k, oldest_{k−1}],
  // an explicit window, so the next windows load while earlier ones are folded.
  const chunks: number[][] = [];
  const newestFirstGrid = [...gridUs].reverse();
  for (let i = 0, n = 0; i < newestFirstGrid.length; n++) {
    const size = CHUNK_SIZES[Math.min(n, CHUNK_SIZES.length - 1)] ?? 50;
    chunks.push(newestFirstGrid.slice(i, i + size));
    i += size;
  }
  const prep = async (k: number): Promise<{ events: PnlEvent[]; warnings: string[] }> => {
    const pts = chunks[k] ?? [];
    const oldest = pts[pts.length - 1] ?? 0;
    const bound = k === 0 ? nowUs : (chunks[k - 1]?.at(-1) ?? nowUs);
    const warnings: string[] = [];
    await Promise.all(cache.missing(oldest + 1, bound + 1).map(async (r) => {
      const [page, flows] = await Promise.all([drainFills(io, account, r.from, r.to), drainFlows(deps.rest, account, r.from, r.to)]);
      if (flows === undefined) { flowsAvailable = false; cache.flowsMissing = true; }
      cache.add(r.from, r.to, page.fills.map(toEvent).concat(toFlowEvents(flows ?? [])));
      warnings.push(...page.warnings);
    }));
    const events = cache.slice(oldest + 1, bound + 1);
    await Promise.all([fetchTicks(pts), fetchPairs(pairsOf(events))]);
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
    let first = await (queue.shift() as Promise<{ events: PnlEvent[]; warnings: string[] }>);
    if (k === 0 && (await indexerLagged)) {
      cache.forget((chunks[0]?.at(-1) ?? 0) + 1, nowUs + 1);
      first = await prep(0);
    }
    const { events, warnings } = first;
    await preface;
    for (const e of events) if (e.market) use(e.market);
    walker.feed(events);
    const pts = chunks[k] ?? [];
    await fetchPairs(pts.flatMap((t) => [...known].map((market) => ({ market, timeUs: t }))));
    const out = pts.map((t) => walker.point(t)).reverse();
    if (!flowsAvailable) {
      for (const p of out) delete p.accountValue;
      if (k === 0) warnings.push("account value unavailable: the node does not serve the activity feed");
    }
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
  return { points: points.map((p) => ({ ...p, pnl: p.pnl - base })), warnings };
}
