/**
 * Tests for useBatchedUpdates hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { useBatchedUpdates } from "../../../src/hooks/internal/use-batched-updates.js";

describe("useBatchedUpdates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("should start with null data", () => {
      const { result } = renderHook(() => useBatchedUpdates<number>());

      expect(result.current.data).toBeNull();
    });
  });

  describe("default 100ms batch interval", () => {
    it("should batch updates with default 100ms interval", async () => {
      const { result } = renderHook(() => useBatchedUpdates<number>());

      // Queue multiple rapid updates
      act(() => {
        result.current.update(1);
        result.current.update(2);
        result.current.update(3);
      });

      // Data should still be null (pending)
      expect(result.current.data).toBeNull();

      // Advance time just under 100ms
      await act(async () => {
        await vi.advanceTimersByTimeAsync(99);
      });
      expect(result.current.data).toBeNull();

      // Advance past 100ms
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2);
      });

      // Should now have the last update
      expect(result.current.data).toBe(3);
    });
  });

  describe("batching rapid updates", () => {
    it("should only apply the most recent update after batch interval", async () => {
      const { result } = renderHook(() => useBatchedUpdates<string>());

      act(() => {
        result.current.update("first");
      });

      // Immediately send more updates
      act(() => {
        result.current.update("second");
        result.current.update("third");
        result.current.update("last");
      });

      // Wait for batch interval
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Only the last value should be applied
      expect(result.current.data).toBe("last");
    });

    it("should not trigger multiple renders for rapid updates", async () => {
      let renderCount = 0;
      const { result } = renderHook(() => {
        renderCount++;
        return useBatchedUpdates<number>();
      });

      const initialRenderCount = renderCount;

      // Queue many rapid updates
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.update(i);
        }
      });

      // Advance timer to flush
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Should have minimal extra renders (just the batched update)
      expect(renderCount - initialRenderCount).toBeLessThanOrEqual(2);
      expect(result.current.data).toBe(99);
    });
  });

  describe("configurable batch interval", () => {
    it("should accept custom batch interval", async () => {
      const { result } = renderHook(() => useBatchedUpdates<number>({ batchInterval: 200 }));

      act(() => {
        result.current.update(42);
      });

      // Should not flush at 100ms
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(result.current.data).toBeNull();

      // Should not flush at 150ms
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(result.current.data).toBeNull();

      // Should flush at 200ms
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(result.current.data).toBe(42);
    });

    it("should work with very short batch interval", async () => {
      const { result } = renderHook(() => useBatchedUpdates<number>({ batchInterval: 10 }));

      act(() => {
        result.current.update(1);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      expect(result.current.data).toBe(1);
    });
  });

  describe("flush", () => {
    it("should immediately apply pending update", () => {
      const { result } = renderHook(() => useBatchedUpdates<string>());

      act(() => {
        result.current.update("pending");
      });

      expect(result.current.data).toBeNull();

      act(() => {
        result.current.flush();
      });

      expect(result.current.data).toBe("pending");
    });

    it("should cancel pending timer when flushing", async () => {
      const { result } = renderHook(() => useBatchedUpdates<number>());

      act(() => {
        result.current.update(1);
      });

      act(() => {
        result.current.flush();
      });
      expect(result.current.data).toBe(1);

      // Queue another update
      act(() => {
        result.current.update(2);
      });

      // The timer for update 2 should work independently
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.data).toBe(2);
    });

    it("should do nothing if no pending update", () => {
      const { result } = renderHook(() => useBatchedUpdates<string>());

      act(() => {
        result.current.flush();
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe("clear", () => {
    it("should clear data and pending updates", async () => {
      const { result } = renderHook(() => useBatchedUpdates<string>());

      // Set some data first
      act(() => {
        result.current.update("value");
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(result.current.data).toBe("value");

      // Queue a new update
      act(() => {
        result.current.update("pending");
      });

      // Clear everything
      act(() => {
        result.current.clear();
      });

      expect(result.current.data).toBeNull();

      // Advance time - pending update should not apply
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe("cleanup on unmount", () => {
    it("should cancel pending timer on unmount", async () => {
      const { result, unmount } = renderHook(() => useBatchedUpdates<number>());

      act(() => {
        result.current.update(42);
      });

      unmount();

      // Advance time - should not throw or error
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });
    });
  });

  describe("complex data types", () => {
    it("should work with object data", async () => {
      interface UserData {
        id: number;
        name: string;
      }

      const { result } = renderHook(() => useBatchedUpdates<UserData>());

      act(() => {
        result.current.update({ id: 1, name: "Alice" });
        result.current.update({ id: 2, name: "Bob" });
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.data).toEqual({ id: 2, name: "Bob" });
    });

    it("should work with array data", async () => {
      const { result } = renderHook(() => useBatchedUpdates<number[]>());

      act(() => {
        result.current.update([1, 2, 3]);
        result.current.update([4, 5, 6, 7]);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.data).toEqual([4, 5, 6, 7]);
    });
  });
});
