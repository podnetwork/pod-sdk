/**
 * @module ws/types
 * @description Type definitions for WebSocket subscriptions
 */

/**
 * Options for WebSocket subscriptions.
 *
 * @example
 * ```typescript
 * const options: SubscriptionOptions = {
 *   signal: controller.signal,
 *   reconnectPolicy: {
 *     type: 'exponentialBackoff',
 *     initialDelay: 100,
 *     maxDelay: 30000,
 *     multiplier: 2,
 *     maxAttempts: 10,
 *   },
 *   bufferSize: 100,
 * };
 *
 * for await (const update of client.ws.subscribeOrderbook([id], options)) {
 *   // Handle update
 * }
 * ```
 */
export interface SubscriptionOptions {
  /**
   * AbortSignal for subscription cancellation.
   *
   * When aborted, the subscription will stop and the async iterator will complete.
   *
   * @example
   * ```typescript
   * const controller = new AbortController();
   * setTimeout(() => controller.abort(), 60000); // Cancel after 1 minute
   *
   * for await (const update of client.ws.subscribeOrderbook([id], { signal: controller.signal })) {
   *   // Handle update
   * }
   * ```
   */
  signal?: AbortSignal;

  /**
   * Reconnection strategy for handling connection drops.
   *
   * Defaults to exponential backoff with sensible defaults.
   */
  reconnectPolicy?: ReconnectPolicy;

  /**
   * Maximum number of messages to buffer before applying backpressure.
   *
   * If the consumer is slow and the buffer fills, new messages will be dropped.
   *
   * @default 100
   */
  bufferSize?: number;
}

/**
 * Policy for handling WebSocket reconnection.
 *
 * @example
 * ```typescript
 * // Never reconnect (useful for one-shot subscriptions)
 * const noReconnect: ReconnectPolicy = { type: 'never' };
 *
 * // Reconnect with exponential backoff
 * const backoff: ReconnectPolicy = {
 *   type: 'exponentialBackoff',
 *   initialDelay: 100,
 *   maxDelay: 30000,
 *   multiplier: 2,
 *   maxAttempts: 10,
 * };
 * ```
 */
export type ReconnectPolicy = NeverReconnectPolicy | ExponentialBackoffPolicy;

/**
 * Policy that never attempts reconnection.
 *
 * Use this for one-shot subscriptions or when you want to handle
 * reconnection manually.
 */
export interface NeverReconnectPolicy {
  readonly type: "never";
}

/**
 * Policy that reconnects with exponential backoff.
 *
 * The delay between reconnection attempts increases exponentially:
 * `delay = min(initialDelay * multiplier^attempt, maxDelay)`
 *
 * A small jitter (±10%) is added to prevent thundering herd.
 *
 * @example
 * ```typescript
 * const policy: ExponentialBackoffPolicy = {
 *   type: 'exponentialBackoff',
 *   initialDelay: 100,    // 100ms initial delay
 *   maxDelay: 30000,      // Cap at 30 seconds
 *   multiplier: 2,        // Double each time
 *   maxAttempts: 10,      // Give up after 10 attempts
 * };
 * ```
 */
export interface ExponentialBackoffPolicy {
  readonly type: "exponentialBackoff";

  /**
   * Initial delay in milliseconds before first reconnection attempt.
   * @default 100
   */
  initialDelay?: number;

  /**
   * Maximum delay in milliseconds between reconnection attempts.
   * @default 30000
   */
  maxDelay?: number;

  /**
   * Multiplier for exponential backoff.
   * @default 2
   */
  multiplier?: number;

  /**
   * Maximum number of reconnection attempts.
   *
   * Set to undefined for unlimited attempts.
   * @default 10
   */
  maxAttempts?: number;
}

/**
 * Default reconnection policy with sensible values.
 */
export const DEFAULT_RECONNECT_POLICY: ExponentialBackoffPolicy = {
  type: "exponentialBackoff",
  initialDelay: 100,
  maxDelay: 30000,
  multiplier: 2,
  maxAttempts: 10,
};

/**
 * Default subscription options.
 */
export const DEFAULT_SUBSCRIPTION_OPTIONS: Required<Omit<SubscriptionOptions, "signal">> = {
  reconnectPolicy: DEFAULT_RECONNECT_POLICY,
  bufferSize: 100,
};

/**
 * WebSocket configuration for the WsNamespace.
 */
export interface WsConfig {
  /**
   * WebSocket endpoint URL.
   *
   * Must be a valid WebSocket URL (ws:// or wss://).
   */
  url: string;

  /**
   * Maximum number of concurrent subscriptions.
   *
   * Additional subscriptions beyond this limit will be rejected
   * with a WebSocketError.
   *
   * @default 10
   */
  maxSubscriptions?: number;

