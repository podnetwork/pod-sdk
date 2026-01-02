/**
 * @module hooks/internal/use-batched-updates
 * @description Internal hook for batching rapid updates
 * @internal
 */

import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Options for useBatchedUpdates hook.
 */
export interface UseBatchedUpdatesOptions {
  /** Batch interval in milliseconds. Default: 100 */
  batchInterval?: number;
}

/**
 * Return type for useBatchedUpdates hook.
 */
export interface UseBatchedUpdatesReturn<T> {
  /** Current batched data */
  data: T | null;
  /** Queue an update to be batched */
  update: (value: T) => void;
  /** Force immediate flush of pending update */
  flush: () => void;
  /** Clear pending updates and data */
  clear: () => void;
}

/**
 * Internal hook for batching rapid updates to prevent excessive re-renders.
 *
 * @internal
 */
export function useBatchedUpdates<T>(
  options: UseBatchedUpdatesOptions = {}
): UseBatchedUpdatesReturn<T> {
  const { batchInterval = 100 } = options;

  const [data, setData] = useState<T | null>(null);
  const pendingRef = useRef<T | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isMountedRef = useRef(true);

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

  const flush = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (isMountedRef.current && pendingRef.current !== null) {
      setData(pendingRef.current);
      pendingRef.current = null;
    }
  }, []);

  const clear = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    pendingRef.current = null;
    if (isMountedRef.current) {
      setData(null);
    }
  }, []);

  const update = useCallback(
    (value: T) => {
      pendingRef.current = value;

      // If no pending timeout, schedule one
      timeoutRef.current ??= setTimeout(() => {
        timeoutRef.current = undefined;
        if (isMountedRef.current && pendingRef.current !== null) {
          setData(pendingRef.current);
          pendingRef.current = null;
        }
      }, batchInterval);
    },
    [batchInterval]
  );

  return {
    data,
    update,
    flush,
    clear,
  };
}
