/**
 * @module hooks/use-committee
 * @description Hook for fetching committee information
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PodError } from "@podnetwork/core";
import { useClient } from "../providers/client-provider.js";
import { useRetry } from "./internal/use-retry.js";
import type {
  RetryConfig,
  RetryState,
  Validator,
  Committee,
  PodError as PodErrorType,
} from "../types.js";

/**
 * Options for useCommittee hook.
 * @category Hooks
 */
export interface UseCommitteeOptions {
  /** Retry configuration */
  readonly retry?: RetryConfig;
  /** Whether to enable the query. Default: true */
  readonly enabled?: boolean;
}

/**
 * Return type for useCommittee hook.
 * @category Hooks
 */
export interface UseCommitteeResult {
  /** List of validators in the committee */
  readonly validators: readonly Validator[];
  /** Required quorum size (n - f) */
  readonly quorumSize: number | null;
  /** Low quorum size (n - 3f) */
  readonly lowQuorumSize: number | null;
  /** Solver quorum size (n - 2f) */
  readonly solverQuorumSize: number | null;
  /** Total number of validators */
  readonly totalValidators: number;
  /** Full committee data or null if not loaded */
  readonly data: Committee | null;
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
 * Hook for fetching committee information.
 *
 * Returns the current committee of validators responsible for attesting
 * transactions, including their public keys, derived Ethereum addresses,
 * and quorum sizes.
 *
 * @param options - Hook configuration options
 * @returns Committee data, loading state, and error handling
 *
 * @example
 * ```tsx
 * function CommitteeInfo() {
 *   const { validators, quorumSize, totalValidators, isLoading } = useCommittee();
 *
 *   if (isLoading) return <span>Loading...</span>;
 *
 *   return (
 *     <div>
 *       <p>Committee size: {totalValidators}</p>
 *       <p>Quorum required: {quorumSize}</p>
 *       <ul>
 *         {validators.map((v) => (
 *           <li key={v.index}>
 *             Validator #{v.index}: {v.address}
 *           </li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCommittee(options: UseCommitteeOptions = {}): UseCommitteeResult {
  const { retry: retryConfig = {}, enabled = true } = options;

  const client = useClient();

  const [committee, setCommittee] = useState<Committee | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<PodErrorType | null>(null);

  const isMountedRef = useRef(true);
  const fetchCommitteeRef = useRef<(isRefresh: boolean) => Promise<void>>(undefined);

  // Stable callback for retry - uses ref so it doesn't need to change
  const handleRetry = useCallback(async () => {
    await fetchCommitteeRef.current?.(true);
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

  // Fetch committee function
  const fetchCommittee = useCallback(
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
        const result = await client.rpc.getCommittee();

        setCommittee(result);
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
  fetchCommitteeRef.current = fetchCommittee;

  // Initial fetch
  useEffect(() => {
    if (!enabled) {
      setCommittee(null);
      return;
    }

    void fetchCommittee(false);

    return () => {
      cancelRetry();
    };
  }, [enabled, fetchCommittee, cancelRetry]);

  // Manual refresh function
  const refresh = useCallback(() => {
    resetRetry();
    void fetchCommittee(true);
  }, [fetchCommittee, resetRetry]);

  return useMemo(
    () => ({
      validators: committee?.validators ?? [],
      quorumSize: committee?.quorumSize ?? null,
      lowQuorumSize: committee?.lowQuorumSize ?? null,
      solverQuorumSize: committee?.solverQuorumSize ?? null,
      totalValidators: committee?.validators.length ?? 0,
      data: committee,
      isLoading,
      isRefreshing,
      error,
      retry: retryState,
      refresh,
    }),
    [committee, isLoading, isRefreshing, error, retryState, refresh]
  );
}
