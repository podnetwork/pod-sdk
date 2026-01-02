/**
 * @module ws/subscriptions/orderbook
 * @description Orderbook subscription handler
 */

import type { HashLike } from "@podnetwork/core";
import { HashSchema } from "@podnetwork/core";
import type { WebSocketConnection } from "../connection.js";
import type { OrderbookSubscriptionOptions, WsSubscriptionParams } from "../types.js";
import { OrderBookUpdateSchema, OrderBookUpdateHelper } from "../schemas/orderbook-update.js";
import { createAsyncIterable } from "./utils.js";

/**
 * Default orderbook depth.
 */
const DEFAULT_DEPTH = 10;

/**
 * Creates an async iterable for orderbook updates.
 *
 * Subscribes to the "orderbook" channel to receive orderbook_snapshot messages.
 *
 * @param connection - The WebSocket connection
 * @param orderbookIds - Array of CLOB IDs to subscribe to
 * @param options - Subscription options
 * @returns AsyncIterable of OrderBookUpdateHelper
 *
 * @example
 * ```typescript
 * for await (const update of subscribeOrderbook(connection, [orderbookId])) {
 *   console.log(`Best bid: ${update.bestBid()}`);
 *   console.log(`Best ask: ${update.bestAsk()}`);
 * }
 * ```
 */
export function subscribeOrderbook(
  connection: WebSocketConnection,
  orderbookIds: HashLike[],
  options?: OrderbookSubscriptionOptions
): AsyncIterable<OrderBookUpdateHelper> {
  const normalizedIds = orderbookIds.map((id) => HashSchema.parse(id));
  const depth = options?.depth ?? DEFAULT_DEPTH;

  const params: WsSubscriptionParams = {
    depth,
    clob_ids: normalizedIds,
  };

  return createAsyncIterable<OrderBookUpdateHelper>(
    connection,
    "orderbook",
    params,
    (data) => {
      const parsed = OrderBookUpdateSchema.parse(data);
      return OrderBookUpdateHelper.from(parsed);
    },
    options
  );
}
