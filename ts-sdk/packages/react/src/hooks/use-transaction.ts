/**
 * @module hooks/use-transaction
 * @description Hook for fetching and tracking transaction status
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { PodError } from "@podnetwork/core";
import { useClient } from "../providers/client-provider.js";
import type {
  Transaction,
  TransactionReceipt,
  RetryConfig,
  RetryState,
  Hash,
  PodError as PodErrorType,
} from "../types.js";
import { DEFAULT_RETRY_CONFIG } from "../types.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Transaction status derived from receipt and attestations.
 * @category Hooks
 */
export type TransactionStatus = "pending" | "attested" | "finalized" | "failed";

/**
 * Options for useTransaction hook.
 * @category Hooks
 */
export interface UseTransactionOptions {
  /** Retry configuration for failed requests */
  readonly retry?: RetryConfig;
  /** Whether to continuously watch for receipt updates. Default: true */
  readonly watchReceipt?: boolean;
  /** Polling interval in ms when watching. Default: 2000 */
  readonly pollingInterval?: number;
  /** Whether the hook is enabled. Default: true */
  readonly enabled?: boolean;
}

/**
 * Result returned by useTransaction hook.
 * @category Hooks
 */
export interface UseTransactionResult {
  /** The transaction object if found */
  readonly transaction: Transaction | null;
  /** The transaction receipt if available */
  readonly receipt: TransactionReceipt | null;
  /** Transaction status derived from receipt and attestations */
  readonly status: TransactionStatus | null;
  /** Pod attestation metadata from receipt */
  readonly attestations: TransactionReceipt["podMetadata"] | null;
  /** Alias for transaction (matches DataHookResult pattern) */
  readonly data: Transaction | null;
  /** Whether the initial load is in progress */
  readonly isLoading: boolean;
  /** Whether a refresh is in progress */
  readonly isRefreshing: boolean;
  /** Error if the request failed */
  readonly error: PodErrorType | null;
  /** Current retry state */
  readonly retry: RetryState;
  /** Function to manually refresh the transaction */
  readonly refresh: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for fetching and tracking transaction status.
 *
 * @param hash - Transaction hash to track
 * @param options - Configuration options
 * @returns Transaction data, receipt, status, and control functions
 *
 * @example
 * ```tsx
 * function TransactionTracker({ txHash }: { txHash: `0x${string}` }) {
 *   const { transaction, receipt, status, isLoading, error } = useTransaction(txHash);
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <p>Status: {status}</p>
 *       {receipt && (
 *         <p>Gas used: {receipt.gasUsed.toString()}</p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTransaction(
  hash: Hash | null | undefined,
  options: UseTransactionOptions = {}
): UseTransactionResult {
  const {
    retry: retryConfig = DEFAULT_RETRY_CONFIG,
    watchReceipt = true,
    pollingInterval = 2000,
    enabled = true,
  } = options;

  const client = useClient();

  // State
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [receipt, setReceipt] = useState<TransactionReceipt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<PodErrorType | null>(null);
  const [retryState, setRetryState] = useState<RetryState>({
    attempt: 0,
    nextRetryAt: null,
    isRetrying: false,
  });

  // Track if we've done initial fetch
  const hasFetchedRef = useRef(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derive status from receipt
  // Note: pod node doesn't support eth_getTransactionByHash, so status is derived from receipt only
  const status = useMemo<TransactionStatus | null>(() => {
    if (receipt === null) {
      // No receipt yet - can't determine status
      return null;
    }

    // Check if transaction failed (reverted)
    if (!receipt.status) {
      return "failed";
    }

    // Check attestation status
    const signatureCount = receipt.podMetadata.signatureCount;

    if (signatureCount === 0) {
      // Receipt exists but no attestations yet
      return "pending";
    }

    // For finalized, we'd need to check quorum (typically 2/3 of validators)
    // Since we don't have committee info here, we consider any attestations as "attested"
    // The component can use useCommittee to determine full finalization
    // For now, treat having signatures as "attested", and could be "finalized" if quorum reached
    // We'll use a simple heuristic: if signatureCount >= 2, consider it more likely finalized
    if (signatureCount >= 2) {
      return "finalized";
    }

    return "attested";
  }, [receipt]);

  // Attestations from receipt
  const attestations = useMemo(() => {
    return receipt?.podMetadata ?? null;
  }, [receipt]);

  // Fetch function
  const fetchTransaction = useCallback(
    async (isRefresh: boolean): Promise<void> => {
      if (hash === null || hash === undefined || !enabled) return;

      if (isRefresh) {
        setIsRefreshing(true);
      } else if (!hasFetchedRef.current) {
        setIsLoading(true);
      }

      setError(null);

      const maxRetries = retryConfig.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries;
      const baseDelay = retryConfig.baseDelay ?? DEFAULT_RETRY_CONFIG.baseDelay;
      let attempt = 0;

      while (attempt <= maxRetries) {
        try {
          // Fetch receipt (transaction details not available via RPC on pod node)
          const rcpt = await client.rpc.getTransactionReceipt(hash);

          // Note: pod node doesn't support eth_getTransactionByHash, so transaction is always null
          setTransaction(null);
          setReceipt(rcpt ?? null);
          setRetryState({ attempt: 0, nextRetryAt: null, isRetrying: false });
          hasFetchedRef.current = true;
          break;
        } catch (err) {
          attempt++;
          const podError = PodError.from(err);

          if (attempt <= maxRetries && podError.isRetryable) {
            const delay = baseDelay * Math.pow(2, attempt - 1);
            setRetryState({
              attempt,
              isRetrying: true,
              nextRetryAt: new Date(Date.now() + delay),
            });
            // Wait with exponential backoff
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            setError(podError);
            setRetryState({
              attempt,
              nextRetryAt: null,
              isRetrying: false,
            });
            break;
          }
        }
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [hash, enabled, client, retryConfig]
  );

  // Manual refresh
  const refresh = useCallback(() => {
    void fetchTransaction(true);
  }, [fetchTransaction]);

  // Initial fetch
  useEffect(() => {
    if (hash !== null && hash !== undefined && enabled) {
      hasFetchedRef.current = false;
      void fetchTransaction(false);
    } else {
      // Reset state if disabled or no hash
      setTransaction(null);
      setReceipt(null);
      setError(null);
      setIsLoading(false);
      hasFetchedRef.current = false;
    }
  }, [hash, enabled, fetchTransaction]);

  // Polling for receipt updates
  useEffect(() => {
    if (hash === null || hash === undefined || !enabled || !watchReceipt) {
      if (pollingRef.current !== null) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    // Only poll if we don't have a finalized receipt yet
    if (status === "finalized" || status === "failed") {
      if (pollingRef.current !== null) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    pollingRef.current = setInterval(() => {
      void fetchTransaction(true);
    }, pollingInterval);

    return () => {
      if (pollingRef.current !== null) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [hash, enabled, watchReceipt, pollingInterval, status, fetchTransaction]);

  return {
    transaction,
    receipt,
    status,
    attestations,
    data: transaction,
    isLoading,
    isRefreshing,
    error,
    retry: retryState,
    refresh,
  };
}
