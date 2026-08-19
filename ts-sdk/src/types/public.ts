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
 * answers.
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

/** What the engine did to an order, as `pod_orders_v2` reports it (ADR 0029 §3). */
export type OrderEventKind =
  | "new" | "reject" | "fill" | "cancel" | "expire" | "modify" | "modify_reject";

/**
 * The statuses an order can *close* with. Narrower than `OrderStatus`, which also
 * covers the states a live order passes through — so a `switch` over this one can be
 * exhaustive.
 */
export type TerminalStatus = Extract<OrderStatus, "filled" | "canceled" | "margin_canceled" | "expired">;

/** One fill, plus the status it closed the order with when it did. */
export interface OrderEventFill extends PartialFill {
  /**
   * Base filled over the order's life **as of this fill**.
   *
   * Not the same as `order.filledBase`, which is where the *whole frame* left the order:
   * two fills of one order in one batch would otherwise both report the final total,
   * so neither matches the fill it is attached to.
   */
  totalBase: bigint;
  /**
   * Absent while the order is still working.
   *
   * `margin_canceled` here is the engine evicting the order for margin, reported on the
   * fill that closed it. An eviction that closes an order *without* a fill arrives as a
   * plain `cancel` instead: the wire cannot yet distinguish it from a user cancel (ADR
   * 0029 §6 reserves a `why` for that), so do not try to re-derive it from `status`.
   */
  closedAs?: TerminalStatus;
}

/**
 * One transition the stream reported.
 *
 * The alternative is diffing consecutive snapshots, which can only see net state: two
 * fills in one batch collapse into one change, a fill that closes an order hides the
 * partial, and a transition that changes nothing about the order — a refused amendment
 * — is invisible without a synthetic marker to spot it by.
 *
 * Deliberately lean. `order` is the row as the whole frame left it, so durable state a
 * transition leaves behind is read from there — a `reject`'s `rejectReason` annotates the
 * `invalid` status it set. Detail that belongs to the transition itself, and describes
 * nothing about the order afterwards, is on the event: `fill`, and `amendRejection`.
 */
export interface OrderEvent {
  kind: OrderEventKind;
  /**
   * The order it happened to, as the whole frame left it.
   *
   * A live row, not a copy: the stream mutates it in place as later frames arrive. Read
   * it in the callback, and copy it if you keep it — a buffered event would otherwise
   * show the order's present state rather than its state at the time.
   */
  order: Order;
  /** The batch it landed in (ms). */
  batchMs: number;
  /** `fill` only: this fill alone, not a running total. */
  fill?: OrderEventFill;
  /**
   * `modify_reject` only: the amendment the engine refused.
   *
   * On the event rather than on `order`, because the order is exactly what it is not
   * about — a refusal changes nothing about it. Parked on the entity it would be
   * write-once and never cleared, so an order would keep reporting a refusal it had
   * long since amended past, and only when the row came from this stream rather than
   * from REST.
   */
  amendRejection?: AmendRejection;
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

// --- bridge / withdrawals (ADR 0033) ---

/**
 * One bridged token, as `GET /v1/bridge/config` serves it.
 *
 * `min`, `max` and `decimals` are all on the **claim chain's** terms, not pod's
 * 18 — see `codec/bridge.ts`, which owns that conversion.
 */
export interface BridgeToken {
  podToken: Address;
  l1Token: Address;
  /** Decimals on the claim chain, and so the withdrawal granularity on pod. */
  decimals: number;
  /** Smallest admissible withdrawal, in claim-chain decimals. */
  min: bigint;
  /** Largest admissible withdrawal, in claim-chain decimals. */
  max: bigint;
}

/** Static bridge configuration — the one chain pod withdrawals settle on. */
export interface BridgeConfig {
  /** `0` when the node has no bridge configured, in which case `tokens` is
   * empty and no withdrawal is admissible at all. */
  claimChainId: number;
  /** The bridge contract on the claim chain, where `Claim` is emitted. */
  sourceContract: Address;
  /** Bridge version; feeds the claim-hash domain separator. */
  version: number;
  tokens: BridgeToken[];
}

/**
 * Why a withdrawal produced no L1 claim. Any value here means **no L1 event will
 * ever fire**, so a client watching only the claim chain would wait forever —
 * this is the only place a reason exists.
 */
export type WithdrawalError =
  /** The CLOB balance did not cover it at execution. Admission deliberately
   * doesn't check the balance (pending fills can raise it), so this races that. */
  | "insufficient_balance"
  /** The solver never included the intent before its deadline. Funds are
   * untouched and the withdrawal can simply be resubmitted. */
  | "not_included"
  /**
   * Any other reason a node reports. This set is **open by construction**: the
   * node's reason enum is explicitly extensible and an app ships ahead of the
   * fleet, so a spelling this build predates has to arrive verbatim rather than
   * be dropped. Dropping it makes a *failed* withdrawal read as claimable —
   * the one direction it is unsafe to be lossy in, because the caller then
   * reports success and waits for a claim that can never land.
   *
   * `(string & {})` keeps the two known values in editor completion while still
   * admitting the rest. Treat an unknown reason exactly like a known one, and
   * show it verbatim rather than guessing which known reason it resembles.
   */
  | (string & {});

/** One terminal withdrawal outcome, from `pod_withdrawals` or its REST backfill. */
export interface Withdrawal {
  /** `keccak(abi.encode(signer, nonce, sequence))` — derivable client-side
   * before submitting, which is what lets a client match its own withdrawal. */
  id: Hash;
  /** The debited account: the master, for a delegated withdrawal. */
  withdrawer: Address;
  /** Recipient on the **claim chain**. Nothing is credited on pod. */
  to: Address;
  /** Pod-side token address. */
  token: Address;
  /** Pod's 18 decimals, as signed. The L1 claim carries this converted to the
   * token's claim-chain decimals — never pass this value to `claim`. */
  amount: bigint;
  /** Absent when the withdrawal is claimable on L1. */
  error?: WithdrawalError;
  /**
   * The tick's batch deadline, in **microseconds** — not the millisecond
   * convention the rest of this surface uses.
   *
   * Deliberate: this value is also the resume cursor for `pod_withdrawals` and
   * for the REST backfill, both of which compare it in micros. Narrowing it to
   * ms and back would round a tick boundary and silently re-serve or skip a
   * tick, so it stays in the unit the server compares.
   */
  timeUs: number;
}

export interface WithdrawalsQuery {
  /** Batch deadline in microseconds; strictly greater. */
  since?: number;
  /** Last id already seen *within* the `since` tick, to resume mid-tick. */
  sinceId?: Hash;
  /** Server default 500, capped at 1000. */
  limit?: number;
}
