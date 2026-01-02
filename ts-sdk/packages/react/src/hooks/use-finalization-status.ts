/**
 * @module hooks/use-finalization-status
 * @description Hook for tracking transaction finalization status
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTransaction } from "./use-transaction.js";
import type { RetryState, Hash, PodError as PodErrorType } from "../types.js";

/**
 * Options for useFinalizationStatus hook.
 * @category Hooks
 */
export interface UseFinalizationStatusOptions {
  /** Whether to enable the query. Default: true */
  readonly enabled?: boolean;
  /** Polling interval in ms for status updates. Default: 1000 */
  readonly pollingInterval?: number;
  /** Threshold for considering transaction finalized (0-1). Default: 0.67 (2/3) */
  readonly quorumThreshold?: number;
}

/**
 * Finalization status stages.
 * @category Hooks
 */
export type FinalizationStage = "pending" | "attesting" | "finalizing" | "finalized" | "failed";

/**
 * Return type for useFinalizationStatus hook.
 * @category Hooks
 */
export interface UseFinalizationStatusResult {
  /** Current finalization stage */
  readonly stage: FinalizationStage;
  /** Number of attestations received */
  readonly attestationCount: number;
  /** Total validators in committee (estimated) */
  readonly totalValidators: number;
  /** Progress percentage (0-100) */
  readonly progress: number;
  /** Whether finalization is complete */
  readonly isFinalized: boolean;
  /** Whether currently loading */
  readonly isLoading: boolean;
  /** Error if any */
  readonly error: PodErrorType | null;
  /** Current retry state */
  readonly retry: RetryState;
  /** Manually refresh status */
  readonly refresh: () => void;
  /** Time since transaction was submitted in ms */
  readonly elapsedTime: number | null;
}

/**
 * Hook for tracking transaction finalization status.
 *
 * Tracks the lifecycle of a transaction from submission through finalization,
 * providing real-time progress updates based on attestation count.
 *
 * @param hash - Transaction hash to track, or null to skip
 * @param options - Hook configuration options
 * @returns Finalization status data and state
 *
 * @example
 * ```tsx
 * function FinalizationProgress({ txHash }: { txHash: Hash }) {
 *   const {
 *     stage,
 *     progress,
 *     attestationCount,
 *     totalValidators,
 *     isFinalized,
 *   } = useFinalizationStatus(txHash);
 *
 *   return (
 *     <div>
 *       <div className="progress-bar" style={{ width: `${progress}%` }} />
 *       <span>
 *         {attestationCount}/{totalValidators} attestations ({progress}%)
 *       </span>
 *       {isFinalized && <span>Finalized!</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFinalizationStatus(
  hash: Hash | null,
  options: UseFinalizationStatusOptions = {}
): UseFinalizationStatusResult {
  const { enabled = true, pollingInterval = 1000, quorumThreshold = 0.67 } = options;

  // Use the transaction hook to get base data
  const {
    status,
    attestations,
    isLoading,
    error,
    retry,
    refresh: refreshTransaction,
  } = useTransaction(hash ?? ("0x" as Hash), { enabled: enabled && hash !== null });

  const [elapsedTime, setElapsedTime] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Start timer when hash changes
  useEffect(() => {
    if (hash !== null && enabled) {
      startTimeRef.current = Date.now();
      setElapsedTime(0);
    } else {
      startTimeRef.current = null;
      setElapsedTime(null);
    }
  }, [hash, enabled]);

  // Polling for elapsed time updates
  useEffect(() => {
    if (hash === null || !enabled || startTimeRef.current === null) return;

    pollingRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsedTime(Date.now() - startTimeRef.current);
      }
    }, pollingInterval);

    return () => {
      if (pollingRef.current !== undefined) {
        clearInterval(pollingRef.current);
      }
    };
  }, [hash, enabled, pollingInterval]);

  // Stop timer when finalized
  useEffect(() => {
    if (status === "finalized" && pollingRef.current !== undefined) {
      clearInterval(pollingRef.current);
    }
  }, [status]);

  // Derive finalization metrics
  const metrics = useMemo(() => {
    const signatureCount = attestations?.signatureCount ?? 0;
    // Estimate total validators based on quorum (usually ~100 validators, need 67 for 2/3)
    const estimatedTotal = 100;

    // Calculate progress (0-100)
    const quorumRequired = Math.ceil(estimatedTotal * quorumThreshold);
    const progress = Math.min(100, Math.round((signatureCount / quorumRequired) * 100));

    return {
      attestationCount: signatureCount,
      totalValidators: estimatedTotal,
      progress,
    };
  }, [attestations, quorumThreshold]);

  // Derive stage from status
  const stage = useMemo<FinalizationStage>(() => {
    if (status === null) return "pending";

    switch (status) {
      case "pending":
        return "pending";
      case "attested":
        // Between attested and finalized
        if (metrics.progress >= 100) return "finalizing";
        return "attesting";
      case "finalized":
        return "finalized";
      case "failed":
        return "failed";
      default:
        return "pending";
    }
  }, [status, metrics.progress]);

  const refresh = useCallback(() => {
    refreshTransaction();
  }, [refreshTransaction]);

  return useMemo(
    () => ({
      stage,
      attestationCount: metrics.attestationCount,
      totalValidators: metrics.totalValidators,
      progress: metrics.progress,
      isFinalized: status === "finalized",
      isLoading,
      error,
      retry,
      refresh,
      elapsedTime,
    }),
    [stage, metrics, status, isLoading, error, retry, refresh, elapsedTime]
  );
}
