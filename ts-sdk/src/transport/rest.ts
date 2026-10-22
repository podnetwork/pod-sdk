// Layer 1: typed one-shot REST reads of `/clob/*`. Plain fetch so the browser /
// CDN honor the server's Cache-Control; identical concurrent GETs are deduped.
// ms in, decoded (bigint / ms) out.

import type { WireFillRow, WireSolutionRow } from "../types/wire.js";
import type {
  ActivityType, Address, BackstopTransfer, Balances, Bar, BridgeConfig, CandleQuery,
  Market, MarketId, Order, Orderbook, PositionsSnapshot, Resolution, Status,
  Trigger, TxExplorer, Withdrawal, WithdrawalsQuery,
} from "../types/public.js";
import type {
  WireActivityEntry, WireActivityPage, WireBackstopPage, WireBalances, WireBridgeConfig, WireCandlesEnvelope,
  WireMarketStatic, WireMarketStatsPage, WireOrderbook, WireOrdersPage, WirePositionsSnapshot,
  WireStatus, WireTriggersPage, WireWithdrawal, WireWithdrawalsPage,
} from "../types/wire.js";
import {
  decodeBackstopTransfer, decodeBalances, decodeBridgeConfig, decodeCandle,
  decodeMarketDynamics, decodeMarketStatic, decodeOrder, decodeOrderbook, decodePositions,
  decodeStatus, decodeTrigger, decodeWithdrawal,
} from "../codec/decode.js";
import { msToSecs, usToMs } from "../codec/units.js";

export type MarketDynamicsPatch = Partial<Market> & { id: string };

export interface MarketStatsPage {
  solutionNow: number;
  markets: MarketDynamicsPatch[];
}
export interface OrdersPage {
  orders: Order[];
  nextCursor: string | null;
  totalCount: number;
  solutionNow: number;
}
export interface ActivityPage {
  /** Newest first, each batch's entries in the node's order. */
  batches: Array<[batchUs: number, entries: WireActivityEntry[]]>;
  /** Pass back as `toUs` for the next, older page; null when the window is exhausted. */
  nextUs: number | null;
  solutionNow: number; // ms
}
export interface BackstopPage {
  transfers: BackstopTransfer[];
  totalCount: number;
  solutionNow: number;
}
export interface TriggersPage {
  triggers: Trigger[];
  totalCount: number;
  nextCursor: string | null;
}
export interface WithdrawalsPage {
  withdrawals: Withdrawal[];
  timestampUs: number;
}
export interface CandlesPage {
  bars: Bar[]; // oldest-first
  resolution: Resolution;
  range: { from: number; to: number } | null; // ms, oldest->newest bucket returned
  solutionNow: number; // ms (indexer watermark; thread into pod_candles `since`)
}

export interface OrdersQueryRest {
  until?: number; // ms
  limit?: number;
  cursor?: string;
}
export interface ActivityQueryRest {
  types?: ActivityType[];
  fromUs?: number; // inclusive
  toUs?: number; // inclusive
  /** Entries per page, 1..=2000; the newest batch is served whole even past it. */
  limit?: number;
}
export interface TriggersQueryRest {
  orderbook?: MarketId;
  limit?: number;
}

export class PodHttpError extends Error {
  constructor(public status: number, public url: string, message: string) {
    super(message);
    this.name = "PodHttpError";
  }
}

/** 503 from a node whose state has not reached the requested `timestamp`. */
export class PodBehindError extends PodHttpError {
  constructor(url: string, public currentUs: number, public retryAfterMs: number) {
    super(503, url, `GET ${url} -> 503 behind at ${currentUs}`);
    this.name = "PodBehindError";
  }
}

type FetchFn = typeof fetch;

export interface RestClientOptions {
  restUrl: string;
  fetch?: FetchFn;
  /**
   * Per-request timeout (ms, default 15s). A request that never settles is
   * worse than one that fails: it holds its slot in `inflight`, so retries of
   * the same URL join the hang instead of trying again. Cold candle windows on
   * a busy node have taken tens of seconds and then answered in half a second.
   */
  timeoutMs?: number;
}

export class PodRestClient {
  private readonly base: string;
  private readonly fetchFn: FetchFn;
  private readonly timeoutMs: number;
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(opts: RestClientOptions) {
    this.base = opts.restUrl.replace(/\/$/, "");
    this.fetchFn = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = opts.timeoutMs ?? 15_000;
  }

