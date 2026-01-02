/**
 * @module hooks/use-bids
 * @description Hook for subscribing to bid lifecycle events
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PodError } from "@podnetwork/core";
import { useClient } from "../providers/client-provider.js";
import { useRetry } from "./internal/use-retry.js";
import type { RetryState, BidEvent, Hash, PodError as PodErrorType } from "../types.js";
import type { RetryConfig } from "../types.js";

/**
 * Options for useBids hook.
 * @category Hooks
 */
export interface UseBidsOptions {
  /** Retry configuration */
  readonly retry?: RetryConfig;
  /** Whether to enable the subscription. Default: true */
  readonly enabled?: boolean;
  /** Maximum number of bid events to keep in history. Default: 100 */
  readonly maxHistory?: number;
}

/**
 * Connection state for the bid subscription.
 * @category Hooks
 */
export type BidConnectionState = "connecting" | "connected" | "disconnected" | "error";

/**
 * Return type for useBids hook.
 * @category Hooks
 */
export interface UseBidsResult {
  /** List of bid events (most recent first) */
  readonly bids: readonly BidEvent[];
  /** Most recent bid event */
  readonly latestBid: BidEvent | null;
  /** Connection state */
  readonly connectionState: BidConnectionState;
  /** Whether connected and receiving updates */
  readonly isConnected: boolean;
  /** Whether loading initial data */
  readonly isLoading: boolean;
  /** Error if any */
  readonly error: PodErrorType | null;
  /** Current retry state */
  readonly retry: RetryState;
  /** Timestamp of last update */
  readonly lastUpdate: Date | null;
  /** Clear the bid history */
  readonly clearHistory: () => void;
  /** Manually reconnect */
  readonly reconnect: () => void;
}

/**
 * Hook for subscribing to bid lifecycle events.
 *
 * @param txHash - Transaction hash to monitor bids for, or null for all bids
 * @param options - Hook configuration options
 * @returns Bid events, connection state, and actions
 *
 * @example
 * ```tsx
 * function BidWatcher({ txHash }: { txHash?: Hash }) {
 *   const { bids, latestBid, isConnected } = useBids(txHash);
 *
 *   return (
 *     <div>
 *       <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
 *       {latestBid && (
 *         <div>Latest bid: {latestBid.amount}</div>
 *       )}
 *       <ul>
 *         {bids.map((bid, i) => (
 *           <li key={i}>{bid.amount}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function useBids(txHash: Hash | null = null, options: UseBidsOptions = {}): UseBidsResult {
  const { retry: retryConfig = {}, enabled = true, maxHistory = 100 } = options;

  const client = useClient();

  const [bids, setBids] = useState<readonly BidEvent[]>([]);
  const [connectionState, setConnectionState] = useState<BidConnectionState>("disconnected");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<PodErrorType | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController>(undefined);
  const subscribeRef = useRef<() => Promise<void>>(undefined);

  // Stable callback for retry - uses ref so it doesn't need to change
  const handleRetry = useCallback(async () => {
    await subscribeRef.current?.();
  }, []);

  // Use centralized retry hook
  const {
    state: retryState,
    scheduleRetry,
    reset: resetRetry,
    cancel: cancelRetry,
  } = useRetry({
    config: retryConfig,
    onRetry: handleRetry,
  });

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current !== undefined) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Subscribe to bids
  const subscribe = useCallback(async (): Promise<void> => {
    if (!enabled) return;

    // Abort any existing subscription
    if (abortControllerRef.current !== undefined) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setIsLoading(true);
    setConnectionState("connecting");
    setError(null);

    try {
      // The WebSocket client for bids would be accessed via the WS package
      const wsClient = (
        client as unknown as {
          ws?: {
            subscribeBids: (
              txHash: Hash | null,
              onBid: (bid: BidEvent) => void,
              signal: AbortSignal
            ) => Promise<void>;
          };
        }
      ).ws;

      if (wsClient === undefined) {
        throw new Error("WebSocket client not available. Ensure @podnetwork/ws is configured.");
      }

      if (isMountedRef.current) {
        setConnectionState("connected");
        setIsLoading(false);
      }

      await wsClient.subscribeBids(
        txHash,
        (bid) => {
          if (!isMountedRef.current) return;

          setBids((prev) => {
            const newBids = [bid, ...prev];
            return newBids.slice(0, maxHistory);
          });
          setLastUpdate(new Date());
        },
        signal
      );
    } catch (err) {
      if (signal.aborted) return;
      if (!isMountedRef.current) return;

      const podError = PodError.from(err);
      setError(podError);
      setConnectionState("error");
      setIsLoading(false);

      // Schedule retry if applicable
      if (podError.isRetryable) {
        scheduleRetry();
      }
    }
  }, [enabled, client, txHash, maxHistory, scheduleRetry]);

  // Update ref for retry callback
  subscribeRef.current = subscribe;

  // Connect on mount/changes
  useEffect(() => {
    if (enabled) {
      void subscribe();
    }

    return () => {
      if (abortControllerRef.current !== undefined) {
        abortControllerRef.current.abort();
      }
      cancelRetry();
    };
  }, [enabled, subscribe, cancelRetry]);

  // Clear history
  const clearHistory = useCallback(() => {
    setBids([]);
  }, []);

  // Manual reconnect
  const reconnect = useCallback(() => {
    resetRetry();
    void subscribe();
  }, [subscribe, resetRetry]);

  return useMemo(
    () => ({
      bids,
      latestBid: bids[0] ?? null,
      connectionState,
      isConnected: connectionState === "connected",
      isLoading,
      error,
      retry: retryState,
      lastUpdate,
      clearHistory,
      reconnect,
    }),
    [bids, connectionState, isLoading, error, retryState, lastUpdate, clearHistory, reconnect]
  );
}
