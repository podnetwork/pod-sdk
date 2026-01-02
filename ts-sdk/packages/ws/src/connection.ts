/**
 * @module ws/connection
 * @description WebSocket connection manager with reconnection and subscription tracking
 */

import { PodExecutionError, getLogger, LoggerCategory } from "@podnetwork/core";
import { ReconnectionManager } from "./reconnect.js";
import type {
  ConnectionState,
  ReconnectPolicy,
  WsConfig,
  WebSocketChannel,
  WsSubscriptionParams,
  WsServerMessage,
} from "./types.js";
import { DEFAULT_RECONNECT_POLICY, DEFAULT_WS_CONFIG } from "./types.js";

const logger = getLogger(LoggerCategory.CORE);

/**
 * Event types for WebSocket connection events.
 */
export type ConnectionEvent =
  | { type: "connected" }
  | { type: "disconnected"; reason?: string }
  | { type: "reconnecting"; attempt: number }
  | { type: "error"; error: Error };

/**
 * Callback for connection events.
 */
export type ConnectionEventCallback = (event: ConnectionEvent) => void;

/**
 * Active subscription with handlers.
 * @internal
 */
interface ActiveSubscription<T = unknown> {
  channel: WebSocketChannel;
  messageHandler: (data: T) => void;
  errorHandler: (error: Error) => void;
  completeHandler: () => void;
}

/**
 * WebSocket connection manager with automatic reconnection and subscription tracking.
 *
 * Uses the pod node's tagged message protocol (not JSON-RPC):
 * - Client sends: `{type: "subscribe", channel: "orderbook", params: {...}}`
 * - Server responds: `{type: "subscribed", channel: "orderbook"}`
 * - Server sends data: `{type: "orderbook_snapshot", clob_id: "...", ...}`
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Subscription limit enforcement
 * - Re-subscription after reconnection
 * - Message routing to subscription handlers
 *
 * @example
 * ```typescript
 * const connection = new WebSocketConnection({
 *   url: 'wss://ws.testnet.pod.network',
 *   maxSubscriptions: 10,
 * });
 *
 * // Connect and subscribe
 * await connection.connect();
 *
 * await connection.subscribe(
 *   'orderbook',
 *   { depth: 10, clob_ids: [orderbookId] },
 *   (update) => console.log(update),
 *   (error) => console.error(error),
 *   () => console.log('Done'),
 * );
 *
 * // Later, unsubscribe
 * await connection.unsubscribe('orderbook');
 *
 * // Clean up
 * await connection.disconnect();
 * ```
 */
export class WebSocketConnection {
  private readonly url: string;
  private readonly maxSubscriptions: number;
  private readonly defaultReconnectPolicy: ReconnectPolicy;

  private ws: WebSocket | null = null;
  private state: ConnectionState = "disconnected";
  private reconnectionManager: ReconnectionManager | null = null;
  private isReconnecting = false;
  private reconnectAbortController: AbortController | null = null;

  /** Active subscriptions keyed by channel name */
  private readonly subscriptions = new Map<WebSocketChannel, ActiveSubscription>();
  /** Pending subscribe requests waiting for server acknowledgment */
  private readonly pendingSubscribes = new Map<
    WebSocketChannel,
    { resolve: () => void; reject: (error: Error) => void }
  >();
  /** Subscription metadata for re-subscription after reconnect */
  private readonly subscriptionMeta = new Map<
    WebSocketChannel,
    { channel: WebSocketChannel; params: WsSubscriptionParams | undefined }
  >();
  /** Connection event listeners */
  private readonly eventListeners = new Set<ConnectionEventCallback>();

  /**
   * Creates a new WebSocketConnection.
   *
   * @param config - WebSocket configuration
   */
  constructor(config: WsConfig) {
    this.url = config.url;
    this.maxSubscriptions = config.maxSubscriptions ?? DEFAULT_WS_CONFIG.maxSubscriptions;
    this.defaultReconnectPolicy =
      config.defaultOptions?.reconnectPolicy ?? DEFAULT_RECONNECT_POLICY;

    logger.debug("WebSocketConnection created", {
      url: this.url,
      maxSubscriptions: this.maxSubscriptions,
    });
  }

  /**
   * Gets the current connection state.
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Gets the number of active subscriptions.
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Gets the maximum number of subscriptions allowed.
   */
  getMaxSubscriptions(): number {
    return this.maxSubscriptions;
  }

  /**
   * Checks if the connection can accept more subscriptions.
   */
  canSubscribe(): boolean {
    return this.subscriptions.size < this.maxSubscriptions;
  }

