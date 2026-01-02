/**
 * @module hooks/use-auction
 * @description Hook for subscribing to auction bids and placing bids
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PodError, HashSchema } from "@podnetwork/core";
import { AuctionBid } from "@podnetwork/auction";
import { WsNamespace } from "@podnetwork/ws";
import { useClient } from "../providers/client-provider.js";
import { useClientContext } from "../providers/client-provider.js";
import { useWallet } from "./use-wallet.js";
import type {
  RetryState,
  AuctionBidInfo,
  Hash,
  PodError as PodErrorType,
  RetryConfig,
} from "../types.js";
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
 * Options for useAuction hook.
 * @category Hooks
 */
export interface UseAuctionOptions {
  /** Retry configuration for WebSocket reconnection */
  readonly retry?: RetryConfig;
  /** Whether to enable the subscription. Default: true */
  readonly enabled?: boolean;
  /** Whether to subscribe to real-time bid updates. Default: true */
  readonly subscribe?: boolean;
}

/**
 * Return type for useAuction hook.
 * @category Hooks
 */
export interface UseAuctionResult {
  /** List of bids received via WebSocket (most recent first) */
  readonly bids: readonly AuctionBidInfo[];
  /** Most recent bid */
  readonly latestBid: AuctionBidInfo | null;
  /** Whether loading initial subscription */
  readonly isLoading: boolean;
  /** Error if any */
  readonly error: PodErrorType | null;
  /** Current retry state */
  readonly retry: RetryState;
  /** Submit a bid to an auction */
  readonly submitBid: (
    auctionId: bigint,
    amount: bigint,
    options?: { deadlineMinutes?: number; data?: `0x${string}` }
  ) => Promise<Hash>;
  /** WebSocket connection state */
  readonly connectionState: ConnectionState;
  /** Timestamp of last update */
  readonly lastUpdate: Date | null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for subscribing to auction bids and placing bids.
 *
 * Note: Auction bid data is only available via WebSocket subscription.
 * There is no RPC endpoint for fetching auction status or bids.
 *
 * @param options - Hook configuration options
 * @returns Auction bids from WebSocket and submit function
 *
 * @example
 * ```tsx
 * function AuctionPanel() {
 *   const {
 *     bids,
 *     latestBid,
 *     submitBid,
 *     connectionState,
 *     error,
 *   } = useAuction();
 *
 *   const handleBid = async () => {
 *     const txHash = await submitBid(auctionId, BigInt("1000000000000000000"), {
 *       deadlineMinutes: 5,
 *     });
 *     console.log('Bid submitted:', txHash);
 *   };
 *
 *   if (connectionState === 'connecting') return <div>Connecting...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <p>Connection: {connectionState}</p>
 *       {latestBid && (
 *         <p>Latest bid: {latestBid.value.toString()} from {latestBid.bidder}</p>
 *       )}
 *       <button onClick={handleBid}>Place Bid</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuction(options: UseAuctionOptions = {}): UseAuctionResult {
  const { retry: retryConfig = DEFAULT_RETRY_CONFIG, enabled = true, subscribe = true } = options;

  const client = useClient();
  const { hasWsSupport } = useClientContext();
  const { signer } = useWallet();

  // State
  const [bids, setBids] = useState<readonly AuctionBidInfo[]>([]);
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
  const wsNamespaceRef = useRef<WsNamespace | null>(null);
  const wsAbortControllerRef = useRef<AbortController | null>(null);

  // Suppress unused variable warning for retryConfig (reserved for future WS reconnection)
  void retryConfig;

  // Derived values
  const latestBid = useMemo(() => (bids.length > 0 ? (bids[0] ?? null) : null), [bids]);

  // Submit bid function
  const submitBid = useCallback(
    async (
      auctionId: bigint,
      amount: bigint,
      bidOptions?: { deadlineMinutes?: number; data?: `0x${string}` }
    ): Promise<Hash> => {
      if (signer === null) {
        throw new Error("Wallet must be connected to submit bids");
      }

      // Build the bid
      let builder = AuctionBid.builder().amount(amount);

      if (bidOptions?.deadlineMinutes !== undefined) {
        builder = builder.deadlineMinutes(bidOptions.deadlineMinutes);
      }

      if (bidOptions?.data !== undefined) {
        builder = builder.data(bidOptions.data);
      }

      const bid = builder.build();

      // Get auction namespace from client
      const auctionNamespace = (
        client as unknown as {
          auction?: {
            submitBid: (
              auctionId: bigint,
              bid: AuctionBid,
              signer: unknown
            ) => Promise<{ txHash: Hash }>;
          };
        }
      ).auction;

      if (auctionNamespace === undefined) {
        throw new Error(
          "Auction namespace not available. Ensure @podnetwork/auction is configured."
        );
      }

      const pending = await auctionNamespace.submitBid(auctionId, bid, signer);
      return HashSchema.parse(pending.txHash);
    },
    [client, signer]
  );

  // WebSocket subscription for auction bids
  useEffect(() => {
    if (!enabled || !subscribe) {
      setConnectionState("disconnected");
      return;
    }

    // Check if WebSocket is available
    const wsUrl = client.wsUrl;
    if (!hasWsSupport || wsUrl === undefined) {
      setConnectionState("disconnected");
      setError(PodError.from(new Error("WebSocket not available for auction bid subscription")));
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
        const subscription = wsNamespace.subscribeAuctionBids({
          signal: abortController.signal,
        });

        setConnectionState("connected");

        for await (const event of subscription) {
          if (abortController.signal.aborted) break;

          // Add new bids to the front of the list
          setBids((prev) => [...event.bids, ...prev]);
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
  }, [enabled, subscribe, client.wsUrl, hasWsSupport]);

  return {
    bids,
    latestBid,
    isLoading,
    error,
    retry: retryState,
    submitBid,
    connectionState,
    lastUpdate,
  };
}
