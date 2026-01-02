/**
 * @module orderbook/schemas/bid-response
 * @description Zod schema for bid responses from getBids RPC call
 */

import { z } from "zod";
import { HashSchema, type Hash, parseBigInt } from "@podnetwork/core";
import { BidStatus, type BidStatusType } from "@podnetwork/abi";
import type { Side } from "../types.js";

/**
 * Re-export BidStatus for convenience.
 */
export { BidStatus, type BidStatusType };

/**
 * Schema for parsing bigint from hex string or number.
 * @internal
 */
const RpcBigIntSchema = z.union([z.string(), z.number(), z.bigint()]).transform((v): bigint => {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(v);
  return parseBigInt(v);
});

/**
 * Schema for parsing side from uint8.
 * @internal
 */
const RpcSideSchema = z.union([z.number(), z.string()]).transform((v): Side => {
  const num = typeof v === "number" ? v : parseInt(v, 10);
  return num === 0 ? "buy" : "sell";
});

/**
 * Schema for parsing status from uint16.
 * @internal
 */
const RpcStatusSchema = z.union([z.number(), z.string()]).transform((v): BidStatusType => {
  const num = typeof v === "number" ? v : parseInt(v, 10);
  return num as BidStatusType;
});

/**
 * A bid returned from the CLOB getBids RPC call.
 *
 * Contains the full bid state including fill amounts and status.
 *
 * @example
 * ```typescript
 * const bids = await getBids(client, orderbookId, page);
 * for (const bid of bids) {
 *   console.log(`Bid ${bid.txHash}: ${bid.status === BidStatus.Active ? 'active' : 'filled'}`);
 *   console.log(`Remaining: ${formatPod(bid.remainingBaseAmount)} / Filled: ${formatPod(bid.filledBaseAmount)}`);
 * }
 * ```
 */
export interface Bid {
  /** Transaction hash of the bid submission */
  readonly txHash: Hash;
  /** Order side: 'buy' or 'sell' */
  readonly side: Side;
  /** Bid status: Pending, Active, Filled, or Expired */
  readonly status: BidStatusType;
  /** Remaining base amount to fill */
  readonly remainingBaseAmount: bigint;
  /** Bid price */
  readonly price: bigint;
  /** Start timestamp in microseconds */
  readonly startTs: bigint;
  /** End timestamp in microseconds (startTs + ttl) */
  readonly endTs: bigint;
  /** Amount of base token filled */
  readonly filledBaseAmount: bigint;
  /** Amount of quote token filled */
  readonly filledQuoteAmount: bigint;
}

/**
 * Zod schema for validating Bid data from getBids RPC response.
 *
 * Parses the 9-tuple returned by the CLOB contract's getBids function.
 *
 * @example
 * ```typescript
 * const result = BidSchema.safeParse(rpcBid);
 * if (result.success) {
 *   const bid: Bid = result.data;
 * }
 * ```
 */
export const BidSchema: z.ZodType<Bid, z.ZodTypeDef, unknown> = z
  .object({
    tx_hash: HashSchema,
    side: RpcSideSchema,
    status: RpcStatusSchema,
    remaining_base_amount: RpcBigIntSchema,
    price: RpcBigIntSchema,
    start_ts: RpcBigIntSchema,
    end_ts: RpcBigIntSchema,
    filled_base_amount: RpcBigIntSchema,
    filled_quote_amount: RpcBigIntSchema,
  })
  .transform(
    (v): Bid => ({
      txHash: v.tx_hash,
      side: v.side,
      status: v.status,
      remainingBaseAmount: v.remaining_base_amount,
      price: v.price,
      startTs: v.start_ts,
      endTs: v.end_ts,
      filledBaseAmount: v.filled_base_amount,
      filledQuoteAmount: v.filled_quote_amount,
    })
  );

/**
 * Zod schema for an array of bids.
 */
export const BidArraySchema = z.array(BidSchema);

/**
 * Type for an array of bids.
 */
export type BidArray = Bid[];

/**
 * Helper function to check if a bid is active.
 */
export function isBidActive(bid: Bid): boolean {
  return bid.status === BidStatus.Active;
}

/**
 * Helper function to check if a bid is filled.
 */
export function isBidFilled(bid: Bid): boolean {
  return bid.status === BidStatus.Filled;
}

/**
 * Helper function to check if a bid is expired.
 */
export function isBidExpired(bid: Bid): boolean {
  return bid.status === BidStatus.Expired;
}

/**
 * Helper function to check if a bid is pending.
 */
export function isBidPending(bid: Bid): boolean {
  return bid.status === BidStatus.Pending;
}
