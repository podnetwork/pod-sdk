import type {
  Address, BackstopTransfer, Balances, LeaderboardPage, LeaderboardQuery, Market, MarketId,
  PositionsSnapshot, Resolution, Status, TimeRange, Trigger, TriggersQuery, TxExplorer, OrdersQuery,
} from "./types/public.js";
import { PodRestClient } from "./transport/rest.js";
import { PodWsClient, type WebSocketCtor } from "./transport/ws.js";
import { BaseResource, combineResources, derivedResource, type Resource } from "./stores/resource.js";
import {
  balancesSource, marketsSource, orderbookSource, positionsSource, statusSource, triggersSource,
  type MarketsCache, type SyncContext,
} from "./sync/sources.js";
import { CandleSeries } from "./sync/candles.js";
import { OrderHistory } from "./sync/orders.js";
import { enrichPositions } from "./sync/positions-live.js";

export interface PodTradeClientOptions {
  restUrl: string;
  wsUrl: string;
  /** Node JSON-RPC HTTP endpoint — needed only for tx features (e.g. mint). */
  rpcUrl?: string;
  fetch?: typeof fetch;
  WebSocket?: WebSocketCtor;
  reconnect?: { maxDelayMs?: number; idleTimeoutMs?: number };
  /** Periodic REST re-alignment for positions (ms). Default 60_000; 0 disables. */
  positionResyncMs?: number;
  /** Periodic REST re-poll of market 24h stats (ms). Default 30_000; 0 disables. */
  marketResyncMs?: number;
  /**
   * Optional persistence for the static markets list (localStorage-backed in a
   * browser), so market-keyed UI mounts instantly on repeat visits. Key it per
   * backend environment — the list differs between them.
   */
  marketsCache?: MarketsCache;
}

interface Destroyable { destroy(): void }

export class PodTradeClient {
  readonly rest: PodRestClient;
  readonly ws: PodWsClient;
  private readonly ctx: SyncContext;
  private readonly cache = new Map<string, Destroyable & object>();
  private readonly rpcUrl?: string;
  private readonly fetchFn?: typeof fetch;

  constructor(opts: PodTradeClientOptions) {
    this.rpcUrl = opts.rpcUrl;
    this.fetchFn = opts.fetch;
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
      marketsCache: opts.marketsCache,
    };
  }

  connect(): void { this.ws.connect(); }

  /**
   * Re-seed an account's cached resources (positions, balances, triggers —
   * and anything derived from them). For out-of-band mutations the streams
   * don't announce (e.g. a mint, or a trigger update — `pod_triggers` only
   * pushes on ticks with order activity); stream-covered state needs no
   * manual refresh. Address-case-insensitive: resources may have been created
   * under a checksummed address while callers pass the wire's lowercase form.
   */
  refresh(account: Address): void {
    const want = new Set(["positions", "balances", "triggers"].map((k) => `${k}:${account.toLowerCase()}`));
    for (const [key, r] of this.cache) {
      if (want.has(key.toLowerCase()) && r instanceof BaseResource) r.refresh();
    }
  }

  /**
   * Faucet mint (test environments where the node sets `minting_allowed`):
   * credit `to` — by default straight into the CLOB — wait for the receipt,
   * then refresh the account's cached resources, since a mint emits no account
   * tick and would otherwise only appear on the next periodic resync. Mint txs
   * are gas-exempt and signer-irrelevant (signed by a one-shot throwaway key
   * inside the SDK), so no wallet or delegation is needed. Requires `rpcUrl`
   * in the client options; the /write entry is loaded on demand.
   */
  async mint(
    to: Address,
    tokens: Array<{ token?: Address; amount: bigint }>,
    opts?: { depositToClob?: boolean; onSubmitted?: (hash: string) => void },
  ): Promise<{ transactionHash: string }> {
    if (!this.rpcUrl) throw new Error("PodTradeClient.mint requires `rpcUrl` in the client options");
    const { mint } = await import("./write/index.js");
    const receipt = await mint({
      rpcUrl: this.rpcUrl,
      to,
      tokens,
      depositToClob: opts?.depositToClob,
      onSubmitted: opts?.onSubmitted,
      fetch: this.fetchFn,
    });
    this.refresh(to);
    return receipt;
  }

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
