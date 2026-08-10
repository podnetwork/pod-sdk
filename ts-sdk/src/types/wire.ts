// Raw JSON shapes exactly as the indexer emits them (REST `/clob/*` and the
// `pod_*` WebSocket channels). snake_case; numerics are 1e18-scaled decimal
// strings; timestamps are microseconds (in `*_us` fields, or bare on candle/
// orderbook). Decoders in ../codec/decode.ts convert these to ../types/public.

import type { Hex, OrderEventKind } from "./public.js";

export type WireDecimal = string; // 1e18-scaled integer as a decimal string

export interface WireStatus {
  solution_now: number; // micros
}

export interface WireMarketStatic {
  id: Hex;
  name: string;
  base_token_address: Hex;
  quote_token_address: Hex;
  base_token_symbol: string;
  quote_token_symbol: string;
  base_token_name: string;
  quote_token_name: string;
  market_type: "spot" | "perp";
  auction_interval_us: number;
  maker_fee: WireDecimal;
  taker_fee: WireDecimal;
  tick_precision: WireDecimal; // 1e18-scaled price increment (decimal string)
  lot_size: WireDecimal;
  max_leverage: number;
  funding_window_us: number; // funding-accrual divisor (micros)
}

export interface WireMarketDynamics {
  orderbook_id: Hex;
  last_clearing_price: WireDecimal;
  volume_24h: WireDecimal;
  high_24h: WireDecimal;
  low_24h: WireDecimal;
  price_change_24h: number; // bps
  oracle_price?: WireDecimal | null;
  mark_price?: WireDecimal | null;
  funding_rate?: WireDecimal | null;
  funding_index?: WireDecimal | null;
  funding_last_updated_us?: number | null;
  open_interest?: WireDecimal | null;
}

/** pod_markets push uses `orderbook` instead of `orderbook_id`. */
export interface WireMarketDynamicsPush extends Omit<WireMarketDynamics, "orderbook_id"> {
  orderbook: Hex;
}

export interface WireMarketStatsPage {
  solution_now: number;
  markets: WireMarketDynamics[];
}

export interface WireCandle {
  timestamp: number; // micros
  open: WireDecimal;
  close: WireDecimal;
  high: WireDecimal;
  low: WireDecimal;
  volume: WireDecimal;
  quote_volume: WireDecimal;
}

/** GET /clob/candles envelope: candles + continuation metadata. */
export interface WireCandlesEnvelope {
  candles: WireCandle[]; // newest-first
  resolution: string;
  range: { from_us: number; to_us: number } | null; // oldest->newest bucket returned
  solution_now_us: number; // indexer's newest indexed deadline
}

/** pod_candles per-tick hint. */
export interface WireCandleTick {
  orderbook: Hex;
  timestamp_us: number;
  price: WireDecimal;
  volume: WireDecimal;
}

export interface WirePartialFill {
  base_amount: WireDecimal;
  quote_amount: WireDecimal;
  timestamp: number; // micros
  price: WireDecimal;
}

export interface WireOrder {
  orderbook_id?: Hex;
  /** The order endpoints say "perpetual" where `/clob/markets` says "perp". */
  market_type?: "spot" | "perp" | "perpetual";
  kind: string;
  order_id: Hex;
  tx_hash: Hex;
  bidder: Hex;
  nonce: number;
  order_type: "limit" | "market";
  status: string;
  price: WireDecimal;
  initial_size: WireDecimal; // signed
  filled_base_amount: WireDecimal;
  filled_quote_amount: WireDecimal;
  fee: WireDecimal;
  deadline: number | string; // micros
  end: number | string; // micros
  included_batch?: number | string; // micros; batch-inclusion time (REST order history)
  effective_price?: WireDecimal | null;
  fills?: WirePartialFill[];
  side?: "buy" | "sell";
  reduce_only?: boolean;
  ioc?: boolean;
  direction?: string;
  grouping?: WireDecimal;
  trigger_type?: string | null;
}

export interface WireOrdersPage {
  orders: WireOrder[];
  next_cursor: string | null;
  total_count: number;
  solution_now: number;
}

export interface WireTickSnapshot {
  volume: WireDecimal;
}

