/**
 * @module auction/schemas/bid
 * @description Zod schema for AuctionBid
 */

import { z } from "zod";
import {
  BigIntPositiveSchema,
  BigIntNonNegativeSchema,
  BytesSchema,
  parseBigInt,
  type Bytes,
} from "@podnetwork/core";

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
 * An auction bid submission.
 *
 * @example
 * ```typescript
 * const bid: AuctionBidData = {
 *   amount: 1000000000000000000n, // 1 POD
 *   deadline: 1700000000000000n,   // microseconds since epoch
 *   data: '0x',                    // optional calldata
 * };
 * ```
 */
export interface AuctionBidData {
  /** Bid amount in wei */
  readonly amount: bigint;
  /** Deadline timestamp in microseconds since epoch */
  readonly deadline: bigint;
  /** Optional calldata for the bid */
  readonly data: Bytes;
}

/**
 * Zod schema for validating AuctionBid data.
 *
 * @example
 * ```typescript
 * const result = AuctionBidDataSchema.safeParse(bidData);
 * if (result.success) {
 *   const bid: AuctionBidData = result.data;
 * }
 * ```
 */
export const AuctionBidDataSchema: z.ZodType<AuctionBidData, z.ZodTypeDef, unknown> = z
  .object({
    amount: RpcBigIntPositiveSchema,
    deadline: RpcBigIntNonNegativeSchema,
    data: BytesSchema.optional().default("0x" as Bytes),
  })
  .transform(
    (v): AuctionBidData => ({
      amount: v.amount,
      deadline: v.deadline,
      data: v.data,
    })
  );
