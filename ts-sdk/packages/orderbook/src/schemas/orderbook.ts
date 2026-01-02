/**
 * @module orderbook/schemas/orderbook
 * @description Zod schema for OrderBook state
 */

import { z } from "zod";
import { HashSchema, type Hash, HashBrand } from "@podnetwork/core";
import { type OrderLevel, OrderLevelArraySchema } from "./order-level.js";

// Re-export brand symbol for TypeScript declaration compatibility
export { HashBrand };

/**
 * Raw orderbook data structure from RPC.
 *
 * This represents the orderbook state as returned by the network.
 * Use the OrderBook class for a richer interface with helper methods.
 *
 * @example
 * ```typescript
 * const data: OrderBookData = {
 *   orderbookId: hash,
 *   bids: bidLevels,
 *   asks: askLevels,
 * };
 * ```
 */
export interface OrderBookData {
  /** Unique identifier for this orderbook */
  readonly orderbookId: Hash;
  /** Bid levels sorted by price descending (highest first) */
  readonly bids: readonly OrderLevel[];
  /** Ask levels sorted by price ascending (lowest first) */
  readonly asks: readonly OrderLevel[];
}

/**
 * Zod schema for validating OrderBook data from RPC responses.
 *
 * @example
 * ```typescript
 * const result = OrderBookDataSchema.safeParse(rpcResponse);
 * if (result.success) {
 *   const data: OrderBookData = result.data;
 * }
 * ```
 */
export const OrderBookDataSchema: z.ZodType<OrderBookData, z.ZodTypeDef, unknown> = z
  .object({
    orderbookId: HashSchema,
    bids: OrderLevelArraySchema,
    asks: OrderLevelArraySchema,
  })
  .transform(
    (v): OrderBookData => ({
      orderbookId: v.orderbookId,
      bids: v.bids,
      asks: v.asks,
    })
  );

/**
 * Type for nullable OrderBook (used when not found).
 */
export type OrderBookDataOrNull = OrderBookData | null;

/**
 * Schema for OrderBook that may be null.
 */
export const OrderBookDataOrNullSchema: z.ZodType<OrderBookDataOrNull, z.ZodTypeDef, unknown> =
  z.union([OrderBookDataSchema, z.null()]);
