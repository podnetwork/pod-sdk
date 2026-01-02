/**
 * @module ws/schemas/bid-event
 * @description Zod schema for CLOBBidsAdded WebSocket events
 */

import { z } from "zod";
import { parseBigInt } from "@podnetwork/core";

/**
 * Side enumeration for orderbook bids.
 */
export type Side = "buy" | "sell";

/**
 * Zod schema for Side.
 */
export const SideSchema = z.enum(["buy", "sell"]);

/**
 * Information about a CLOB bid from a bids_added event.
 *
 * This matches the node's CLOBBidInfo structure.
 */
export interface CLOBBidInfo {
  /** Transaction hash that created the bid (hex string without 0x) */
  readonly txHash: `0x${string}`;
  /** Address of the bidder */
  readonly bidder: `0x${string}`;
  /** Remaining volume of the bid */
  readonly volume: bigint;
  /** Price of the bid */
  readonly price: bigint;
  /** Bid side (buy or sell) */
  readonly side: Side;
  /** Start timestamp in microseconds */
  readonly startTs: bigint;
  /** End timestamp in microseconds (startTs + ttl) */
  readonly endTs: bigint;
  /** Transaction nonce */
  readonly nonce: bigint;
}

/**
 * Event when new bids are added to a CLOB.
 *
 * The node sends clob_bids_added messages with a list of bids.
 *
 * @example
 * ```typescript
 * for await (const event of client.ws.subscribeBids([orderbookId])) {
 *   console.log(`New bids on ${event.clobId}:`);
 *   for (const bid of event.bids) {
 *     console.log(`  ${bid.side} ${bid.volume} @ ${bid.price}`);
 *   }
 * }
 * ```
 */
export interface BidEvent {
  /** CLOB identifier (bytes32 as hex) */
  readonly clobId: `0x${string}`;
  /** List of bids that were added */
  readonly bids: readonly CLOBBidInfo[];
  /** Timestamp in microseconds */
  readonly timestamp: bigint;
}

/**
 * Zod schema for CLOBBidInfo.
 * @internal
 */
const CLOBBidInfoSchema = z
  .object({
    tx_hash: z.string(),
    bidder: z.string(),
    volume: z.string(),
    price: z.string(),
    side: SideSchema,
    start_ts: z.number(),
    end_ts: z.number(),
    nonce: z.number(),
  })
  .transform(
    (v): CLOBBidInfo => ({
      txHash: (v.tx_hash.startsWith("0x") ? v.tx_hash : `0x${v.tx_hash}`) as `0x${string}`,
      bidder: v.bidder as `0x${string}`,
      volume: parseBigInt(v.volume),
      price: parseBigInt(v.price),
      side: v.side,
      startTs: BigInt(v.start_ts),
      endTs: BigInt(v.end_ts),
      nonce: BigInt(v.nonce),
    })
  );

/**
 * Zod schema for validating BidEvent from WebSocket messages.
 *
 * The node sends clob_bids_added messages with this format:
 * ```json
 * {
 *   "type": "clob_bids_added",
 *   "clob_id": "0x...",
 *   "bids": [
 *     {
 *       "tx_hash": "...",
 *       "bidder": "0x...",
 *       "volume": "1000000000",
 *       "price": "1500000000000000000",
 *       "side": "buy",
 *       "start_ts": 1234567890,
 *       "end_ts": 1234567899,
 *       "nonce": 0
 *     }
 *   ],
 *   "timestamp": 1234567890123456
 * }
 * ```
 *
 * @example
 * ```typescript
 * const result = BidEventSchema.safeParse(wsData);
 * if (result.success) {
 *   const event: BidEvent = result.data;
 * }
 * ```
 */
export const BidEventSchema: z.ZodType<BidEvent, z.ZodTypeDef, unknown> = z
  .object({
    clob_id: z.string(),
    bids: z.array(CLOBBidInfoSchema),
    timestamp: z.number(),
  })
  .transform(
    (v): BidEvent => ({
      clobId: (v.clob_id.startsWith("0x") ? v.clob_id : `0x${v.clob_id}`) as `0x${string}`,
      bids: v.bids,
      timestamp: BigInt(v.timestamp),
    })
  );
