/**
 * @module @podnetwork/orderbook
 * @description Orderbook client for Pod Network SDK - CLOB trading functionality
 */

export const VERSION = "0.1.0" as const;

// Types
export type { Side } from "./types.js";
export { SIDES, isSide } from "./types.js";

// Schemas
export type {
  OrderLevel,
  OrderBookData,
  OrderBookBidData,
  Bid,
  BidArray,
  BidStatusType,
} from "./schemas/index.js";
export {
  OrderLevelSchema,
  OrderLevelArraySchema,
  OrderBookDataSchema,
  OrderBookDataOrNullSchema,
  OrderBookBidDataSchema,
  SideSchema,
  // Bid response schemas
  BidSchema,
  BidArraySchema,
  BidStatus,
  isBidActive,
  isBidFilled,
  isBidExpired,
  isBidPending,
} from "./schemas/index.js";

// OrderBook class with helper methods
export { OrderBook, type OrderBookDepth } from "./orderbook.js";

// Bid builder
export { OrderBookBid, OrderBookBidBuilder, DEFAULT_BID_TTL } from "./bid.js";

// Error types
export { PodOrderbookError, type PodOrderbookErrorCode } from "./orderbook-error.js";

// Namespace
export {
  OrderbookNamespace,
  PendingOrderbookTransaction,
  type OrderbookSigner,
} from "./namespace.js";

// Re-export transport config from core for convenience
export type { RpcTransportConfig as OrderbookTransportConfig } from "@podnetwork/core";
