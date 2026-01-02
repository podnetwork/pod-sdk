/**
 * @module hooks/use-orderbook
 * @description Hook for fetching and subscribing to orderbook data
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { PodError, HashSchema } from "@podnetwork/core";
import { useClient } from "../providers/client-provider.js";
import { useClientContext } from "../providers/client-provider.js";
import { useWallet } from "./use-wallet.js";
import {
  OrderbookNamespace,
  OrderBook,
  type OrderLevel,
  OrderBookBid,
} from "@podnetwork/orderbook";
import { WsNamespace } from "@podnetwork/ws";
import type { Hash, RetryConfig, RetryState, PodError as PodErrorType } from "../types.js";
import { DEFAULT_RETRY_CONFIG } from "../types.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Connection state for WebSocket subscriptions.
 * @category Hooks
 */
export type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

/**
 * Options for useOrderbook hook.
 * @category Hooks
 */
export interface UseOrderbookOptions {
  /** Maximum depth (levels per side). Default: 50 */
  readonly depth?: number;
  /** Whether to subscribe to real-time updates. Default: true */
  readonly subscribe?: boolean;
  /** Batch interval for updates in ms. Default: 100 */
  readonly batchInterval?: number;
  /** Retry configuration for WebSocket reconnection */
  readonly retry?: RetryConfig;
  /** Whether the hook is enabled. Default: true */
  readonly enabled?: boolean;
}

/**
 * Result returned by useOrderbook hook.
 * @category Hooks
 */