  private async get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    const url = this.buildUrl(path, query);
    const existing = this.inflight.get(url) as Promise<T> | undefined;
    if (existing) return existing;
    const p = this.doGet<T>(url).finally(() => this.inflight.delete(url));
    this.inflight.set(url, p);
    return p;
  }

  private buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
    // Resolve against the page origin so a relative/empty base (same-origin
    // deployment or a dev proxy) works as well as an absolute base.
    const origin = (globalThis as { location?: { origin: string } }).location?.origin;
    const u = origin ? new URL(this.base + path, origin) : new URL(this.base + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) u.searchParams.set(k, String(v));
      }
    }
    return u.toString();
  }

  private async doGet<T>(url: string): Promise<T> {
    const res = await this.fetchFn(url, {
      headers: { accept: "application/json" },
      // `AbortSignal.timeout` everywhere current; omitted rather than polyfilled
      // where it is missing, which only loses the timeout.
      signal: AbortSignal.timeout?.(this.timeoutMs),
    });
    if (!res.ok) {
      let body = "";
      try { body = await res.text(); } catch { /* ignore */ }
      if (res.status === 503) {
        let current: unknown;
        try { current = (JSON.parse(body) as { timestamp?: unknown }).timestamp; } catch { /* not ours */ }
        const retryAfter = Number(res.headers.get("retry-after"));
        if (typeof current === "number") throw new PodBehindError(url, current, retryAfter > 0 ? retryAfter * 1000 : 1000);
      }
      throw new PodHttpError(res.status, url, `GET ${url} -> ${res.status} ${body}`.trim());
    }
    return (await res.json()) as T;
  }

  async status(): Promise<Status> {
    return decodeStatus(await this.get<WireStatus>("/clob/status"));
  }

  async markets(): Promise<Market[]> {
    const w = await this.get<WireMarketStatic[]>("/clob/markets");
    return w.map(decodeMarketStatic);
  }

  async marketStats(opts?: { to?: number }, minTimestampUs?: number): Promise<MarketStatsPage> {
    const w = await this.get<WireMarketStatsPage>("/clob/markets/stats", {
      to: opts?.to !== undefined ? msToSecs(opts.to) : undefined,
      timestamp: minTimestampUs,
    });
    return {
      solutionNow: Math.trunc(w.solution_now / 1000),
      markets: w.markets.map(decodeMarketDynamics),
    };
  }

  async candles(id: MarketId, q: CandleQuery, minTimestampUs?: number): Promise<CandlesPage> {
    const w = await this.get<WireCandlesEnvelope>(`/clob/candles/${id}`, {
      resolution: q.resolution,
      from: q.from !== undefined ? msToSecs(q.from) : undefined,
      to: q.to !== undefined ? msToSecs(q.to) : undefined,
      limit: q.limit,
      timestamp: minTimestampUs,
    });
    return {
      // Wire is newest-first; return oldest-first for chart consumption.
      bars: w.candles.map(decodeCandle).reverse(),
      resolution: w.resolution as Resolution,
      range: w.range ? { from: usToMs(w.range.from_us), to: usToMs(w.range.to_us) } : null,
      solutionNow: usToMs(w.solution_now_us),
    };
  }

  async orders(account: Address, q?: OrdersQueryRest, minTimestampUs?: number): Promise<OrdersPage> {
    const w = await this.get<WireOrdersPage>(`/clob/orders/${account}`, {
      until: q?.until !== undefined ? msToSecs(q.until) : undefined,
      limit: q?.limit,
      cursor: q?.cursor,
      timestamp: minTimestampUs,
    });
    return {
      orders: w.orders.map(decodeOrder),
      nextCursor: w.next_cursor,
      totalCount: w.total_count,
      solutionNow: Math.trunc(w.solution_now / 1000),
    };
  }

  /** One page of an account's activity by batch, newest batches first (ADR 0057 §5); page with `nextUs`. */
  async activity(account: Address, q?: ActivityQueryRest, minTimestampUs?: number): Promise<ActivityPage> {
    const w = await this.get<WireActivityPage>(`/clob/activity/${account}`, {
      activity_types: q?.types?.length ? q.types.join(",") : undefined,
      from: q?.fromUs !== undefined ? String(q.fromUs) : undefined,
      to: q?.toUs !== undefined ? String(q.toUs) : undefined,
      limit: q?.limit,
      timestamp: minTimestampUs,
    });
    const batches = Object.entries(w.activity)
      .map(([batch, entries]): [number, WireActivityEntry[]] => [Number(batch), entries])
      .sort((a, b) => b[0] - a[0]);
    return {
      batches,
      nextUs: w.next === null ? null : Number(w.next),
      solutionNow: usToMs(w.solution_now),
    };
  }

  /** An account's fills with `fromUs ≤ timestamp < toUs`, newest first, at
   * most 500; page by moving `toUs` down to the oldest timestamp seen. */
  async fills(account: Address, q: { fromUs: number; toUs?: number; orderbook?: MarketId; limit?: number }): Promise<WireFillRow[]> {
    const w = await this.get<{ fills: WireFillRow[] }>(`/clob/fills/${account}`, {
      from_us: q.fromUs,
      to_us: q.toUs,
      orderbook: q.orderbook,
      limit: q.limit,
    });
    return w.fills;
  }

  /** Solutions rows, newest first, with `sinceUs ≤ timestamp < untilUs`;
   * `limit` counts ticks, so one tick returns every market's row. */
  async solutions(q: { orderbook?: MarketId; sinceUs?: number; untilUs?: number; limit?: number }): Promise<WireSolutionRow[]> {
    const w = await this.get<{ solutions: WireSolutionRow[] }>(`/clob/solutions`, {
      orderbook: q.orderbook,
      since_us: q.sinceUs,
      until_us: q.untilUs,
      limit: q.limit,
    });
    return w.solutions;
  }

  async backstopTransfers(account: Address): Promise<BackstopPage> {
    const w = await this.get<WireBackstopPage>(`/clob/backstop-transfers/${account}`);
    return {
      transfers: w.backstop_transfers.map(decodeBackstopTransfer),
      totalCount: w.total_count,
      solutionNow: Math.trunc(w.solution_now / 1000),
    };
  }

  async orderbook(id: MarketId, minTimestampUs?: number): Promise<Orderbook> {
    return decodeOrderbook(await this.get<WireOrderbook>(`/clob/orderbook/${id}`, { timestamp: minTimestampUs }));
  }

  /** Perp positions + account aggregates (spot holdings are at `/clob/balances`). */
  async positions(account: Address, minTimestampUs?: number): Promise<PositionsSnapshot> {
    return decodePositions(await this.get<WirePositionsSnapshot>(`/clob/positions/${account}`, { timestamp: minTimestampUs }));
  }

  /** Spot holdings + native cash. */
  async balances(account: Address, minTimestampUs?: number): Promise<Balances> {
    return decodeBalances(await this.get<WireBalances>(`/clob/balances/${account}`, { timestamp: minTimestampUs }));
  }

  /** Flat explorer view of a transaction (fields, receipt, logs, attestations,
   * decoded calldata). Returned as-is (hex fields raw). */
  async transaction(hash: string): Promise<TxExplorer> {
    return this.get<TxExplorer>(`/tx/${hash}`);
  }

  /** Static bridge config: the claim chain, the bridge contract, and every
   * bridged token's L1 address, decimals and withdraw window (ADR 0033 §5).
   * Served unconditionally — it is not behind the CLOB indexer's gate. */
  async bridgeConfig(): Promise<BridgeConfig> {
    return decodeBridgeConfig(await this.get<WireBridgeConfig>("/bridge/config"));
  }

  /**
   * Terminal withdrawal outcomes, newest cursor last. Omit `account` for every
   * account (what a relayer wants); pass one to scope it to a single user.
   *
   * This is the reconnect backfill behind the `pod_withdrawals` subscription:
   * the rows decode to exactly the same shape the stream pushes, so a client
   * cannot tell which one an outcome arrived on. Page with `since` (the tick
   * cursor) plus `sinceId` to resume *inside* a tick that spanned a page.
   */
  async bridgeWithdrawals(account?: Address, q?: WithdrawalsQuery, minTimestampUs?: number): Promise<WithdrawalsPage> {
    const path = account ? `/bridge/withdrawals/${account}` : "/bridge/withdrawals";
    const query = { since: q?.since, since_id: q?.sinceId, limit: q?.limit };
    try {
      // `restUrl` ends in the API version, so this resolves to its v2 sibling.
      const w = await this.get<WireWithdrawalsPage>(`/../v2${path}`, { ...query, timestamp: minTimestampUs });
      return { withdrawals: w.withdrawals.map(decodeWithdrawal), timestampUs: w.timestamp };
    } catch (e) {
      if (!(e instanceof PodHttpError && e.status === 404)) throw e;
    }
    // A node without v2 serves the bare array and has no watermark.
    const rows = await this.get<WireWithdrawal[]>(path, query);
    return { withdrawals: rows.map(decodeWithdrawal), timestampUs: 0 };
  }

  async triggers(account: Address, q?: TriggersQueryRest, minTimestampUs?: number): Promise<TriggersPage> {
    const w = await this.get<WireTriggersPage>(`/clob/triggers/${account}`, {
      orderbook: q?.orderbook,
      limit: q?.limit,
      timestamp: minTimestampUs,
    });
    return {
      triggers: w.triggers.map(decodeTrigger),
      totalCount: w.total_count,
      nextCursor: w.next_cursor,
    };
  }
}
