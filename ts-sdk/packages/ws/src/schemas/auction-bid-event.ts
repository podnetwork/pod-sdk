/**
 * @module ws/schemas/auction-bid-event
 * @description Zod schema for AuctionBidsAdded WebSocket events
 */

import { z } from "zod";
import { parseBigInt } from "@podnetwork/core";

/**
 * Information about a single auction bid.
 *
 * This matches the node's AuctionBidInfo structure.
 */
export interface AuctionBidInfo {
  /** Transaction hash that created the bid */
  readonly txHash: `0x${string}`;
  /** Address of the bidder */
  readonly bidder: `0x${string}`;
  /** Auction identifier */
  readonly auctionId: bigint;
  /** Bid value */
  readonly value: bigint;
  /** Optional calldata for the bid */
  readonly data: `0x${string}`;
  /** Bid deadline in microseconds since epoch */
  readonly deadline: bigint;
}

/**
 * Event when new auction bids are added.
 *
 * The node sends auction_bids_added messages with a list of bids.
 *
 * @example
 * ```typescript
 * for await (const event of client.ws.subscribeAuctionBids()) {
 *   console.log(`New auction bids at ${event.timestamp}:`);
 *   for (const bid of event.bids) {
 *     console.log(`  Auction ${bid.auctionId}: ${bid.value} from ${bid.bidder}`);
 *   }
 * }
 * ```
 */
export interface AuctionBidEvent {
  /** List of bids that were added */
  readonly bids: readonly AuctionBidInfo[];
  /** Timestamp in microseconds */
  readonly timestamp: bigint;
}

/**
 * Zod schema for AuctionBidInfo.
 * @internal
 */
const AuctionBidInfoSchema = z
  .object({
    tx_hash: z.string(),
    bidder: z.string(),
    auction_id: z.string(),
    value: z.string(),
    data: z.string(),
    deadline: z.number(),
  })
  .transform(
    (v): AuctionBidInfo => ({
      txHash: (v.tx_hash.startsWith("0x") ? v.tx_hash : `0x${v.tx_hash}`) as `0x${string}`,
      bidder: v.bidder as `0x${string}`,
      auctionId: parseBigInt(v.auction_id),
      value: parseBigInt(v.value),
      data: (v.data.startsWith("0x") ? v.data : `0x${v.data}`) as `0x${string}`,
      deadline: BigInt(v.deadline),
    })
  );

/**
 * Zod schema for validating AuctionBidEvent from WebSocket messages.
 *
 * The node sends auction_bids_added messages with this format:
 * ```json
 * {
 *   "type": "auction_bids_added",
 *   "bids": [
 *     {
 *       "tx_hash": "...",
 *       "bidder": "0x...",
 *       "auction_id": "123",
 *       "value": "1000000000000000000",
 *       "data": "0x...",
 *       "deadline": 1234567890123456
 *     }
 *   ],
 *   "timestamp": 1234567890123456
 * }
 * ```
 *
 * @example
 * ```typescript
 * const result = AuctionBidEventSchema.safeParse(wsData);
 * if (result.success) {
 *   const event: AuctionBidEvent = result.data;
 * }
 * ```
 */
export const AuctionBidEventSchema: z.ZodType<AuctionBidEvent, z.ZodTypeDef, unknown> = z
  .object({
    bids: z.array(AuctionBidInfoSchema),
    timestamp: z.number(),
  })
  .transform(
    (v): AuctionBidEvent => ({
      bids: v.bids,
      timestamp: BigInt(v.timestamp),
    })
  );

/**
 * Helper class for working with AuctionBidEvent.
 */
export class AuctionBidEventHelper {
  constructor(private readonly event: AuctionBidEvent) {}

  /**
   * Creates an AuctionBidEventHelper from raw data.
   */
  static from(data: AuctionBidEvent): AuctionBidEventHelper {
    return new AuctionBidEventHelper(data);
  }

  /**
   * Gets the raw event data.
   */
  get data(): AuctionBidEvent {
    return this.event;
  }

  /**
   * Gets the bids.
   */
  get bids(): readonly AuctionBidInfo[] {
    return this.event.bids;
  }

  /**
   * Gets the timestamp.
   */
  get timestamp(): bigint {
    return this.event.timestamp;
  }

  /**
   * Gets the number of bids in this event.
   */
  get count(): number {
    return this.event.bids.length;
  }
}