export interface UseOrderbookResult {
  /** The full orderbook object */
  readonly orderbook: OrderBook | null;
  /** Bid levels (highest price first) */
  readonly bids: readonly OrderLevel[];
  /** Ask levels (lowest price first) */
  readonly asks: readonly OrderLevel[];
  /** Best bid price */
  readonly bestBid: bigint | null;
  /** Best ask price */
  readonly bestAsk: bigint | null;
  /** Spread between best ask and best bid */
  readonly spread: bigint | null;
  /** Submit a bid order */
  readonly submitBid: (price: bigint, volume: bigint, side: "buy" | "sell") => Promise<Hash>;
  /** Alias for orderbook (matches DataHookResult pattern) */
  readonly data: OrderBook | null;
  /** Whether the initial load is in progress */
  readonly isLoading: boolean;
  /** Error if the request failed */
  readonly error: PodErrorType | null;
  /** Current retry state */
  readonly retry: RetryState;
  /** WebSocket connection state */
  readonly connectionState: ConnectionState;
  /** Timestamp of last update */
  readonly lastUpdate: Date | null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for subscribing to real-time orderbook data via WebSocket.
 *
 * Note: Orderbook data is only available via WebSocket subscription.
 * There is no RPC endpoint for fetching orderbook snapshots.
 *
 * @param orderbookId - The CLOB orderbook ID to track
 * @param options - Configuration options
 * @returns Orderbook data, mutation functions, and state
 *
 * @example
 * ```tsx
 * function OrderbookDisplay({ orderbookId }: { orderbookId: `0x${string}` }) {
 *   const {
 *     bids,
 *     asks,
 *     bestBid,
 *     bestAsk,
 *     spread,
 *     isLoading,
 *     error,
 *     connectionState,
 *   } = useOrderbook(orderbookId, { subscribe: true, depth: 10 });
 *
 *   if (connectionState === 'connecting') return <div>Connecting...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <p>Best Bid: {bestBid?.toString()}</p>
 *       <p>Best Ask: {bestAsk?.toString()}</p>
 *       <p>Spread: {spread?.toString()}</p>
 *       <div>
 *         {bids.map((level, i) => (
 *           <div key={i}>{level.price.toString()} - {level.volume.toString()}</div>
 *         ))}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useOrderbook(
  orderbookId: Hash | null | undefined,
  options: UseOrderbookOptions = {}
): UseOrderbookResult {
  const {
    depth = 50,
    subscribe = true,
    retry: retryConfig = DEFAULT_RETRY_CONFIG,
    enabled = true,
  } = options;

  const client = useClient();
  const { hasWsSupport } = useClientContext();
  const { signer } = useWallet();

  // State
  const [orderbook, setOrderbook] = useState<OrderBook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<PodErrorType | null>(null);
  const [retryState, setRetryState] = useState<RetryState>({
    attempt: 0,
    nextRetryAt: null,
    isRetrying: false,
  });
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Refs
  const namespaceRef = useRef<OrderbookNamespace | null>(null);
  const wsNamespaceRef = useRef<WsNamespace | null>(null);
  const wsAbortControllerRef = useRef<AbortController | null>(null);

  // Suppress unused variable warning for retryConfig (reserved for future WS reconnection)
  void retryConfig;

  // Create namespace lazily
  const getNamespace = useCallback((): OrderbookNamespace => {
    if (namespaceRef.current === null) {
      const txSender = client.getTransactionSender();
      // Access the internal URL from client configuration
      // Using rpc namespace which inherits from JsonRpcClient
      const clientUrl =
        (client.rpc as unknown as { url?: string }).url ?? "https://rpc.dev.pod.network";
      const config = {
        url: clientUrl,
        timeout: 30000,
        maxRetries: 3,
      };
      namespaceRef.current = new OrderbookNamespace(config, txSender);
    }
    return namespaceRef.current;
  }, [client]);

  // Derived values
  const bids = useMemo(() => orderbook?.bids ?? [], [orderbook]);
  const asks = useMemo(() => orderbook?.asks ?? [], [orderbook]);
  const bestBid = useMemo(() => orderbook?.bestBid() ?? null, [orderbook]);
  const bestAsk = useMemo(() => orderbook?.bestAsk() ?? null, [orderbook]);
  const spread = useMemo(() => orderbook?.spread() ?? null, [orderbook]);

  // Submit bid function
  const submitBid = useCallback(
    async (price: bigint, volume: bigint, side: "buy" | "sell"): Promise<Hash> => {
      if (orderbookId === null || orderbookId === undefined) {
        throw new Error("Orderbook ID is required");
      }
      if (signer === null) {
        throw new Error("Wallet must be connected to submit bids");
      }

      const namespace = getNamespace();
      const bid = OrderBookBid.builder()
        .side(side)
        .price(price)
        .volume(volume)
        .orderbookId(orderbookId)
        .build();

      // Cast signer - OrderbookSigner is a subset of our Signer type
      const pending = await namespace.submitBid(
        bid,
        signer as unknown as Parameters<typeof namespace.submitBid>[1]
      );
      return pending.txHash;
    },
    [orderbookId, signer, getNamespace]
  );

  // WebSocket subscription
  useEffect(() => {
    if (orderbookId === null || orderbookId === undefined || !enabled || !subscribe) {
      setConnectionState("disconnected");
      return;
    }

    // Check if WebSocket is available
    const wsUrl = client.wsUrl;
    if (!hasWsSupport || wsUrl === undefined) {
      // Fall back to polling when WS not available
      setConnectionState("disconnected");
      return;
    }

    // Create abort controller for cleanup
    const abortController = new AbortController();
    wsAbortControllerRef.current = abortController;

    // Create WsNamespace if not already created
    wsNamespaceRef.current ??= new WsNamespace({ url: wsUrl });

    const wsNamespace = wsNamespaceRef.current;

    // Start subscription
    const runSubscription = async (): Promise<void> => {
      setConnectionState("connecting");

      try {
        const subscription = wsNamespace.subscribeOrderbook([orderbookId], {
          depth,
          signal: abortController.signal,
        });

        setConnectionState("connected");

        for await (const update of subscription) {
          if (abortController.signal.aborted) break;

          // Convert OrderBookUpdateHelper to OrderBook
          const newOrderbook = new OrderBook({
            orderbookId: HashSchema.parse(update.clobId),
            bids: update.bids.map((level) => ({
              price: level.price,
              volume: level.volume,
              minimumExpiry: level.minimumExpiry,
            })),
            asks: update.asks.map((level) => ({
              price: level.price,
              volume: level.volume,
              minimumExpiry: level.minimumExpiry,
            })),
          });

          setOrderbook(newOrderbook);
          setLastUpdate(new Date());
          setError(null);
          setRetryState({ attempt: 0, nextRetryAt: null, isRetrying: false });
          setIsLoading(false);
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setConnectionState("error");
        setError(PodError.from(err));
      }
    };

    void runSubscription();

    return () => {
      abortController.abort();
      wsAbortControllerRef.current = null;
      setConnectionState("disconnected");
    };
  }, [orderbookId, enabled, subscribe, depth, client.wsUrl, hasWsSupport]);

  return {
    orderbook,
    bids,
    asks,
    bestBid,
    bestAsk,
    spread,
    submitBid,
    data: orderbook,
    isLoading,
    error,
    retry: retryState,
    connectionState,
    lastUpdate,
  };
}
