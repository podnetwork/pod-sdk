/**
 * @module @podnetwork/ws
 * @description WebSocket subscriptions for pod network SDK
 *
 * This package provides real-time WebSocket subscriptions using the
 * pod node's tagged message protocol:
 * - Orderbook updates (orderbook_snapshot messages)
 * - CLOB bid events (clob_bids_added messages)
 * - Auction bid events (auction_bids_added messages)
 *
 * @example
 * ```typescript
 * import { WsNamespace, createWsNamespace } from '@podnetwork/ws';
 *
 * // Create via PodClient
 * const client = PodClient.dev();
 * for await (const update of client.ws.subscribeOrderbook([orderbookId])) {
 *   console.log(update.bestBid());
 * }
 *
 * // Or standalone
 * const ws = createWsNamespace('wss://ws.dev.pod.network');
 * for await (const event of ws.subscribeBids([orderbookId])) {
 *   console.log(event.clobId);
 * }
 * ```
 */

export const VERSION = "0.1.0" as const;

// Main client
export { WsNamespace, createWsNamespace } from "./client.js";

// Factory function types for PodClient integration
import { WsNamespace } from "./client.js";

/**
 * Configuration for creating a WsNamespace from a PodClient.
 */
export interface CreateWsNamespaceConfig {
  /** WebSocket endpoint URL */
  wsUrl: string;
  /** Maximum concurrent subscriptions */
  maxSubscriptions?: number;
}

/**
 * Creates a WsNamespace instance from PodClient-compatible configuration.
 *
 * This is the recommended way to create a WsNamespace when integrating
 * with PodClient.
 *
 * @param config - Configuration from PodClient
 * @returns New WsNamespace instance
 *
 * @example
 * ```typescript
 * import { PodClient } from '@podnetwork/core';
 * import { createWsNamespaceFromConfig } from '@podnetwork/ws';
 *
 * const client = PodClient.dev();
 * if (client.wsUrl) {
 *   const ws = createWsNamespaceFromConfig({
 *     wsUrl: client.wsUrl,
 *     maxSubscriptions: client.config.maxSubscriptions,
 *   });
 *
 *   for await (const update of ws.subscribeOrderbook([orderbookId])) {
 *     console.log(update.bestBid());
 *   }
 * }
 * ```
 */
export function createWsNamespaceFromConfig(config: CreateWsNamespaceConfig): WsNamespace {
  return new WsNamespace({
    url: config.wsUrl,
    maxSubscriptions: config.maxSubscriptions ?? 10,
  });
}

// Connection management
export {
  WebSocketConnection,
  type ConnectionEvent,
  type ConnectionEventCallback,
} from "./connection.js";

// Reconnection utilities
export {
  ReconnectionManager,
  calculateDelay,
  shouldReconnect,
  resolveBackoffPolicy,
  waitForReconnect,
  isNeverReconnect,
  isExponentialBackoff,
  type ResolvedBackoffPolicy,
} from "./reconnect.js";

// Types
export type {
  SubscriptionOptions,
  ReconnectPolicy,
  NeverReconnectPolicy,
  ExponentialBackoffPolicy,
  WsConfig,
  OrderbookSubscriptionOptions,
  BidSubscriptionOptions,
  AuctionBidSubscriptionOptions,
  ConnectionState,
  WebSocketChannel,
  WsSubscriptionParams,
  SubscriptionState,
} from "./types.js";
export {
  DEFAULT_RECONNECT_POLICY,
  DEFAULT_SUBSCRIPTION_OPTIONS,
  DEFAULT_WS_CONFIG,
} from "./types.js";

// Schemas
// Note: Side and SideSchema are not re-exported to avoid conflicts with @podnetwork/orderbook.
// Use the types from @podnetwork/orderbook instead.
export type {
  OrderLevelUpdate,
  OrderBookUpdate,
  Side,
  CLOBBidInfo,
  BidEvent,
  AuctionBidInfo,
  AuctionBidEvent,
} from "./schemas/index.js";
export {
  OrderBookUpdateSchema,
  OrderBookUpdateHelper,
  SideSchema,
  BidEventSchema,
  AuctionBidEventSchema,
  AuctionBidEventHelper,
} from "./schemas/index.js";
