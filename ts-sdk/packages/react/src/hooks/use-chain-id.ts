/**
 * @module hooks/use-chain-id
 * @description Hook for fetching the chain ID
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PodError } from "@podnetwork/core";
import { useClient } from "../providers/client-provider.js";
import { useRetry } from "./internal/use-retry.js";
import type { RetryConfig, RetryState, PodError as PodErrorType } from "../types.js";

/**
 * Options for useChainId hook.
 * @category Hooks
 */
export interface UseChainIdOptions {
  /** Retry configuration */
  readonly retry?: RetryConfig;
  /** Whether to enable the query. Default: true */
  readonly enabled?: boolean;
}

/**
 * Return type for useChainId hook.
 * @category Hooks
 */
export interface UseChainIdResult {
  /** Chain ID, or null if not loaded */
  readonly chainId: bigint | null;
  /** Alias for chainId for consistency */
  readonly data: bigint | null;
  /** Whether the fetch is in progress */
  readonly isLoading: boolean;
  /** Whether a refresh is in progress */
  readonly isRefreshing: boolean;
  /** Error from the most recent fetch attempt */
  readonly error: PodErrorType | null;
  /** Current retry state */
  readonly retry: RetryState;
  /** Manually trigger a refresh */
  readonly refresh: () => void;
}

/**
 * Hook for fetching the chain ID.
 *
 * The chain ID is typically fetched once and cached since it doesn't change.
 *
 * @param options - Hook configuration options
 * @returns Chain ID data, loading state, and error handling
 *
 * @example
 * ```tsx
 * function ChainInfo() {
 *   const { chainId, isLoading } = useChainId();
 *
 *   if (isLoading) return <span>Loading...</span>;
 *
 *   return <span>Chain ID: {chainId?.toString()}</span>;
 * }
 * ```
 */
export function useChainId(options: UseChainIdOptions = {}): UseChainIdResult {
  const { retry: retryConfig = {}, enabled = true } = options;

  const client = useClient();

  const [chainId, setChainId] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<PodErrorType | null>(null);

  const isMountedRef = useRef(true);
  const fetchChainIdRef = useRef<(isRefresh: boolean) => Promise<void>>(undefined);

  // Stable callback for retry - uses ref so it doesn't need to change
  const handleRetry = useCallback(async () => {
    await fetchChainIdRef.current?.(true);
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
    };
  }, []);

  // Fetch chain ID function
  const fetchChainId = useCallback(
    async (isRefresh: boolean): Promise<void> => {
      if (!enabled) return;

      if (!isMountedRef.current) return;

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const result = await client.rpc.getChainId();
        setChainId(result);
        resetRetry();
      } catch (err) {
        const podError = PodError.from(err);
        setError(podError);

        // Schedule retry if applicable
        if (podError.isRetryable) {
          scheduleRetry();
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [enabled, client, resetRetry, scheduleRetry]
  );

  // Update ref for retry callback
  fetchChainIdRef.current = fetchChainId;

  // Initial fetch (only once since chain ID doesn't change)
  useEffect(() => {
    if (!enabled) {
      setChainId(null);
      return;
    }

    // Only fetch if not already loaded
    if (chainId === null) {
      void fetchChainId(false);
    }

    return () => {
      cancelRetry();
    };
  }, [enabled, chainId, fetchChainId, cancelRetry]);

  // Manual refresh function
  const refresh = useCallback(() => {
    resetRetry();
    void fetchChainId(true);
  }, [fetchChainId, resetRetry]);

  return useMemo(
    () => ({
      chainId,
      data: chainId,
      isLoading,
      isRefreshing,
      error,
      retry: retryState,
      refresh,
    }),
    [chainId, isLoading, isRefreshing, error, retryState, refresh]
  );
}
