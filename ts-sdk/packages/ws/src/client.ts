/**
 * @module ws/client
 * @description WsNamespace class for WebSocket subscriptions
 */

import { getLogger, LoggerCategory, type HashLike } from "@podnetwork/core";
import { WebSocketConnection, type ConnectionEventCallback } from "./connection.js";
import type {
  WsConfig,
  OrderbookSubscriptionOptions,
  BidSubscriptionOptions,
  AuctionBidSubscriptionOptions,
  ConnectionState,
} from "./types.js";
import { subscribeOrderbook } from "./subscriptions/orderbook.js";
import { subscribeBids } from "./subscriptions/bids.js";
import { subscribeAuctionBids } from "./subscriptions/auction-bids.js";
import type { OrderBookUpdateHelper } from "./schemas/orderbook-update.js";
import type { BidEvent } from "./schemas/bid-event.js";
import type { AuctionBidEventHelper } from "./schemas/auction-bid-event.js";

const logger = getLogger(LoggerCategory.CORE);

/**
 * WsNamespace provides WebSocket subscription methods for real-time updates.
 *
 * Uses the pod node's tagged message protocol for efficient streaming.
 *
 * Available subscriptions:
 * - subscribeOrderbook: Real-time orderbook snapshots (orderbook_snapshot messages)
 * - subscribeBids: CLOB bid events (clob_bids_added messages)
 * - subscribeAuctionBids: Auction bid events (auction_bids_added messages)
 *
 * @example
 * ```typescript
 * const client = PodClient.dev();
 *
 * // Subscribe to orderbook updates
 * const controller = new AbortController();
 *
 * for await (const update of client.ws.subscribeOrderbook([orderbookId], {
 *   signal: controller.signal,
 * })) {
 *   console.log(`Best bid: ${update.bestBid()}`);
 *   console.log(`Best ask: ${update.bestAsk()}`);
 *
 *   // Cancel after first update
 *   controller.abort();
 * }
 * ```
 */
export class WsNamespace {
  private readonly connection: WebSocketConnection;
  private isConnected = false;

  /**
   * Creates a new WsNamespace.
   *
   * @param config - WebSocket configuration
   */
  constructor(config: WsConfig) {
    this.connection = new WebSocketConnection(config);

    logger.debug("WsNamespace created", { url: config.url });
  }

  /**
   * Gets the current connection state.
   */
  getState(): ConnectionState {
    return this.connection.getState();
  }

  /**
   * Gets the number of active subscriptions.
   */
  getSubscriptionCount(): number {
    return this.connection.getSubscriptionCount();
  }

  /**
   * Gets the maximum number of subscriptions allowed.
   */
  getMaxSubscriptions(): number {
    return this.connection.getMaxSubscriptions();
  }

  /**
   * Checks if more subscriptions can be created.
   */
  canSubscribe(): boolean {
    return this.connection.canSubscribe();
  }

  /**
   * Adds a connection event listener.
   *
   * @param callback - Event callback
   *
   * @example
   * ```typescript
   * client.ws.addEventListener((event) => {
   *   switch (event.type) {
   *     case 'connected':
   *       console.log('Connected');
   *       break;
   *     case 'disconnected':
   *       console.log('Disconnected:', event.reason);
   *       break;
   *     case 'reconnecting':
   *       console.log('Reconnecting, attempt:', event.attempt);
   *       break;
   *     case 'error':
   *       console.error('Error:', event.error);
   *       break;
   *   }
   * });
   * ```
   */
  addEventListener(callback: ConnectionEventCallback): void {
    this.connection.addEventListener(callback);
  }

  /**
   * Removes a connection event listener.
   *
   * @param callback - Event callback to remove
   */
  removeEventListener(callback: ConnectionEventCallback): void {
    this.connection.removeEventListener(callback);
  }

  /**
   * Explicitly connects to the WebSocket server.
   *
   * Usually not needed - subscriptions will auto-connect.
   */
  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.connection.connect();
      this.isConnected = true;
    }
  }

  /**
   * Disconnects from the WebSocket server.
   *
   * Cancels all active subscriptions.
   */
  async disconnect(): Promise<void> {
    await this.connection.disconnect();
    this.isConnected = false;
  }

  /**
   * Subscribes to real-time orderbook updates.
   *
   * Returns an async iterable that yields orderbook snapshots
   * whenever the orderbook state changes.
   *
   * @param orderbookIds - Array of orderbook IDs to subscribe to
   * @param options - Subscription options
   * @returns AsyncIterable of OrderBookUpdateHelper
   *
   * @example
   * ```typescript
   * // Basic subscription
   * for await (const update of client.ws.subscribeOrderbook([orderbookId])) {
   *   console.log(`Orderbook ${update.orderbookId}`);
   *   console.log(`Best bid: ${update.bestBid()}`);
   *   console.log(`Best ask: ${update.bestAsk()}`);
   *   console.log(`Spread: ${update.spread()}`);
   * }
   *
   * // With abort signal for cancellation
   * const controller = new AbortController();
   * setTimeout(() => controller.abort(), 60000); // Cancel after 1 minute
   *
   * for await (const update of client.ws.subscribeOrderbook([orderbookId], {
   *   signal: controller.signal,
   *   depth: 20, // Get top 20 levels
   * })) {
   *   // Process update
   * }
   * ```
   */
  subscribeOrderbook(
    orderbookIds: HashLike[],
    options?: OrderbookSubscriptionOptions
  ): AsyncIterable<OrderBookUpdateHelper> {
    return subscribeOrderbook(this.connection, orderbookIds, options);
  }

  /**
   * Subscribes to CLOB bid events.
   *
   * Returns an async iterable that yields events when new bids are
   * added to the CLOB orderbook.
   *
   * @param orderbookIds - Array of CLOB IDs to subscribe to
   * @param options - Subscription options
   * @returns AsyncIterable of BidEvent
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
  subscribeBids(
    orderbookIds: HashLike[],
    options?: BidSubscriptionOptions
  ): AsyncIterable<BidEvent> {
    return subscribeBids(this.connection, orderbookIds, options);
  }

  /**
   * Subscribes to auction bid events.
   *
   * Returns an async iterable that yields events when new bids
   * are placed in optimistic auctions. The node broadcasts all
   * auction bids to all subscribers.
   *
   * @param options - Subscription options
   * @returns AsyncIterable of AuctionBidEventHelper
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
  subscribeAuctionBids(
    options?: AuctionBidSubscriptionOptions
  ): AsyncIterable<AuctionBidEventHelper> {
    return subscribeAuctionBids(this.connection, options);
  }
}

/**
 * Creates a WsNamespace from a URL.
 *
 * @param wsUrl - WebSocket URL
 * @param maxSubscriptions - Maximum concurrent subscriptions
 * @returns WsNamespace instance
 *
 * @example
 * ```typescript
 * const ws = createWsNamespace('wss://ws.testnet.pod.network');
 * ```
 */
export function createWsNamespace(wsUrl: string, maxSubscriptions = 10): WsNamespace {
  return new WsNamespace({
    url: wsUrl,
    maxSubscriptions,
  });
}
