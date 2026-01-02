/**
 * @module hooks/internal/use-retry
 * @description Internal hook for automatic retry with exponential backoff
 * @internal
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { RetryConfig, RetryState } from "../../types.js";
import { DEFAULT_RETRY_CONFIG } from "../../types.js";

/**
 * Calculate delay for retry attempt with exponential backoff and jitter.
 */
function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt);
  const clampedDelay = Math.min(exponentialDelay, config.maxDelay);
  const jitterRange = clampedDelay * config.jitter;
  return clampedDelay + (Math.random() - 0.5) * 2 * jitterRange;
}

/**
 * Options for useRetry hook.
 */
export interface UseRetryOptions {
  /** Retry configuration */
  config?: RetryConfig;
  /** Callback to execute on retry */
  onRetry?: () => Promise<void>;
  /** Callback when max retries exceeded */
  onMaxRetriesExceeded?: () => void;
}

/**
 * Return type for useRetry hook.
 */
export interface UseRetryReturn {
  /** Current retry state */
  state: RetryState;
  /** Schedule a retry attempt */
  scheduleRetry: () => void;
  /** Reset retry state */
  reset: () => void;
  /** Cancel any pending retry */
  cancel: () => void;
}

/**
 * Internal hook for retry logic with exponential backoff.
 *
 * @internal
 */
export function useRetry(options: UseRetryOptions = {}): UseRetryReturn {
  const { config = {}, onRetry, onMaxRetriesExceeded } = options;

  // Memoize mergedConfig to prevent infinite re-renders
  // Without useMemo, a new object is created every render, causing scheduleRetry
  // to change, which causes fetchBalance to change, triggering the effect again
  const mergedConfig = useMemo<Required<RetryConfig>>(
    () => ({
      ...DEFAULT_RETRY_CONFIG,
      ...config,
    }),
    [config.maxRetries, config.baseDelay, config.maxDelay, config.backoffFactor, config.jitter]
  );

  const [state, setState] = useState<RetryState>({
    attempt: 0,
    nextRetryAt: null,
    isRetrying: false,
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isMountedRef = useRef(true);
  // Use a ref to track attempt count to avoid dependency cycles
  // This allows scheduleRetry to be stable across renders
  const attemptRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (isMountedRef.current) {
      setState((prev) => {
        // Bail out if state is already in target state to prevent unnecessary re-renders
        if (prev.nextRetryAt === null && !prev.isRetrying) {
          return prev;
        }
        return {
          ...prev,
          nextRetryAt: null,
          isRetrying: false,
        };
      });
    }
  }, []);

  const reset = useCallback(() => {
    cancel();
    attemptRef.current = 0;
    if (isMountedRef.current) {
      setState((prev) => {
        // Bail out if state is already in initial state to prevent unnecessary re-renders
        if (prev.attempt === 0 && prev.nextRetryAt === null && !prev.isRetrying) {
          return prev;
        }
        return {
          attempt: 0,
          nextRetryAt: null,
          isRetrying: false,
        };
      });
    }
  }, [cancel]);

  const scheduleRetry = useCallback(() => {
    // Cancel any existing pending retry to prevent double-scheduling
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }

    // Use ref to read current attempt to avoid dependency cycle
    // This keeps scheduleRetry stable and prevents infinite re-renders
    const currentAttempt = attemptRef.current;

    if (currentAttempt >= mergedConfig.maxRetries) {
      setState((prev) => ({
        ...prev,
        isRetrying: false,
        nextRetryAt: null,
      }));
      onMaxRetriesExceeded?.();
      return;
    }

    const delay = calculateDelay(currentAttempt, mergedConfig);
    const nextRetryAt = new Date(Date.now() + delay);

    // Update both ref and state
    attemptRef.current = currentAttempt + 1;
    setState({
      attempt: currentAttempt + 1,
      nextRetryAt,
      isRetrying: true,
    });

    timeoutRef.current = setTimeout(() => {
      void (async (): Promise<void> => {
        if (!isMountedRef.current) return;

        try {
          if (onRetry !== undefined) {
            await onRetry();
          }
        } finally {
          setState((prev) => ({
            ...prev,
            nextRetryAt: null,
            isRetrying: false,
          }));
        }
      })();
    }, delay);
  }, [mergedConfig, onRetry, onMaxRetriesExceeded]);

  return {
    state,
    scheduleRetry,
    reset,
    cancel,
  };
}
