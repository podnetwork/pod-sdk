/**
 * @module hooks/use-gas-price
 * @description Hook for fetching current gas price
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PodError } from "@podnetwork/core";
import { useClient } from "../providers/client-provider.js";
import { useRetry } from "./internal/use-retry.js";
import type { RetryConfig, RetryState, PodError as PodErrorType } from "../types.js";

/**
 * Options for useGasPrice hook.
 * @category Hooks
 */
export interface UseGasPriceOptions {
  /** Auto-refresh interval in ms. Set to 0 to disable. Default: 0 */
  readonly refetchInterval?: number;
  /** Retry configuration */
  readonly retry?: RetryConfig;
  /** Whether to enable the query. Default: true */
  readonly enabled?: boolean;
}

/**
 * Return type for useGasPrice hook.
 * @category Hooks
 */
export interface UseGasPriceResult {
  /** Gas price in wei, or null if not loaded */
  readonly gasPrice: bigint | null;
  /** Gas price formatted as gwei string, or null if not loaded */
  readonly gasPriceGwei: string | null;
  /** Alias for gasPrice for consistency */
  readonly data: bigint | null;
  /** Whether the initial fetch is in progress */
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

const GWEI = 1_000_000_000n;

/**
 * Format wei to gwei string.
 */
function formatGwei(wei: bigint): string {
  const gwei = wei / GWEI;
  const remainder = wei % GWEI;
  if (remainder === 0n) {
    return gwei.toString();
  }
  // Handle decimal places
  const remainderStr = remainder.toString().padStart(9, "0");
  const trimmed = remainderStr.replace(/0+$/, "");
  return `${gwei.toString()}.${trimmed}`;
}

/**
 * Hook for fetching current gas price.
 *
 * @param options - Hook configuration options
 * @returns Gas price data, loading state, and error handling
 *
 * @example
 * ```tsx
 * function GasPriceDisplay() {
 *   const { gasPriceGwei, isLoading, error } = useGasPrice({
 *     refetchInterval: 12000, // Refresh every 12s (block time)
 *   });
 *
 *   if (isLoading) return <span>Loading...</span>;
 *   if (error) return <span>Error: {error.message}</span>;
 *
 *   return <span>Gas: {gasPriceGwei} gwei</span>;
 * }
 * ```
 */
export function useGasPrice(options: UseGasPriceOptions = {}): UseGasPriceResult {
  const { refetchInterval = 0, retry: retryConfig = {}, enabled = true } = options;

  const client = useClient();

  const [gasPrice, setGasPrice] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<PodErrorType | null>(null);

  const isMountedRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const fetchGasPriceRef = useRef<(isRefresh: boolean) => Promise<void>>(undefined);

  // Stable callback for retry - uses ref so it doesn't need to change
  const handleRetry = useCallback(async () => {
    await fetchGasPriceRef.current?.(true);
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
      if (intervalRef.current !== undefined) clearInterval(intervalRef.current);
    };
  }, []);

  // Fetch gas price function
  const fetchGasPrice = useCallback(
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
        const result = await client.rpc.getGasPrice();
        setGasPrice(result);
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
  fetchGasPriceRef.current = fetchGasPrice;

  // Initial fetch and refetch interval
  useEffect(() => {
    if (!enabled) {
      setGasPrice(null);
      return;
    }

    void fetchGasPrice(false);

    // Set up refetch interval if configured
    if (refetchInterval > 0) {
      intervalRef.current = setInterval(() => {
        void fetchGasPrice(true);
      }, refetchInterval);
    }

    return () => {
      if (intervalRef.current !== undefined) clearInterval(intervalRef.current);
      cancelRetry();
    };
  }, [enabled, refetchInterval, fetchGasPrice, cancelRetry]);

  // Manual refresh function
  const refresh = useCallback(() => {
    resetRetry();
    void fetchGasPrice(true);
  }, [fetchGasPrice, resetRetry]);

  // Compute gwei string
  const gasPriceGwei = useMemo(() => (gasPrice !== null ? formatGwei(gasPrice) : null), [gasPrice]);

  return useMemo(
    () => ({
      gasPrice,
      gasPriceGwei,
      data: gasPrice,
      isLoading,
      isRefreshing,
      error,
      retry: retryState,
      refresh,
    }),
    [gasPrice, gasPriceGwei, isLoading, isRefreshing, error, retryState, refresh]
  );
}
