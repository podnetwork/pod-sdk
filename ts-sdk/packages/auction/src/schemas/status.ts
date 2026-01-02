/**
 * @module auction/schemas/status
 * @description Zod schema for AuctionStatus
 */

import { z } from "zod";
import {
  AddressSchema,
  BigIntNonNegativeSchema,
  parseBigInt,
  type Address,
} from "@podnetwork/core";

/**
 * Schema for parsing bigint from hex or decimal string.
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
 * Schema for optional bigint.
 * @internal
 */
const RpcBigIntOptionalSchema = z
  .union([z.string(), z.bigint(), z.null(), z.undefined()])
  .transform((v): bigint | undefined => {
    if (v === null || v === undefined) return undefined;
    if (typeof v === "bigint") return v;
    return parseBigInt(v);
  });

/**
 * Schema for optional address.
 * @internal
 */
const RpcAddressOptionalSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v): Address | undefined => {
    if (v === null || v === undefined || v === "") return undefined;
    return AddressSchema.parse(v);
  });

/**
 * Current state of an auction.
 *
 * @example
 * ```typescript
 * const status: AuctionStatusData = {
 *   auctionId: 123n,
 *   highestBid: 1000000000000000000n,
 *   highestBidder: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
 *   deadline: 1700000000000000n,
 *   isEnded: false,
 * };
 * ```
 */
export interface AuctionStatusData {
  /** Auction identifier */
  readonly auctionId: bigint;
  /** Highest bid amount in wei, or undefined if no bids */
  readonly highestBid: bigint | undefined;
  /** Address of highest bidder, or undefined if no bids */
  readonly highestBidder: Address | undefined;
  /** Deadline timestamp in microseconds since epoch */
  readonly deadline: bigint;
  /** Whether the auction has ended */
  readonly isEnded: boolean;
}

/**
 * Zod schema for validating AuctionStatus data.
 *
 * @example
 * ```typescript
 * const result = AuctionStatusDataSchema.safeParse(statusData);
 * if (result.success) {
 *   const status: AuctionStatusData = result.data;
 * }
 * ```
 */
export const AuctionStatusDataSchema: z.ZodType<AuctionStatusData, z.ZodTypeDef, unknown> = z
  .object({
    auctionId: RpcBigIntNonNegativeSchema,
    highestBid: RpcBigIntOptionalSchema,
    highestBidder: RpcAddressOptionalSchema,
    deadline: RpcBigIntNonNegativeSchema,
    isEnded: z.boolean(),
  })
  .transform(
    (v): AuctionStatusData => ({
      auctionId: v.auctionId,
      highestBid: v.highestBid,
      highestBidder: v.highestBidder,
      deadline: v.deadline,
      isEnded: v.isEnded,
    })
  );

/**
 * Zod schema for nullable AuctionStatus (for RPC responses).
 */
export const AuctionStatusDataOrNullSchema = z
  .union([AuctionStatusDataSchema, z.null()])
  .transform((v): AuctionStatusData | null => v);
