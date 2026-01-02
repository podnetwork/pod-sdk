/**
 * @module hooks/use-balance
 * @description Hook for fetching account balance
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PodError } from "@podnetwork/core";
import { TypedContract } from "@podnetwork/contracts";
import { useClient } from "../providers/client-provider.js";
import { useWallet } from "./use-wallet.js";
import { useRetry } from "./internal/use-retry.js";
import type { RetryConfig, RetryState, Address, PodError as PodErrorType } from "../types.js";

/**
 * Minimal ERC-20 ABI for balanceOf function.
 * @internal
 */
const ERC20_BALANCE_OF_ABI = [
  {
    type: "function" as const,
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view" as const,
  },
] as const;

/**
 * Options for useBalance hook.
 * @category Hooks
 */
export interface UseBalanceOptions {
  /** Address to query. Defaults to connected wallet address */
  readonly address?: Address;
  /** Token address for ERC-20 balance. Default: native token */
  readonly token?: Address;
  /** Auto-refresh interval in ms. Set to 0 to disable. Default: 0 */
  readonly refetchInterval?: number;
  /** Retry configuration */
  readonly retry?: RetryConfig;
  /** Whether to enable the query. Default: true */
  readonly enabled?: boolean;
}

/**
 * Return type for useBalance hook.
 * @category Hooks
 */
export interface UseBalanceResult {
  /** Balance in wei, or null if not loaded */
  readonly balance: bigint | null;
  /** Address being queried */
  readonly address: Address | null;
  /** Token address (null for native token) */
  readonly token: Address | null;
  /** Alias for balance for consistency */
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

/**
 * Hook for fetching account balance.
 *
 * @param options - Hook configuration options
 * @returns Balance data, loading state, and error handling
 *
 * @example
 * ```tsx
 * function BalanceDisplay() {
 *   const { balance, isLoading, error, refresh } = useBalance();
 *
 *   if (isLoading) return <span>Loading...</span>;
 *   if (error) return <span>Error: {error.message}</span>;
 *
 *   return (
 *     <div>
 *       <span>{formatTokenAmount(balance ?? 0n)} pETH</span>
 *       <button onClick={refresh}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Query specific address
 * const { balance } = useBalance({
 *   address: '0x1234...',
 *   refetchInterval: 15000, // Refresh every 15s
 * });
 * ```
 */
export function useBalance(options: UseBalanceOptions = {}): UseBalanceResult {
  const {
    address: explicitAddress,
    token,
    refetchInterval = 0,
    retry: retryConfig = {},
    enabled = true,
  } = options;

  const client = useClient();
  const { address: walletAddress } = useWallet();

  // Use explicit address or fall back to wallet address
  const queryAddress = explicitAddress ?? walletAddress;

  const [balance, setBalance] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<PodErrorType | null>(null);

  const isMountedRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const fetchBalanceRef = useRef<(isRefresh: boolean) => Promise<void>>(undefined);

  // Stable callback for retry - uses ref so it doesn't need to change
  const handleRetry = useCallback(async () => {
    await fetchBalanceRef.current?.(true);
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

  // Fetch balance function
  const fetchBalance = useCallback(
    async (isRefresh: boolean): Promise<void> => {
      if (queryAddress === null || !enabled) return;

      if (!isMountedRef.current) return;

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        let result: bigint;

        if (token !== undefined) {
          // ERC-20 token balance
          const contract = new TypedContract(
            token,
            ERC20_BALANCE_OF_ABI,
            client.getTransactionSender()
          );
          const balanceOf = contract.read["balanceOf"];
          if (balanceOf === undefined) {
            throw new Error("balanceOf method not found on contract");
          }
          result = (await balanceOf(queryAddress)) as bigint;
        } else {
          // Native token balance
          result = await client.rpc.getBalance(queryAddress);
        }

        setBalance(result);
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
    [queryAddress, token, enabled, client, resetRetry, scheduleRetry]
  );

  // Update ref for retry callback
  fetchBalanceRef.current = fetchBalance;

  // Initial fetch and refetch interval
  useEffect(() => {
    if (queryAddress === null || !enabled) {
      setBalance(null);
      return;
    }

    void fetchBalance(false);

    // Set up refetch interval if configured
    if (refetchInterval > 0) {
      intervalRef.current = setInterval(() => {
        void fetchBalance(true);
      }, refetchInterval);
    }

    return () => {
      if (intervalRef.current !== undefined) clearInterval(intervalRef.current);
      cancelRetry();
    };
  }, [queryAddress, enabled, refetchInterval, fetchBalance, cancelRetry]);

  // Manual refresh function
  const refresh = useCallback(() => {
    resetRetry();
    void fetchBalance(true);
  }, [fetchBalance, resetRetry]);

  return useMemo(
    () => ({
      balance,
      address: queryAddress,
      token: token ?? null,
      data: balance,
      isLoading,
      isRefreshing,
      error,
      retry: retryState,
      refresh,
    }),
    [balance, queryAddress, token, isLoading, isRefreshing, error, retryState, refresh]
  );
}
