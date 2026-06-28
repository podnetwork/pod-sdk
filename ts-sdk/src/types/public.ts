// Decoded, consumer-facing types. All monetary values are `bigint` (1e18-scaled
// unless a token's own decimals are noted); all timestamps are milliseconds.

export type Hex = `0x${string}`;
export type MarketId = Hex;
export type Address = Hex;
export type Hash = Hex;

export type Resolution =
  | "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1W" | "1M";

/** Inclusive-from, exclusive-to time window in milliseconds. `to` defaults to now. */
export interface TimeRange {
  from: number;
  to?: number;
}

export type MarketType = "spot" | "perp";
export type OrderSide = "buy" | "sell";
export type OrderType = "limit" | "market";
export type OrderStatus =
  | "pending" | "active" | "filled" | "expired"
  | "canceled" | "margin_canceled" | "invalid";
export type OrderKind =
  | "user_signed" | "liquidation" | "triggered" | "adl" | "adl_counterparty";
export type TriggerType = "take_profit" | "stop_loss";
export type OrderDirection =
  | "buy" | "sell"
  | "open_long" | "add_long" | "reduce_long" | "close_long"
  | "open_short" | "add_short" | "reduce_short" | "close_short"
  | "long_to_short" | "short_to_long" | "liquidation";

export interface TokenInfo {
  address: Address;
  symbol: string;
  name: string;
}

export interface Market {
  id: MarketId;
  name: string; // "BASE/QUOTE"
  type: MarketType;
  base: TokenInfo;
  quote: TokenInfo;
  tickPrecision: bigint;
  lotSize: bigint;
  maxLeverage: number;
  fundingWindowUs: number; // funding-accrual divisor (micros)
  makerFee: bigint;
  takerFee: bigint;
  auctionIntervalMs: number;
  // --- live dynamics (undefined until first stats seed / tick) ---
  lastClearingPrice?: bigint;
  volume24h?: bigint;
  high24h?: bigint;
  low24h?: bigint;
  priceChange24hBps?: number;
  // --- perpetual-only dynamics ---
  oraclePrice?: bigint;
  markPrice?: bigint;
  fundingRate?: bigint;
  fundingIndex?: bigint;
  fundingLastUpdatedMs?: number;
  openInterest?: bigint;
}

export interface Bar {
  time: number; // bucket start, ms
  open: bigint;
  high: bigint;
  low: bigint;
  close: bigint;
  volume: bigint; // base volume
  quoteVolume: bigint; // quote (USD) notional
}

export interface OrderbookLevel {
  price: bigint;
  volume: bigint; // size resting at this level
  total: bigint; // cumulative size from the best price through this level
  /** `total` as a 0..1 fraction of this side's full depth (deepest level → 1).
   * Use directly as a depth-bar width. */
  depth: number;
}

export interface Orderbook {
  id: MarketId;
  timeMs: number;
  clearingPrice?: bigint;
  bids: OrderbookLevel[]; // descending price (best first)
  asks: OrderbookLevel[]; // ascending price (best first)
  /** (bestBid + bestAsk) / 2; undefined if a side is empty. */
  mid?: bigint;
  /** bestAsk − bestBid (absolute). */
  spread?: bigint;
  /** spread as a percentage of mid. */
  spreadPct?: number;
  bidCount: number;
  askCount: number;
  groupingPrecision: bigint;
  // perpetual-only
  oraclePrice?: bigint;
  fundingRate?: bigint;
  fundingIndex?: bigint;
  fundingLastUpdatedMs?: number;
}

export interface PartialFill {
  base: bigint;
  quote: bigint;
  price: bigint;
  time: number;
}

export interface Order {
  id: Hash;
  txHash: Hash;
  orderbookId?: MarketId; // REST orders; WS stream orders carry `pair` instead
  marketType?: MarketType;
  /** Token-address pair (base/quote); present on WS stream orders. */
  pair?: { base: Address; quote: Address };
  side: OrderSide;
  orderType: OrderType;
  status: OrderStatus;
  kind: OrderKind;
  nonce: number;
  bidder: Address;
  price: bigint;
  initialSize: bigint; // signed: + buy/long, - sell/short
  filledBase: bigint;
  filledQuote: bigint;
  fee: bigint;
  effectivePrice?: bigint;
  deadlineMs: number;
  endMs: number;
  fills: PartialFill[];
  // perpetual-only
  reduceOnly?: boolean;
  ioc?: boolean;
  direction?: OrderDirection;
  triggerType?: TriggerType;
}