export interface WireOrderbook {
  orderbook_id?: Hex;
  clob_id?: Hex;
  buys: Record<string, WireTickSnapshot>; // decimal price string -> tick
  sells: Record<string, WireTickSnapshot>;
  buys_count: number;
  sells_count: number;
  grouping_precision: WireDecimal;
  timestamp: number; // micros
  new_orders_count: number;
  clearing_price?: WireDecimal | null;
  oracle_price?: WireDecimal | null;
  funding_rate?: WireDecimal | null;
  funding_index?: WireDecimal | null;
  funding_last_updated?: number | null;
}

export interface WireSpotPosition {
  kind: "spot";
  orderbook_id?: Hex;
  token: Hex;
  balance: WireDecimal;
  free_balance: WireDecimal;
  locked_balance: WireDecimal;
  cost_basis: WireDecimal;
  mark_price: WireDecimal;
  unrealized_pnl: WireDecimal;
  realized_pnl: WireDecimal;
}

export interface WirePerpPosition {
  kind: "perp";
  orderbook_id: Hex;
  side: "long" | "short";
  size: WireDecimal;
  notional: WireDecimal;
  entry_price: WireDecimal;
  mark_price: WireDecimal;
  margin: WireDecimal;
  leverage: WireDecimal;
  funding_accrued: WireDecimal;
  entry_funding: WireDecimal;
  liquidation_price: WireDecimal;
  unrealized_pnl: WireDecimal;
  realized_pnl: WireDecimal;
}

export type WirePosition = WireSpotPosition | WirePerpPosition;

export interface WirePositionsSnapshot {
  positions: WirePosition[];
  total_unrealized_pnl: WireDecimal;
  total_realized_pnl: WireDecimal;
  perps_equity: WireDecimal;
  account_value: WireDecimal;
  cash: WireDecimal;
  withdrawable_cash: WireDecimal;
}

export interface WireSpotHolding {
  orderbook_id: Hex;
  base_symbol: string;
  quote_symbol: string;
  balance: WireDecimal;
  free_balance: WireDecimal;
  locked_balance: WireDecimal;
  cost_basis: WireDecimal;
  mark_price: WireDecimal;
  unrealized_pnl: WireDecimal;
  realized_pnl: WireDecimal;
}

export interface WireBalances {
  balances: WireSpotHolding[];
  cash: WireDecimal;
  withdrawable_cash: WireDecimal;
  net_deposits: WireDecimal;
}

/** `/clob/leaderboard` (and RPC ob_getRankedPositions) share this shape. Only
 * the aggregate PnL fields of each account's positions block are read. */
export interface WireRankedAccount {
  account: Hex;
  positions: {
    total_unrealized_pnl: WireDecimal;
    total_realized_pnl: WireDecimal;
    account_value: WireDecimal;
  };
}

export interface WireLeaderboard {
  ranked: WireRankedAccount[];
  total: number;
}

export interface WireTrigger {
  orderbook_id: Hex;
  order_id: Hex;
  tx_hash: Hex;
  bidder: Hex;
  nonce: number;
  size: WireDecimal; // signed
  limit_price: WireDecimal;
  trigger_price: WireDecimal;
  trigger_type: string;
  reduce_only: boolean;
  ioc: boolean;
  deadline: number | string;
  end: number | string;
}

export interface WireTriggersPage {
  triggers: WireTrigger[];
  total_count: number;
  next_cursor: string | null;
}

export interface WireBackstopTransfer {
  orderbook_id?: Hex;
  size: WireDecimal;
  cash: WireDecimal;
  mark_price: WireDecimal;
  equity: WireDecimal;
  timestamp_us: number;
}

export interface WireBackstopPage {
  backstop_transfers: WireBackstopTransfer[];
  total_count: number;
  solution_now: number;
}

// --- pod_orders_v2 push (ADR 0029) ---
//
// One notification is one frame: everything that happened to one orderbook in one
// auction batch. The book and the batch are named once, orders created in the
// batch appear once in `orders`, and `events` are transitions referencing them.
// Optional fields are omitted at their default rather than sent, so each absence
// means something specific — noted per field.

