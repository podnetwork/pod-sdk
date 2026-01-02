/**
 * @module orderbook/schemas/bid
 * @description Zod schema for OrderBookBid
 */

import { z } from "zod";
import {
  HashSchema,
  type Hash,
  HashBrand,
  BigIntPositiveSchema,
  BigIntNonNegativeSchema,
  parseBigInt,
} from "@podnetwork/core";
import { type Side, SIDES } from "../types.js";

// Re-export brand symbol for TypeScript declaration compatibility
export { HashBrand };

/**
 * Schema for parsing bigint from hex or decimal string.
 * @internal
 */
const RpcBigIntPositiveSchema = z
  .union([z.string(), z.bigint()])
  .transform((v): bigint => {
    if (typeof v === "bigint") return v;
    return parseBigInt(v);
  })
  .pipe(BigIntPositiveSchema);

/**
 * Schema for parsing non-negative bigint.
 * @internal
 */
const RpcBigIntNonNegativeSchema = z
  .union([z.string(), z.bigint()])
  .transform((v): bigint => {
    if (typeof v === "bigint") return v;
    return parseBigInt(v);
  })
  .pipe(BigIntNonNegativeSchema);

/**
 * Schema for Side type.
 */
export const SideSchema = z.enum(SIDES);

/**
 * An orderbook bid submission.
 *
 * @example
 * ```typescript
 * const bid: OrderBookBidData = {
 *   side: 'buy',
 *   price: 1000000000000000000n,
 *   volume: 5000000000000000000n,
 *   orderbookId: hash,
 *   startTs: 1700000000000000n,
 *   ttl: 3600000000n, // 1 hour in microseconds
 * };
 * ```
 */
export interface OrderBookBidData {
  /** Order side: 'buy' or 'sell' */
  readonly side: Side;
  /** Price in wei */
  readonly price: bigint;
  /** Volume in wei */
  readonly volume: bigint;
  /** Target orderbook ID */
  readonly orderbookId: Hash;
  /** Start timestamp in microseconds */
  readonly startTs: bigint;
  /** Time-to-live in microseconds */
  readonly ttl: bigint;
}

/**
 * Zod schema for validating OrderBookBid data.
 *
 * @example
 * ```typescript
 * const result = OrderBookBidDataSchema.safeParse(bidData);
 * if (result.success) {
 *   const bid: OrderBookBidData = result.data;
 * }
 * ```
 */
export const OrderBookBidDataSchema: z.ZodType<OrderBookBidData, z.ZodTypeDef, unknown> = z
  .object({
    side: SideSchema,
    price: RpcBigIntPositiveSchema,
    volume: RpcBigIntPositiveSchema,
    orderbookId: HashSchema,
    startTs: RpcBigIntNonNegativeSchema,
    ttl: RpcBigIntPositiveSchema,
  })
  .transform(
    (v): OrderBookBidData => ({
      side: v.side,
      price: v.price,
      volume: v.volume,
      orderbookId: v.orderbookId,
      startTs: v.startTs,
      ttl: v.ttl,
    })
  );