  /**
   * Adds a connection event listener.
   */
  addEventListener(callback: ConnectionEventCallback): void {
    this.eventListeners.add(callback);
  }

  /**
   * Removes a connection event listener.
   */
  removeEventListener(callback: ConnectionEventCallback): void {
    this.eventListeners.delete(callback);
  }

  /**
   * Emits a connection event to all listeners.
   * @internal
   */
  private emit(event: ConnectionEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        logger.error("Event listener error", { error });
      }
    }
  }

  /**
   * Connects to the WebSocket server.
   *
   * @throws WebSocketError if connection fails
   */
  async connect(): Promise<void> {
    if (this.state === "connected" || this.state === "connecting") {
      return;
    }

    this.state = "connecting";
    logger.info("WebSocket connecting", { url: this.url });

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
      } catch (error) {
        this.state = "disconnected";
        const wsError = PodExecutionError.wsConnectionFailed(this.url, error as Error);
        reject(wsError);
        return;
      }

      const onOpen = (): void => {
        cleanup();
        this.state = "connected";
        logger.info("WebSocket connected", { url: this.url });
        this.emit({ type: "connected" });

        // Reset reconnection state on successful connection
        if (this.reconnectionManager !== null) {
          this.reconnectionManager.reset();
        }

        resolve();
      };

      const onError = (event: Event): void => {
        cleanup();
        this.state = "disconnected";
        // ErrorEvent type may not be available in all runtimes
        const errorMessage =
          (event as { message?: string }).message ?? "WebSocket connection failed";
        const wsError = PodExecutionError.wsConnectionFailed(this.url, new Error(errorMessage));
        logger.error("WebSocket connection error", { url: this.url, error: errorMessage });
        this.emit({ type: "error", error: wsError });
        reject(wsError);
      };

      const cleanup = (): void => {
        this.ws?.removeEventListener("open", onOpen);
        this.ws?.removeEventListener("error", onError);
      };

      this.ws.addEventListener("open", onOpen);
      this.ws.addEventListener("error", onError);

      // Set up message and close handlers after connection
      this.ws.addEventListener("message", this.handleMessage.bind(this));
      this.ws.addEventListener("close", this.handleClose.bind(this));
    });
  }

  /**
   * Disconnects from the WebSocket server.
   */
  async disconnect(): Promise<void> {
    // Stop any reconnection attempts
    this.cancelReconnection();

    if (this.ws === null || this.state === "disconnected") {
      return;
    }

    logger.info("WebSocket disconnecting", { url: this.url });

    return new Promise((resolve) => {
      if (this.ws === null) {
        resolve();
        return;
      }

      const onClose = (): void => {
        this.ws?.removeEventListener("close", onClose);
        this.state = "disconnected";
        this.ws = null;
        resolve();
      };

      this.ws.addEventListener("close", onClose);
      this.ws.close(1000, "Client disconnect");

      // Timeout if close doesn't happen
      setTimeout(() => {
        if (this.ws !== null) {
          this.ws.removeEventListener("close", onClose);
          this.state = "disconnected";
          this.ws = null;
          resolve();
        }
      }, 5000);
    });
  }

  /**
   * Creates a subscription to a WebSocket channel.
   *
   * @param channel - The channel to subscribe to ('orderbook', 'bids', or 'auction_bids')
   * @param params - Optional subscription parameters
   * @param onMessage - Handler for subscription messages
   * @param onError - Handler for errors
   * @param onComplete - Handler for subscription completion
   * @returns Promise resolving to the channel name (used for unsubscribe)
   *
   * @throws WebSocketError if subscription limit exceeded or connection fails
   */
  async subscribe(
    channel: WebSocketChannel,
    params: WsSubscriptionParams | undefined,
    onMessage: (data: unknown) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ): Promise<WebSocketChannel> {
    // Check subscription limit
    if (!this.canSubscribe()) {
      throw PodExecutionError.wsSubscriptionLimit(this.subscriptions.size, this.maxSubscriptions);
    }

    // Check if already subscribed to this channel
    if (this.subscriptions.has(channel)) {
      throw PodExecutionError.wsSendError(`Already subscribed to channel: ${channel}`);
    }

    // Ensure connected
    if (this.state !== "connected") {
      await this.connect();
    }

    logger.debug("Creating subscription", { channel, params });

    // Send subscribe message and wait for acknowledgment
    await this.sendSubscribe(channel, params);

    // Store subscription
    this.subscriptions.set(channel, {
      channel,
      messageHandler: onMessage,
      errorHandler: onError,
      completeHandler: onComplete,
    });

    // Store metadata for re-subscription
    this.subscriptionMeta.set(channel, { channel, params });

    logger.info("Subscription created", { channel });

    return channel;
  }

  /**
   * Unsubscribes from a channel.
   *
   * @param channel - The channel to unsubscribe from
   */
  unsubscribe(channel: WebSocketChannel): void {
    const subscription = this.subscriptions.get(channel);
    if (subscription === undefined) {
      return;
    }

    logger.debug("Unsubscribing", { channel });

    try {
      if (this.state === "connected") {
        this.sendUnsubscribe(channel);
      }
    } catch (error) {
      // Ignore errors during unsubscribe
      logger.warn("Unsubscribe error (ignored)", { channel, error });
    }

    // Call complete handler
    try {
      subscription.completeHandler();
    } catch (error) {
      logger.error("Complete handler error", { channel, error });
    }

    // Remove subscription
    this.subscriptions.delete(channel);
    this.subscriptionMeta.delete(channel);

    logger.info("Unsubscribed", { channel });
  }

  /**
   * Sends a subscribe message and waits for acknowledgment.
   * @internal
   */
  private async sendSubscribe(
    channel: WebSocketChannel,
    params?: WsSubscriptionParams
  ): Promise<void> {
    if (this.ws === null || this.state !== "connected") {
      throw PodExecutionError.wsConnectionFailed(this.url, new Error("Not connected"));
    }

    const message = {
      type: "subscribe" as const,
      channel,
      ...(params !== undefined ? { params } : {}),
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingSubscribes.delete(channel);
        reject(PodExecutionError.wsSendError("Subscribe timeout"));
      }, 30000);

      this.pendingSubscribes.set(channel, {
        resolve: () => {
          clearTimeout(timeout);
          resolve();
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });

      try {
        this.ws?.send(JSON.stringify(message));
        logger.debug("Sent subscribe", { channel, params });
      } catch (error) {
        clearTimeout(timeout);
        this.pendingSubscribes.delete(channel);
        reject(PodExecutionError.wsSendError((error as Error).message, error as Error));
      }
    });
  }

  /**
   * Sends an unsubscribe message (fire and forget).
   * @internal
   */
  private sendUnsubscribe(channel: WebSocketChannel): void {
    if (this.ws === null || this.state !== "connected") {
      return;
    }

    const message = {
      type: "unsubscribe" as const,
      channel,
    };

    try {
      this.ws.send(JSON.stringify(message));
      logger.debug("Sent unsubscribe", { channel });
    } catch (error) {
      logger.warn("Failed to send unsubscribe", { channel, error });
    }
  }

  /**
   * Handles incoming WebSocket messages using the tagged message protocol.
   * @internal
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data as string) as WsServerMessage;

      // Route message based on type
      switch (data.type) {
        case "subscribed": {
          // Subscription acknowledged
          const pending = this.pendingSubscribes.get(data.channel as WebSocketChannel);
          if (pending !== undefined) {
            this.pendingSubscribes.delete(data.channel as WebSocketChannel);
            pending.resolve();
          }
          logger.debug("Received subscribed ack", { channel: data.channel });
          break;
        }

        case "unsubscribed": {
          // Unsubscription acknowledged (usually we don't wait for this)
          logger.debug("Received unsubscribed ack", { channel: data.channel });
          break;
        }

        case "error": {
          // Error from server - could be in response to a subscribe
          logger.error("Received error from server", { message: data.message });

          // Check if there's a pending subscribe that should be rejected
          for (const [channel, pending] of this.pendingSubscribes) {
            this.pendingSubscribes.delete(channel);
            pending.reject(PodExecutionError.wsServerError(-1, data.message));
          }
          break;
        }

        case "orderbook_snapshot": {
          // Route to orderbook subscription
          const orderbookSub = this.subscriptions.get("orderbook");
          if (orderbookSub !== undefined) {
            try {
              orderbookSub.messageHandler(data);
            } catch (error) {
              logger.error("Message handler error", { channel: "orderbook", error });
              orderbookSub.errorHandler(error as Error);
            }
          }
          break;
        }

        case "clob_bids_added": {
          // Route to bids subscription
          const bidsSub = this.subscriptions.get("bids");
          if (bidsSub !== undefined) {
            try {
              bidsSub.messageHandler(data);
            } catch (error) {
              logger.error("Message handler error", { channel: "bids", error });
              bidsSub.errorHandler(error as Error);
            }
          }
          break;
        }

        case "auction_bids_added": {
          // Route to auction bids subscription
          const auctionSub = this.subscriptions.get("auction_bids");
          if (auctionSub !== undefined) {
            try {
              auctionSub.messageHandler(data);
            } catch (error) {
              logger.error("Message handler error", { channel: "auction_bids", error });
              auctionSub.errorHandler(error as Error);
            }
          }
          break;
        }

        default: {
          logger.warn("Unknown message type", { data });
        }
      }
    } catch (error) {
      logger.error("Failed to parse WebSocket message", { error });
    }
  }

  /**
   * Handles WebSocket close events.
   * @internal
   */
  private handleClose(event: { code?: number; reason?: string }): void {
    const wasConnected = this.state === "connected";
    this.state = "disconnected";
    this.ws = null;

    logger.warn("WebSocket closed", {
      code: event.code,
      reason: event.reason,
      wasConnected,
    });

    if (event.reason !== undefined) {
      this.emit({ type: "disconnected", reason: event.reason });
    } else {
      this.emit({ type: "disconnected" });
    }

    // Reject all pending subscribe requests
    for (const pending of this.pendingSubscribes.values()) {
      pending.reject(
        PodExecutionError.wsConnectionFailed(this.url, new Error("Connection closed"))
      );
    }
    this.pendingSubscribes.clear();

    // Attempt reconnection if we were connected and have subscriptions
    if (wasConnected && this.subscriptions.size > 0 && !this.isReconnecting) {
      void this.attemptReconnection();
    }
  }

  /**
   * Attempts to reconnect using the configured policy.
   * @internal
   */
  private async attemptReconnection(): Promise<void> {
    if (this.isReconnecting) {
      return;
    }

    // Initialize reconnection manager if needed
    this.reconnectionManager ??= new ReconnectionManager(this.defaultReconnectPolicy);

    // Check if we should reconnect
    if (!this.reconnectionManager.shouldRetry()) {
      logger.error("Reconnection attempts exhausted");
      this.notifySubscriptionsOfError(
        PodExecutionError.wsConnectionFailed(this.url, new Error("Reconnection attempts exhausted"))
      );
      return;
    }

    this.isReconnecting = true;
    this.state = "reconnecting";
    this.reconnectAbortController = new AbortController();

    const attempt = this.reconnectionManager.currentAttempt;
    logger.info("Attempting reconnection", { attempt });
    this.emit({ type: "reconnecting", attempt });

    try {
      // Wait for backoff delay
      await this.reconnectionManager.wait(this.reconnectAbortController.signal);

      // Attempt connection
      await this.connect();

      // Re-subscribe to all subscriptions
      await this.resubscribeAll();

      this.reconnectionManager.reset();
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        logger.info("Reconnection cancelled");
        return;
      }

      logger.error("Reconnection failed", { attempt, error });
      this.reconnectionManager.recordFailure();

      // Try again
      this.isReconnecting = false;
      void this.attemptReconnection();
    } finally {
      this.isReconnecting = false;
      this.reconnectAbortController = null;
    }
  }

  /**
   * Re-subscribes all active subscriptions after reconnection.
   * @internal
   */
  private async resubscribeAll(): Promise<void> {
    const toResubscribe = [...this.subscriptionMeta.entries()];
    const oldSubscriptions = new Map(this.subscriptions);

    // Clear old subscriptions (they'll be recreated)
    this.subscriptions.clear();
    this.subscriptionMeta.clear();

    for (const [channel, meta] of toResubscribe) {
      const oldSub = oldSubscriptions.get(channel);
      if (oldSub === undefined) continue;

      try {
        // Send subscribe message and wait for acknowledgment
        await this.sendSubscribe(meta.channel, meta.params);

        // Restore subscription with same handlers
        this.subscriptions.set(channel, {
          channel,
          messageHandler: oldSub.messageHandler,
          errorHandler: oldSub.errorHandler,
          completeHandler: oldSub.completeHandler,
        });

        this.subscriptionMeta.set(channel, meta);

        logger.info("Re-subscribed", { channel });
      } catch (error) {
        logger.error("Failed to re-subscribe", { channel, error });
        oldSub.errorHandler(error as Error);
        oldSub.completeHandler();
      }
    }
  }

  /**
   * Notifies all subscriptions of an error.
   * @internal
   */
  private notifySubscriptionsOfError(error: Error): void {
    for (const subscription of this.subscriptions.values()) {
      try {
        subscription.errorHandler(error);
        subscription.completeHandler();
      } catch (e) {
        logger.error("Error notifying subscription", { error: e });
      }
    }
    this.subscriptions.clear();
    this.subscriptionMeta.clear();
  }

  /**
   * Cancels any ongoing reconnection attempt.
   */
  cancelReconnection(): void {
    if (this.reconnectAbortController !== null) {
      this.reconnectAbortController.abort();
      this.reconnectAbortController = null;
    }
    this.isReconnecting = false;
  }
}