export interface WireOrdersFrame {
  /** The orderbook these actions happened on; constant for the frame. */
  book: Hex;
  /** Deadline (micros) of the batch the actions **landed in**. Half of the resume cursor; `book` is the other half. */
  batch: number;
  /**
   * Owner addresses, indexed by `orders[].a` and by events that name an order by
   * `id`. Omitted when the subscription names exactly one account — decode on
   * this field, not on the filter that was sent.
   */
  accts?: Hex[];
  orders: WireOrderEntity[];
  events: WireOrderEvent[];
}

/** An order as admitted: the facts that do not change. Its status is implied by the events. */
export interface WireOrderEntity {
  id: Hex;
  /** Creating transaction, or its parent `submitBatch` envelope. */
  tx: Hex;
  /** Index into the frame's `accts`; present iff `accts` is. */
  a?: number;
  n: number;
  px: WireDecimal;
  /** Signed size: the sign carries the side, so there is no side field. */
  sz: WireDecimal;
  /** TTL expiry (micros). **Omitted means the order never expires.** */
  end?: number;
  /** **Omitted means user-signed.** */
  kind?: string;
  /** **Omitted means a limit order.** */
  type?: "market";
  /** Omitted means false. */
  reduce_only?: boolean;
  /** Omitted means false. */
  ioc?: boolean;
  /** Omitted unless the order is a fired trigger's synthetic. */
  trigger?: string;
  /** Omitted when ungrouped. */
  grouping?: string;
}

/**
 * One transition, discriminated by `k`. Every event names its order by exactly
 * one of `o` (an index into this frame's `orders`) or `id` (resting from an
 * earlier batch, owned by `accts[a]`).
 *
 * Kinds are open: unknown values of `k` must be ignored rather than rejected, so
 * this is a plain shape with per-kind optional fields rather than a union that
 * would make an unrecognised kind unrepresentable.
 */
export interface WireOrderEvent {
  k: OrderEventKind | (string & {});
  o?: number;
  id?: Hex;
  a?: number;
  /** `reject`: why the engine dropped the order. `modify_reject`: detail the `code` cannot carry. */
  why?: string;
  /**
   * `modify_reject`: index into `accts` for the account that *asked*, which is not
   * necessarily the order's owner — hence not `a`. On `not_order_owner` the requester
   * is precisely who does not own it.
   */
  by?: number;
  /** `modify_reject`: the price that was asked for. */
  req_px?: WireDecimal;
  /** `modify_reject`: the size that was asked for, unsigned. */
  req_sz?: WireDecimal;
  /** `modify_reject`: the stable reason identifier — branch on this, not on `why`. */
  code?: string;
  /** `fill`: base filled by **this** fill. */
  b?: WireDecimal;
  /** `fill`: quote filled by this fill. */
  q?: WireDecimal;
  /**
   * Total base filled over the order's life so far.
   *
   * Carried by `fill`, `cancel` and `expire` alike (ADR 0029 §4.1): a terminated
   * order reports what it had filled, as an explicit zero rather than an omission,
   * so absence never has to be read as zero. Optional only because this one shape
   * covers every kind — `new`, `reject` and `modify` have no totals to report.
   */
  tb?: WireDecimal;
  /** Total quote filled so far; travels with `tb`. */
  tq?: WireDecimal;
  /** Total fee charged so far; travels with `tb`. There is no per-fill counterpart. */
  tf?: WireDecimal;
  /** `fill`: present only on the fill that closed the order, carrying its terminal status. */
  st?: "filled" | "canceled" | "margin_canceled" | "expired";
  /**
   * `fill` on a perp market: the owner's position after this fill, signed and
   * 1e18-scaled. Omitted on spot, which has no position.
   *
   * The position *before* is not sent because it is derivable — `pa - sign(sz) * b`,
   * the same arithmetic the engine used to produce the pair — and the transition
   * between the two is what says whether the fill opened, added to, reduced, closed
   * or flipped the position.
   */
  pa?: WireDecimal;
  /** `modify`: the price after the change. */
  px?: WireDecimal;
  /** `modify`: the size after the change, as an **unsigned magnitude**. */
  sz?: WireDecimal;
}

export interface WirePositionsPush {
  account: Hex;
  data: WirePositionsSnapshot;
}

export interface WireTriggersPush {
  account: Hex;
  triggers: WireTrigger[];
  total_count: number;
  next_cursor: string | null;
}
