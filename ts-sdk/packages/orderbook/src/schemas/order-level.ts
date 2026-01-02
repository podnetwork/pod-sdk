/**
 * @module orderbook/schemas/order-level
 * @description Zod schema for OrderLevel in orderbook
 */

import { z } from "zod";
import { BigIntPositiveSchema, BigIntNonNegativeSchema, parseBigInt } from "@podnetwork/core";

/**
 * Schema for parsing bigint from hex or decimal string in RPC responses.
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
 * Schema for parsing non-negative bigint from hex or decimal string.
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
 * A price level in the orderbook.
 *
 * @example
 * ```typescript
 * const level: OrderLevel = {
 *   price: 1000000000000000000n, // 1 POD
 *   volume: 5000000000000000000n, // 5 POD
 *   minimumExpiry: 1700000000000000n, // microseconds
 * };
 * ```
 */
export interface OrderLevel {
  /** Price in wei */
  readonly price: bigint;
  /** Total volume at this price level in wei */
  readonly volume: bigint;
  /** Earliest expiry timestamp in microseconds */
  readonly minimumExpiry: bigint;
}

/**
 * Zod schema for validating OrderLevel from RPC responses.
 *
 * @example
 * ```typescript
 * const result = OrderLevelSchema.safeParse(rpcData);
 * if (result.success) {
 *   const level: OrderLevel = result.data;
 * }
 * ```
 */
export const OrderLevelSchema: z.ZodType<OrderLevel, z.ZodTypeDef, unknown> = z
  .object({
    price: RpcBigIntPositiveSchema,
    volume: RpcBigIntPositiveSchema,
    minimumExpiry: RpcBigIntNonNegativeSchema,
  })
  .transform(
    (v): OrderLevel => ({
      price: v.price,
      volume: v.volume,
      minimumExpiry: v.minimumExpiry,
    })
  );

/**
 * Schema for an array of OrderLevels.
 */
export const OrderLevelArraySchema = z.array(OrderLevelSchema);
