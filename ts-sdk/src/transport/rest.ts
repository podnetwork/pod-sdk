// Layer 1: typed one-shot REST reads of `/clob/*`. Plain fetch so the browser /
// CDN honor the server's Cache-Control; identical concurrent GETs are deduped.
// ms in, decoded (bigint / ms) out.

import type {
  Address, BackstopTransfer, Bar, CandleQuery, Market, MarketId, Order,
  Orderbook, PositionsSnapshot, Resolution, Status, Trigger,
} from "../types/public.js";
import type {
  WireBackstopPage, WireCandlesEnvelope, WireMarketStatic, WireMarketStatsPage,
  WireOrderbook, WireOrdersPage, WirePositionsSnapshot, WireStatus,
  WireTriggersPage,
} from "../types/wire.js";
import {
  decodeBackstopTransfer, decodeCandle, decodeMarketDynamics, decodeMarketStatic,
  decodeOrder, decodeOrderbook, decodePositions, decodeStatus, decodeTrigger,
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

type FetchFn = typeof fetch;

export interface RestClientOptions {
  restUrl: string;
  fetch?: FetchFn;
}

export class PodRestClient {
  private readonly base: string;
  private readonly fetchFn: FetchFn;
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(opts: RestClientOptions) {
    this.base = opts.restUrl.replace(/\/$/, "");
    this.fetchFn = opts.fetch ?? globalThis.fetch.bind(globalThis);
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
    const res = await this.fetchFn(url, { headers: { accept: "application/json" } });
    if (!res.ok) {
      let body = "";
      try { body = await res.text(); } catch { /* ignore */ }
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

  async marketStats(opts?: { to?: number }): Promise<MarketStatsPage> {
    const w = await this.get<WireMarketStatsPage>("/clob/markets/stats", {
      to: opts?.to !== undefined ? msToSecs(opts.to) : undefined,
    });
    return {
      solutionNow: Math.trunc(w.solution_now / 1000),
      markets: w.markets.map(decodeMarketDynamics),
    };
  }

  async candles(id: MarketId, q: CandleQuery): Promise<CandlesPage> {
    const w = await this.get<WireCandlesEnvelope>(`/clob/candles/${id}`, {
      resolution: q.resolution,
      from: q.from !== undefined ? msToSecs(q.from) : undefined,
      to: q.to !== undefined ? msToSecs(q.to) : undefined,
      limit: q.limit,
    });
    return {
      // Wire is newest-first; return oldest-first for chart consumption.
      bars: w.candles.map(decodeCandle).reverse(),
      resolution: w.resolution as Resolution,
      range: w.range ? { from: usToMs(w.range.from_us), to: usToMs(w.range.to_us) } : null,
      solutionNow: usToMs(w.solution_now_us),
    };
  }

  async orders(account: Address, q?: OrdersQueryRest): Promise<OrdersPage> {
    const w = await this.get<WireOrdersPage>(`/clob/orders/${account}`, {
      until: q?.until !== undefined ? msToSecs(q.until) : undefined,
      limit: q?.limit,
      cursor: q?.cursor,
    });
    return {
      orders: w.orders.map(decodeOrder),
      nextCursor: w.next_cursor,
      totalCount: w.total_count,
      solutionNow: Math.trunc(w.solution_now / 1000),
    };
  }

  async backstopTransfers(account: Address): Promise<BackstopPage> {
    const w = await this.get<WireBackstopPage>(`/clob/backstop-transfers/${account}`);
    return {
      transfers: w.backstop_transfers.map(decodeBackstopTransfer),
      totalCount: w.total_count,
      solutionNow: Math.trunc(w.solution_now / 1000),
    };
  }

  async orderbook(id: MarketId): Promise<Orderbook> {
    return decodeOrderbook(await this.get<WireOrderbook>(`/clob/orderbook/${id}`));
  }

  async positions(account: Address): Promise<PositionsSnapshot> {
    return decodePositions(await this.get<WirePositionsSnapshot>(`/clob/positions/${account}`));
  }

  async triggers(account: Address, q?: TriggersQueryRest): Promise<TriggersPage> {
    const w = await this.get<WireTriggersPage>(`/clob/triggers/${account}`, {
      orderbook: q?.orderbook,
      limit: q?.limit,
    });
    return {
      triggers: w.triggers.map(decodeTrigger),
      totalCount: w.total_count,
      nextCursor: w.next_cursor,
    };
  }
}
