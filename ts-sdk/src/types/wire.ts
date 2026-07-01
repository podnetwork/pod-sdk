// Raw JSON shapes exactly as the indexer emits them (REST `/clob/*` and the
// `pod_*` WebSocket channels). snake_case; numerics are 1e18-scaled decimal
// strings; timestamps are microseconds (in `*_us` fields, or bare on candle/
// orderbook). Decoders in ../codec/decode.ts convert these to ../types/public.

import type { Hex } from "./public.js";

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
  orderbook_id?: Hex; // REST only; WS raw Order carries `pair` instead
  market_type?: "spot" | "perp"; // REST only
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
  /** Present on WS stream orders (raw engine Order) instead of orderbook_id. */
  pair?: { base: Hex; quote: Hex };
  /** Present on REST orders; absent on the WS raw Order (derive from `initial_size`). */
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
  minimum_expiry?: number;
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

// pod_orders push: tagged union on `type`.
export type WireOrderUpdate =
  | ({ type: "new" } & WireOrder)
  | ({ type: "invalid" } & WireOrder)
  | ({ type: "fill" } & WireOrderFill)
  | { type: "expired"; order_id: Hex }
  | { type: "canceled"; order_id: Hex }
  | { type: "modified"; order_id: Hex; new_price: WireDecimal; new_size: WireDecimal };

export interface WireOrderFill {
  orderbook_id: Hex;
  order_id: Hex;
  tx_hash: Hex;
  bidder: Hex;
  status: string;
  base_amount: WireDecimal;
  quote_amount: WireDecimal;
  filled_base_amount: WireDecimal;
  filled_quote_amount: WireDecimal;
  effective_price?: WireDecimal | null;
  fee: WireDecimal;
  position_before?: WireDecimal | null;
  position_after?: WireDecimal | null;
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
