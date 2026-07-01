import type {
  Address, BackstopTransfer, Balances, LeaderboardPage, LeaderboardQuery, Market, MarketId,
  PositionsSnapshot, Resolution, Status, TimeRange, Trigger, TriggersQuery, TxExplorer, OrdersQuery,
} from "./types/public.js";
import { PodRestClient } from "./transport/rest.js";
import { PodWsClient, type WebSocketCtor } from "./transport/ws.js";
import { BaseResource, combineResources, derivedResource, type Resource } from "./stores/resource.js";
import {
  balancesSource, marketsSource, orderbookSource, positionsSource, statusSource, triggersSource,
  type SyncContext,
} from "./sync/sources.js";
import { CandleSeries } from "./sync/candles.js";
import { OrderHistory } from "./sync/orders.js";
import { enrichPositions } from "./sync/positions-live.js";

export interface PodTradeClientOptions {
  restUrl: string;
  wsUrl: string;
  fetch?: typeof fetch;
  WebSocket?: WebSocketCtor;
  reconnect?: { maxDelayMs?: number; idleTimeoutMs?: number };
  /** Periodic REST re-alignment for positions (ms). Default 60_000; 0 disables. */
  positionResyncMs?: number;
  /** Periodic REST re-poll of market 24h stats (ms). Default 30_000; 0 disables. */
  marketResyncMs?: number;
}

interface Destroyable { destroy(): void }

export class PodTradeClient {
  readonly rest: PodRestClient;
  readonly ws: PodWsClient;
  private readonly ctx: SyncContext;
  private readonly cache = new Map<string, Destroyable & object>();

  constructor(opts: PodTradeClientOptions) {
    this.rest = new PodRestClient({ restUrl: opts.restUrl, fetch: opts.fetch });
    this.ws = new PodWsClient({
      wsUrl: opts.wsUrl,
      WebSocket: opts.WebSocket,
      maxDelayMs: opts.reconnect?.maxDelayMs,
      idleTimeoutMs: opts.reconnect?.idleTimeoutMs,
    });
    this.ctx = {
      rest: this.rest,
      ws: this.ws,
      positionResyncMs: opts.positionResyncMs ?? 60_000,
      marketResyncMs: opts.marketResyncMs ?? 30_000,
    };
  }

  connect(): void { this.ws.connect(); }

  close(): void {
    for (const r of this.cache.values()) r.destroy();
    this.cache.clear();
    this.ws.close();
  }

  private memo<T extends Destroyable & object>(key: string, make: () => T): T {
    const hit = this.cache.get(key);
    if (hit) return hit as T;
    const made = make();
    this.cache.set(key, made);
    return made;
  }

  get status(): Resource<Status> {
    return this.memo("status", () => new BaseResource(statusSource(this.ctx)));
  }

  get markets(): Resource<Market[]> {
    return this.memo("markets", () => new BaseResource(marketsSource(this.ctx)));
  }

  market(id: MarketId): Resource<Market> {
    return this.memo(`market:${id}`, () =>
      derivedResource(this.markets, (list) => list?.find((m) => m.id === id)) as BaseResource<Market>,
    );
  }

  orderbook(id: MarketId, opts?: { depth?: number }): Resource<import("./types/public.js").Orderbook> {
    const depth = opts?.depth;
    return this.memo(`orderbook:${id}:${depth ?? ""}`, () =>
      new BaseResource(orderbookSource(this.ctx, id, depth)),
    );
  }

  positions(account: Address): Resource<PositionsSnapshot> {
    return this.memo(`positions:${account}`, () =>
      new BaseResource(positionsSource(this.ctx, account)),
    );
  }

  /**
   * Positions with mark-driven fields (uPnL, notional, equity, account value,
   * withdrawable) kept live off the market stream between snapshots, and
   * re-aligned to the backend on every snapshot / periodic REST resync.
   */
  livePositions(account: Address): Resource<PositionsSnapshot> {
    return this.memo(`livePositions:${account}`, () => {
      const positions = this.positions(account);
      const markets = this.markets;
      return combineResources([positions, markets], () => {
        const snap = positions.get();
        if (!snap) return undefined;
        return enrichPositions(snap, markets.get() ?? []);
      }) as BaseResource<PositionsSnapshot>;
    });
  }

  triggers(account: Address, _query?: TriggersQuery): Resource<Trigger[]> {
    return this.memo(`triggers:${account}`, () =>
      new BaseResource(triggersSource(this.ctx, account)),
    );
  }

  /** Live spot holdings + native cash. */
  balances(account: Address): Resource<Balances> {
    return this.memo(`balances:${account}`, () =>
      new BaseResource(balancesSource(this.ctx, account)),
    );
  }

  /** Leaderboard (ranked accounts by net PnL). One-shot REST; paginate via
   * `{ limit, offset }`. Not a stream — call again to refresh. */
  leaderboard(query?: LeaderboardQuery): Promise<LeaderboardPage> {
    return this.rest.leaderboard(query);
  }

  /** Explorer view of a transaction by hash. One-shot. */
  transaction(hash: string): Promise<TxExplorer> {
    return this.rest.transaction(hash);
  }

  backstopTransfers(account: Address): Resource<BackstopTransfer[]> {
    return this.memo(`backstop:${account}`, () =>
      new BaseResource<BackstopTransfer[]>((h) => {
        let alive = true;
        this.rest.backstopTransfers(account)
          .then((p) => { if (alive) h.set(p.transfers); })
          .catch((e) => h.fail(e));
        return () => { alive = false; };
      }),
    );
  }

  candles(id: MarketId, resolution: Resolution, range?: TimeRange): CandleSeries {
    const series = this.memo(`candles:${id}:${resolution}`, () =>
      new CandleSeries(this.ctx, id, resolution, range),
    );
    if (range) series.setWindow(range);
    return series;
  }

  orders(account: Address, query?: OrdersQuery): OrderHistory {
    const key = `orders:${account}:${query ? JSON.stringify(query) : ""}`;
    return this.memo(key, () => new OrderHistory(this.ctx, account, query));
  }
}
