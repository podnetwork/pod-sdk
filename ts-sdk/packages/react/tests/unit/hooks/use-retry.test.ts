/**
 * Tests for useRetry hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { useRetry } from "../../../src/hooks/internal/use-retry.js";
import { DEFAULT_RETRY_CONFIG } from "../../../src/types.js";

describe("useRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("should start with attempt 0 and not retrying", () => {
      const { result } = renderHook(() => useRetry());

      expect(result.current.state.attempt).toBe(0);
      expect(result.current.state.isRetrying).toBe(false);
      expect(result.current.state.nextRetryAt).toBeNull();
    });
  });

  describe("default configuration", () => {
    it("should use default config with 5 retries, 1s base delay, 32s max delay", () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(5);
      expect(DEFAULT_RETRY_CONFIG.baseDelay).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.maxDelay).toBe(32000);
      expect(DEFAULT_RETRY_CONFIG.backoffFactor).toBe(2);
      expect(DEFAULT_RETRY_CONFIG.jitter).toBe(0.1);
    });
  });

  describe("automatic retry scheduling", () => {
    it("should increment attempt count on scheduleRetry", () => {
      const { result } = renderHook(() => useRetry());

      act(() => {
        result.current.scheduleRetry();
      });

      expect(result.current.state.attempt).toBe(1);
      expect(result.current.state.isRetrying).toBe(true);
      expect(result.current.state.nextRetryAt).toBeInstanceOf(Date);
    });

    it("should call onRetry callback after delay", async () => {
      const onRetry = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useRetry({ onRetry }));

      act(() => {
        result.current.scheduleRetry();
      });

      expect(onRetry).not.toHaveBeenCalled();

      // Advance past the first retry delay (around 1000ms with jitter)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1200);
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("should not schedule retry after max retries exceeded", () => {
      const onMaxRetriesExceeded = vi.fn();
      const { result } = renderHook(() =>
        useRetry({
          config: { maxRetries: 2 },
          onMaxRetriesExceeded,
        })
      );

      // Schedule first two retries
      act(() => {
        result.current.scheduleRetry();
      });
      expect(result.current.state.attempt).toBe(1);

      act(() => {
        result.current.scheduleRetry();
      });
      expect(result.current.state.attempt).toBe(2);

      // Third attempt should be blocked
      act(() => {
        result.current.scheduleRetry();
      });
      expect(result.current.state.attempt).toBe(2); // unchanged
      expect(onMaxRetriesExceeded).toHaveBeenCalledTimes(1);
    });
  });

  describe("exponential backoff timing", () => {
    it("should increase delay exponentially with each attempt", () => {
      // With jitter disabled (set to 0) for predictable testing
      const onRetry = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useRetry({
          onRetry,
          config: {
            baseDelay: 1000,
            backoffFactor: 2,
            maxDelay: 32000,
            jitter: 0, // Disable jitter for predictable tests
          },
        })
      );

      // First retry: 1000ms delay
      act(() => {
        result.current.scheduleRetry();
      });

      const firstRetryAt = result.current.state.nextRetryAt!.getTime();
      const firstDelay = firstRetryAt - Date.now();
      expect(firstDelay).toBeCloseTo(1000, -2); // ~1s
    });

    it("should clamp delay at maxDelay", async () => {
      const onRetry = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useRetry({
          onRetry,
          config: {
            baseDelay: 1000,
            backoffFactor: 2,
            maxDelay: 4000, // Low max for testing
            maxRetries: 10,
            jitter: 0,
          },
        })
      );

      // Attempt 0 → delay = 1000 * 2^0 = 1000ms
      // Attempt 1 → delay = 1000 * 2^1 = 2000ms
      // Attempt 2 → delay = 1000 * 2^2 = 4000ms (clamped)
      // Attempt 3 → delay = 1000 * 2^3 = 8000ms → clamped to 4000ms

      // Schedule multiple retries
      for (let i = 0; i < 4; i++) {
        act(() => {
          result.current.scheduleRetry();
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000); // Wait for retry
        });
      }

      // Schedule one more and check the delay is clamped
      act(() => {
        result.current.scheduleRetry();
      });

      const nextRetryAt = result.current.state.nextRetryAt!.getTime();
      const delay = nextRetryAt - Date.now();
      expect(delay).toBeLessThanOrEqual(4000);
    });
  });

  describe("jitter", () => {
    it("should add variance to delay with jitter", () => {
      const delays: number[] = [];

      // Run multiple times to verify jitter adds variance
      for (let i = 0; i < 10; i++) {
        const { result, unmount } = renderHook(() =>
          useRetry({
            config: {
              baseDelay: 1000,
              jitter: 0.1,
              backoffFactor: 2,
              maxDelay: 32000,
            },
          })
        );

        act(() => {
          result.current.scheduleRetry();
        });

        const nextRetryAt = result.current.state.nextRetryAt!.getTime();
        const delay = nextRetryAt - Date.now();
        delays.push(delay);
        unmount();
      }

      // With jitter, not all delays should be exactly the same
      // With 10% jitter on 1000ms, delays should be between 900-1100ms
      delays.forEach((delay) => {
        expect(delay).toBeGreaterThanOrEqual(900);
        expect(delay).toBeLessThanOrEqual(1100);
      });
    });
  });

  describe("reset and cancel", () => {
    it("should reset attempt count to 0", () => {
      const { result } = renderHook(() => useRetry());

      act(() => {
        result.current.scheduleRetry();
      });
      expect(result.current.state.attempt).toBe(1);

      act(() => {
        result.current.reset();
      });
      expect(result.current.state.attempt).toBe(0);
      expect(result.current.state.isRetrying).toBe(false);
      expect(result.current.state.nextRetryAt).toBeNull();
    });

    it("should cancel pending retry without resetting attempt", () => {
      const onRetry = vi.fn();
      const { result } = renderHook(() => useRetry({ onRetry }));

      act(() => {
        result.current.scheduleRetry();
      });
      expect(result.current.state.attempt).toBe(1);
      expect(result.current.state.isRetrying).toBe(true);

      act(() => {
        result.current.cancel();
      });
      expect(result.current.state.attempt).toBe(1); // unchanged
      expect(result.current.state.isRetrying).toBe(false);
      expect(result.current.state.nextRetryAt).toBeNull();

      // Verify callback was never called
      vi.advanceTimersByTime(5000);
      expect(onRetry).not.toHaveBeenCalled();
    });
  });

  describe("cleanup on unmount", () => {
    it("should cancel pending retry on unmount", () => {
      const onRetry = vi.fn();
      const { result, unmount } = renderHook(() => useRetry({ onRetry }));

      act(() => {
        result.current.scheduleRetry();
      });

      unmount();

      // Advance time and verify callback was not called
      vi.advanceTimersByTime(5000);
      expect(onRetry).not.toHaveBeenCalled();
    });
  });

  describe("user configuration", () => {
    it("should accept custom retry configuration", () => {
      const onRetry = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useRetry({
          onRetry,
          config: {
            maxRetries: 3,
            baseDelay: 500,
            maxDelay: 2000,
            backoffFactor: 1.5,
            jitter: 0,
          },
        })
      );

      // First retry
      act(() => {
        result.current.scheduleRetry();
      });

      const nextRetryAt = result.current.state.nextRetryAt!.getTime();
      const delay = nextRetryAt - Date.now();
      expect(delay).toBeCloseTo(500, -2);
    });

    it("should allow disabling retries with maxRetries: 0", () => {
      const onMaxRetriesExceeded = vi.fn();
      const { result } = renderHook(() =>
        useRetry({
          config: { maxRetries: 0 },
          onMaxRetriesExceeded,
        })
      );

      act(() => {
        result.current.scheduleRetry();
      });

      expect(result.current.state.attempt).toBe(0);
      expect(onMaxRetriesExceeded).toHaveBeenCalledTimes(1);
    });
  });
});
