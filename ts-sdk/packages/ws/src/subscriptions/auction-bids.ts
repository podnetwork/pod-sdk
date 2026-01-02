/**
 * @module ws/subscriptions/auction-bids
 * @description Auction bid event subscription handler
 */

import type { WebSocketConnection } from "../connection.js";
import type { AuctionBidSubscriptionOptions } from "../types.js";
import { AuctionBidEventSchema, AuctionBidEventHelper } from "../schemas/auction-bid-event.js";
import { createAsyncIterable } from "./utils.js";

/**
 * Creates an async iterable for auction bid events.
 *
 * Subscribes to the "auction_bids" channel to receive auction_bids_added messages.
 * Note: The node broadcasts all auction bids to all subscribers (no filtering).
 *
 * @param connection - The WebSocket connection
 * @param options - Subscription options
 * @returns AsyncIterable of AuctionBidEventHelper
 *
 * @example
 * ```typescript
 * // Subscribe to all auction bids
 * for await (const event of subscribeAuctionBids(connection)) {
 *   console.log(`New auction bids at ${event.timestamp}:`);
 *   for (const bid of event.bids) {
 *     console.log(`  Auction ${bid.auctionId}: ${bid.value} from ${bid.bidder}`);
 *   }
 * }
 * ```
 */
export function subscribeAuctionBids(
  connection: WebSocketConnection,
  options?: AuctionBidSubscriptionOptions
): AsyncIterable<AuctionBidEventHelper> {
  // Note: The auction_bids channel doesn't support filtering by auction ID on the server side.
  // All auction bids are sent to all subscribers.

  return createAsyncIterable<AuctionBidEventHelper>(
    connection,
    "auction_bids",
    undefined, // No params for auction_bids channel
    (data) => {
      const parsed = AuctionBidEventSchema.parse(data);
      return AuctionBidEventHelper.from(parsed);
    },
    options
  );
}