export type Position = SpotPosition | PerpPosition;

export interface SpotPosition {
  kind: "spot";
  orderbookId?: MarketId;
  token: Address;
  balance: bigint;
  freeBalance: bigint;
  lockedBalance: bigint;
  costBasis: bigint;
  markPrice: bigint;
  unrealizedPnl: bigint;
  realizedPnl: bigint;
}

export interface PerpPosition {
  kind: "perp";
  orderbookId: MarketId;
  side: "long" | "short";
  size: bigint; // signed
  notional: bigint;
  entryPrice: bigint;
  markPrice: bigint;
  margin: bigint;
  leverage: number;
  fundingAccrued: bigint;
  /** Funding accumulator at entry; with the live fundingIndex + fundingWindowUs, recompute fundingAccrued. */
  entryFunding: bigint;
  liquidationPrice: bigint;
  unrealizedPnl: bigint;
  realizedPnl: bigint;
}

export interface PositionsSnapshot {
  positions: Position[];
  totalUnrealizedPnl: bigint;
  totalRealizedPnl: bigint;
  perpsEquity: bigint;
  accountValue: bigint;
  cash: bigint;
  withdrawableCash: bigint;
}

export interface Trigger {
  orderbookId: MarketId;
  orderId: Hash;
  txHash: Hash;
  bidder: Address;
  nonce: number;
  size: bigint; // signed
  limitPrice: bigint;
  triggerPrice: bigint;
  triggerType: TriggerType;
  reduceOnly: boolean;
  ioc: boolean;
  deadlineMs: number;
  endMs: number;
}

export interface BackstopTransfer {
  orderbookId?: MarketId;
  size: bigint; // signed
  cash: bigint;
  markPrice: bigint;
  equity: bigint;
  time: number;
}

export interface Status {
  /** Newest indexed solution time (the settled watermark), in ms. */
  solutionNow: number;
}

/** A spot token holding (`/clob/balances`). Like SpotPosition but identified by
 * market + symbols rather than token address. */
export interface SpotHolding {
  orderbookId: MarketId;
  baseSymbol: string;
  quoteSymbol: string;
  balance: bigint; // free + locked
  freeBalance: bigint;
  lockedBalance: bigint;
  costBasis: bigint;
  markPrice: bigint;
  unrealizedPnl: bigint;
  realizedPnl: bigint;
}

/** Spot holdings + native cash for an account (`/clob/balances`). Perp positions
 * and their aggregates live in {@link PositionsSnapshot}. */
export interface Balances {
  holdings: SpotHolding[];
  cash: bigint;
  withdrawableCash: bigint;
  netDeposits: bigint;
}

/** One ranked account from the leaderboard (`/clob/leaderboard`). */
export interface LeaderboardEntry {
  rank: number; // 1-based position in the full ordering
  account: Address;
  accountValue: bigint;
  unrealizedPnl: bigint;
  realizedPnl: bigint;
  /** Net PnL = unrealized + realized — the key the board is ranked by. */
  pnl: bigint;
  /** pnl / (accountValue − unrealized) × 100; 0 when the basis is dust. */
  pnlPercent: number;
}

export interface LeaderboardPage {
  entries: LeaderboardEntry[];
  /** Full count of ranked accounts (before paging) — for page math. */
  total: number;
}

export interface LeaderboardQuery {
  limit?: number;
  offset?: number;
  /** When set, the response also locates this account's own rank. */
  account?: Address;
}

// --- query / paging types ---

export interface CandleQuery {
  resolution: Resolution;
  from?: number; // ms
  to?: number; // ms
  limit?: number;
}

export interface OrdersQuery {
  status?: OrderStatus;
  orderbookId?: MarketId;
  limit?: number;
}

export interface TriggersQuery {
  orderbookId?: MarketId;
  limit?: number;
}
