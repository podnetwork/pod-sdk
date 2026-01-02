/**
 * @module ws/subscriptions/bids
 * @description Bid event subscription handler
 */

import type { HashLike } from "@podnetwork/core";
import { HashSchema } from "@podnetwork/core";
import type { WebSocketConnection } from "../connection.js";
import type { BidSubscriptionOptions, WsSubscriptionParams } from "../types.js";
import { BidEventSchema, type BidEvent } from "../schemas/bid-event.js";
import { createAsyncIterable } from "./utils.js";

/**
 * Creates an async iterable for bid events.
 *
 * Subscribes to the "bids" channel to receive clob_bids_added messages
 * when new bids are added to the CLOB.
 *
 * @param connection - The WebSocket connection
 * @param orderbookIds - Array of CLOB IDs to subscribe to
 * @param options - Subscription options
 * @returns AsyncIterable of BidEvent
 *
 * @example
 * ```typescript
 * for await (const event of subscribeBids(connection, [orderbookId])) {
 *   console.log(`New bids on ${event.clobId}:`);
 *   for (const bid of event.bids) {
 *     console.log(`  ${bid.side} ${bid.volume} @ ${bid.price}`);
 *   }
 * }
 * ```
 */
export function subscribeBids(
  connection: WebSocketConnection,
  orderbookIds: HashLike[],
  options?: BidSubscriptionOptions
): AsyncIterable<BidEvent> {
  const normalizedIds = orderbookIds.map((id) => HashSchema.parse(id));

  const params: WsSubscriptionParams = {
    clob_ids: normalizedIds,
  };

  return createAsyncIterable<BidEvent>(
    connection,
    "bids",
    params,
    (data) => BidEventSchema.parse(data),
    options
  );
}
