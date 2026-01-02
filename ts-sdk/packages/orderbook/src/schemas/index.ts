/**
 * @module orderbook/schemas
 * @description Zod schemas for orderbook types
 */

export type { OrderLevel } from "./order-level.js";
export { OrderLevelSchema, OrderLevelArraySchema } from "./order-level.js";

export type { OrderBookData, OrderBookDataOrNull } from "./orderbook.js";
export { OrderBookDataSchema, OrderBookDataOrNullSchema } from "./orderbook.js";

export type { OrderBookBidData } from "./bid.js";
export { OrderBookBidDataSchema, SideSchema } from "./bid.js";

// Bid response types (from getBids RPC)
export type { Bid, BidArray, BidStatusType } from "./bid-response.js";
export {
  BidSchema,
  BidArraySchema,
  BidStatus,
  isBidActive,
  isBidFilled,
  isBidExpired,
  isBidPending,
} from "./bid-response.js";
