/**
 * @module hooks/use-estimate-gas
 * @description Hook for estimating gas for a transaction
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PodError } from "@podnetwork/core";
import { useClient } from "../providers/client-provider.js";
import { useRetry } from "./internal/use-retry.js";
import type {
  RetryConfig,
  RetryState,
  TransactionRequest,
  PodError as PodErrorType,
} from "../types.js";

/**
 * Options for useEstimateGas hook.
 * @category Hooks
 */
export interface UseEstimateGasOptions {
  /** Retry configuration */
  readonly retry?: RetryConfig;
}

/**
 * Return type for useEstimateGas hook.
 * @category Hooks
 */
export interface UseEstimateGasResult {
  /** Estimated gas units, or null if not loaded */
  readonly gasEstimate: bigint | null;
  /** Alias for gasEstimate for consistency */
  readonly data: bigint | null;
  /** Whether the estimation is in progress */
  readonly isLoading: boolean;
  /** Whether a re-estimation is in progress */
  readonly isRefreshing: boolean;
  /** Error from the most recent estimate attempt */
  readonly error: PodErrorType | null;
  /** Current retry state */
  readonly retry: RetryState;
  /** Manually trigger re-estimation */
  readonly refresh: () => void;
}

/**
 * Hook for estimating gas for a transaction.
 *
 * @param request - Transaction request to estimate gas for, or null to skip
 * @param options - Hook configuration options
 * @returns Gas estimate data, loading state, and error handling
 *
 * @example
 * ```tsx
 * function GasEstimateDisplay({ to, value }: { to: Address; value: bigint }) {
 *   const { gasEstimate, isLoading, error } = useEstimateGas({
 *     to,
 *     value,
 *   });
 *
 *   if (isLoading) return <span>Estimating...</span>;
 *   if (error) return <span>Error: {error.message}</span>;
 *
 *   return <span>Estimated gas: {gasEstimate?.toString()}</span>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Skip estimation until transaction is ready
 * const { gasEstimate } = useEstimateGas(
 *   isReady ? { to: recipient, value: amount } : null
 * );
 * ```
 */
export function useEstimateGas(
  request: TransactionRequest | null,
  options: UseEstimateGasOptions = {}
): UseEstimateGasResult {
  const { retry: retryConfig = {} } = options;

  const client = useClient();

  const [gasEstimate, setGasEstimate] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<PodErrorType | null>(null);

  const isMountedRef = useRef(true);
  const estimateGasRef = useRef<(isRefresh: boolean) => Promise<void>>(undefined);

  // Stable callback for retry - uses ref so it doesn't need to change
  const handleRetry = useCallback(async () => {
    await estimateGasRef.current?.(true);
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

  // Serialize request for dependency comparison
  const requestKey = useMemo(
    () =>
      request !== null
        ? JSON.stringify({
            to: request.to,
            value: request.value?.toString(),
            data: request.data,
          })
        : null,
    [request]
  );

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Estimate gas function
  const estimateGas = useCallback(
    async (isRefresh: boolean): Promise<void> => {
      if (request === null) return;

      if (!isMountedRef.current) return;

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const result = await client.rpc.estimateGas(request);
        setGasEstimate(result);
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
    [request, client, resetRetry, scheduleRetry]
  );

  // Update ref for retry callback
  estimateGasRef.current = estimateGas;

  // Estimate when request changes
  useEffect(() => {
    if (request === null) {
      setGasEstimate(null);
      setError(null);
      return;
    }

    void estimateGas(false);

    return () => {
      cancelRetry();
    };
  }, [requestKey, estimateGas, cancelRetry]);

  // Manual refresh function
  const refresh = useCallback(() => {
    resetRetry();
    void estimateGas(true);
  }, [estimateGas, resetRetry]);

  return useMemo(
    () => ({
      gasEstimate,
      data: gasEstimate,
      isLoading,
      isRefreshing,
      error,
      retry: retryState,
      refresh,
    }),
    [gasEstimate, isLoading, isRefreshing, error, retryState, refresh]
  );
}