  /**
   * Default options for all subscriptions.
   */
  defaultOptions?: SubscriptionOptions;
}

/**
 * Default WebSocket configuration values.
 */
export const DEFAULT_WS_CONFIG: Required<Omit<WsConfig, "url">> = {
  maxSubscriptions: 10,
  defaultOptions: {},
};

/**
 * Options for orderbook subscription.
 */
export interface OrderbookSubscriptionOptions extends SubscriptionOptions {
  /**
   * Maximum depth of orderbook levels to receive.
   * @default 10
   */
  depth?: number;
}

/**
 * Options for bid subscription.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BidSubscriptionOptions extends SubscriptionOptions {
  // No additional options yet
}

/**
 * Options for auction bid subscription.
 */
export interface AuctionBidSubscriptionOptions extends SubscriptionOptions {
  /**
   * Specific auction ID to subscribe to.
   *
   * If not provided, receives events for all auctions.
   */
  auctionId?: bigint;
}

// ==========================================================================
// Tagged Message Protocol (not JSON-RPC)
// ==========================================================================

/**
 * WebSocket channels supported by the pod network node.
 */
export type WebSocketChannel = "orderbook" | "bids" | "auction_bids";

/**
 * Subscription parameters for WebSocket subscriptions.
 * @internal
 */
export interface WsSubscriptionParams {
  /** Maximum depth of levels to include */
  depth?: number;
  /** CLOB IDs to filter (for orderbook and bids channels) */
  clob_ids?: readonly string[];
}

/**
 * Subscribe message to send to server.
 * @internal
 */
export interface WsSubscribeMessage {
  type: "subscribe";
  channel: WebSocketChannel;
  params?: WsSubscriptionParams;
}

/**
 * Unsubscribe message to send to server.
 * @internal
 */
export interface WsUnsubscribeMessage {
  type: "unsubscribe";
  channel: WebSocketChannel;
}

/**
 * Subscribed acknowledgment from server.
 * @internal
 */
export interface WsSubscribedMessage {
  type: "subscribed";
  channel: string;
}

/**
 * Unsubscribed acknowledgment from server.
 * @internal
 */
export interface WsUnsubscribedMessage {
  type: "unsubscribed";
  channel: string;
}

/**
 * Error message from server.
 * @internal
 */
export interface WsErrorMessage {
  type: "error";
  message: string;
}

/**
 * Tick snapshot for a price level.
 * @internal
 */
export interface TickSnapshot {
  volume: string;
  minimum_expiry: number;
}

/**
 * Orderbook snapshot message from server.
 * @internal
 */
export interface WsOrderbookSnapshotMessage {
  type: "orderbook_snapshot";
  clob_id: string;
  buys: Record<string, TickSnapshot>;
  sells: Record<string, TickSnapshot>;
  grouping_precision: string;
  timestamp: number;
  new_bids_count: number;
}

/**
 * CLOB bid info in bid events.
 * @internal
 */
export interface WsCLOBBidInfo {
  tx_hash: string;
  bidder: string;
  volume: string;
  price: string;
  side: "buy" | "sell";
  start_ts: number;
  end_ts: number;
  nonce: number;
}

/**
 * CLOB bids added message from server.
 * @internal
 */
export interface WsCLOBBidsAddedMessage {
  type: "clob_bids_added";
  clob_id: string;
  bids: WsCLOBBidInfo[];
  timestamp: number;
}

/**
 * Auction bid info in auction bid events.
 * @internal
 */
export interface WsAuctionBidInfo {
  tx_hash: string;
  bidder: string;
  auction_id: string;
  value: string;
  data: string;
  deadline: number;
}

/**
 * Auction bids added message from server.
 * @internal
 */
export interface WsAuctionBidsAddedMessage {
  type: "auction_bids_added";
  bids: WsAuctionBidInfo[];
  timestamp: number;
}

/**
 * All possible server messages.
 * @internal
 */
export type WsServerMessage =
  | WsSubscribedMessage
  | WsUnsubscribedMessage
  | WsErrorMessage
  | WsOrderbookSnapshotMessage
  | WsCLOBBidsAddedMessage
  | WsAuctionBidsAddedMessage;

/**
 * All possible client messages.
 * @internal
 */
export type WsClientMessage = WsSubscribeMessage | WsUnsubscribeMessage;

/**
 * WebSocket connection state.
 */
export type ConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting";

/**
 * Internal subscription state.
 * @internal
 */
export interface SubscriptionState<T> {
  /** Subscription ID from the server */
  id: string;
  /** Pending messages in the buffer */
  buffer: T[];
  /** Whether the subscription is active */
  active: boolean;
  /** Callback for new messages */
  onMessage?: (message: T) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
  /** Callback for completion */
  onComplete?: () => void;
}
