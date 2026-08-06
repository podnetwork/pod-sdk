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
  | "user_signed" | "liquidation" | "triggered" | "adl" | "adl_counterparty"
  /** A backstop transfer merged into the order feed as a synthetic terminal row. */
  | "backstop_transfer";
export type TriggerType = "take_profit" | "stop_loss";
export type OrderDirection =
  | "buy" | "sell"
  | "open_long" | "add_long" | "reduce_long" | "close_long"
  | "open_short" | "add_short" | "reduce_short" | "close_short"
  | "long_to_short" | "short_to_long" | "liquidation";

/**
 * Why the engine refused something, as a stable identifier to branch on.
 *
 * Open by design: a newer node may report a code this version does not list, so
 * treat an unrecognised one like `"unspecified"` — the accompanying `message` is
 * then all there is. `"unspecified"` itself means the engine has not given that
 * reason a name yet.
 */
export type RejectCode =
  | "insufficient_balance" | "invalid_price" | "zero_size" | "notional_below_minimum"
  | "unknown_market" | "order_not_found" | "not_order_owner" | "stale_nonce"
  | "wrong_pair" | "engine_managed_order" | "price_above_maximum" | "price_off_tick"
  | "market_order_must_be_ioc" | "size_above_maximum" | "size_off_lot"
  | "notional_overflow" | "notional_above_cap" | "unspecified"
  | (string & {});

/**
 * An amendment the engine refused. The order itself is untouched — this is the
 * answer to a price/size change that did not happen.
 *
 * The requested price and size are echoed back because a client may have several
 * amendments outstanding on one order, and they are how it tells which one this
 * answers. Only the latest refusal is kept.
 */
export interface AmendRejection {
  /** The price that was asked for. */
  requestedPrice: bigint;
  /** The size that was asked for, as an unsigned magnitude. */
  requestedSize: bigint;
  /** Branch on this rather than on `message`. */
  code: RejectCode;
  /**
   * Present only when the reason carries detail the code cannot — the amounts on
   * `insufficient_balance`, `invalid_price` and `notional_below_minimum`, the pair on
   * `unknown_market`, and the whole reason on `unspecified`. For every other code the
   * message would just restate the code.
   */
  message?: string;
  /**
   * Who asked. Deliberately not the order's owner: a refusal says nothing about who
   * owns the order, and on `not_order_owner` the requester is precisely who does not.
   * Absent when the stream names a single account.
   */
  requestedBy?: Address;
  /** The batch the refusal landed in (ms). */
  batchMs: number;
}

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
  orderbookId?: MarketId;
  /**
   * Whether the book is spot or perp, when the source said so — REST rows carry it,
   * streamed ones do not. It is static market metadata rather than a fact about the
   * order, so the reliable read is a join: `markets.find((m) => m.id === o.orderbookId)?.type`.
   */
  marketType?: MarketType;
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
  /**
   * The auction deadline the order was signed for (ms). REST only: it is a fact
   * about the intent, not about when the order became real, and the
   * `pod_orders_v2` frame does not carry it. To order orders, use `includedMs` —
   * both sources report that.
   */
  deadlineMs?: number;
  /** TTL expiry (ms). Undefined when the order never expires. */
  endMs?: number;
  /** Batch-inclusion time (ms) — when the order entered the book. */
  includedMs?: number;
  fills: PartialFill[];
  /** Why the engine rejected the order; set only on `status: "invalid"`. */
  rejectReason?: string;
  /**
   * The latest amendment the engine refused for this order, if any. The order is
   * unchanged by it — without this, a refused price change is indistinguishable from
   * one still in flight.
   */
  amendRejected?: AmendRejection;
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
  /** TTL expiry (ms). Undefined when the trigger never expires. */
  endMs?: number;
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

// --- explorer (`/tx/{hash}`) ---

export interface TxAttestation {
  validator_address: string;
  sequence_number: number;
  batch_index?: number;
  timestamp: number; // microseconds
  signature: string;
}

/** Pre-decoded calldata: `{contract, function, args}` plus curation
 * (order_id, submitBatch sub-intents, ERC20 symbol …). */
export interface TxDecoded {
  contract: string;
  function: string;
  args: Record<string, unknown>;
  order_id?: string;
  [k: string]: unknown;
}

/** Flat explorer view of a transaction. Hex fields are raw RPC encodings —
 * format them at the edge. Extra fields are tolerated (index signature). */
export interface TxExplorer {
  hash: string;
  type: string;
  nonce: string;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasUsed: string;
  status: string; // "0x1" success, "0x0" reverted
  input: string;
  logs: unknown[];
  decoded?: TxDecoded | null;
  attestations: TxAttestation[];
  committee_epoch?: number;
  chainId?: string;
  maxFeePerGas?: string;
  effectiveGasPrice?: string;
  blockNumber?: string;
  transactionIndex?: string;
  contractAddress?: string | null;
  [k: string]: unknown;
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
