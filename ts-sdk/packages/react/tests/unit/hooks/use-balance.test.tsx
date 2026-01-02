/**
 * Tests for useBalance hook
 *
 * NOTE: This test file does NOT use vi.useFakeTimers() because it causes
 * memory issues with Vitest's worker threads and React's testing library.
 * Instead, we use short real intervals for timer-based tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { act, type ReactNode } from "react";

// Mock all external SDK modules BEFORE importing any source files
vi.mock("@podnetwork/wallet", () => ({
  Wallet: vi.fn(),
  Mnemonic: vi.fn(),
}));

vi.mock("@podnetwork/wallet-browser", () => ({
  BrowserWalletSigner: {
    connect: vi.fn(),
    isAvailable: vi.fn().mockReturnValue(false),
  },
}));

// Mock PodClient
const mockGetBalance = vi.fn();
const mockClient = {
  rpc: {
    getBalance: mockGetBalance,
  },
};

vi.mock("@podnetwork/core", () => ({
  PodClient: vi.fn().mockImplementation(() => mockClient),
  PodError: {
    from: vi.fn().mockImplementation((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      const isNetwork = message.toLowerCase().includes("network");
      return {
        message,
        code: isNetwork ? "NETWORK_ERROR" : "POD_0001",
        retryable: isNetwork,
      };
    }),
  },
  WalletError: class WalletError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

// Mock useWallet to return a connected address
vi.mock("../../../src/hooks/use-wallet.js", () => ({
  useWallet: vi.fn().mockReturnValue({
    address: "0xdefault1234567890abcdef1234567890abcdef",
    isConnected: true,
  }),
}));

// Now import source files AFTER mocks are set up
import { WalletProvider } from "../../../src/providers/wallet-provider.js";
import { ClientProvider } from "../../../src/providers/client-provider.js";
import { useBalance } from "../../../src/hooks/use-balance.js";

const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
  <ClientProvider rpcUrl="http://localhost:8545">
    <WalletProvider>{children}</WalletProvider>
  </ClientProvider>
);

describe("useBalance", () => {
  beforeEach(() => {
    mockGetBalance.mockReset();
  });

  describe("initial state", () => {
    it("should start with loading state", async () => {
      mockGetBalance.mockResolvedValue(1000000000000000000n);

      const { result } = renderHook(() => useBalance(), { wrapper });

      // Initial state should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.balance).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should have null balance initially", () => {
      // Use a slow-resolving promise to test initial state
      let resolvePromise: ((value: bigint) => void) | undefined;
      mockGetBalance.mockImplementation(
        async () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result, unmount } = renderHook(() => useBalance(), { wrapper });

      expect(result.current.balance).toBeNull();
      expect(result.current.data).toBeNull();

      // Cleanup
      resolvePromise?.(0n);
      unmount();
    });
  });

  describe("fetching balance", () => {
    it("should fetch balance successfully", async () => {
      const expectedBalance = 1500000000000000000n;
      mockGetBalance.mockResolvedValue(expectedBalance);

      const { result } = renderHook(() => useBalance(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.balance).toBe(expectedBalance);
      expect(result.current.data).toBe(expectedBalance);
      expect(result.current.error).toBeNull();
    });

    it("should use wallet address by default", async () => {
      mockGetBalance.mockResolvedValue(1000000000000000000n);

      renderHook(() => useBalance(), { wrapper });

      await waitFor(() => {
        expect(mockGetBalance).toHaveBeenCalled();
      });

      expect(mockGetBalance).toHaveBeenCalledWith("0xdefault1234567890abcdef1234567890abcdef");
    });

    it("should use explicit address when provided", async () => {
      const explicitAddress = "0xexplicit234567890abcdef1234567890abcdef";
      mockGetBalance.mockResolvedValue(2000000000000000000n);

      renderHook(() => useBalance({ address: explicitAddress }), { wrapper });

      await waitFor(() => {
        expect(mockGetBalance).toHaveBeenCalled();
      });

      expect(mockGetBalance).toHaveBeenCalledWith(explicitAddress);
    });
  });

  describe("enabled option", () => {
    it("should not fetch when enabled is false", async () => {
      mockGetBalance.mockResolvedValue(1000000000000000000n);

      const { result } = renderHook(() => useBalance({ enabled: false }), {
        wrapper,
      });

      // Wait a short period to ensure no fetch happens
      await new Promise((r) => setTimeout(r, 50));

      expect(mockGetBalance).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.balance).toBeNull();
    });

    it("should fetch when enabled changes to true", async () => {
      mockGetBalance.mockResolvedValue(1000000000000000000n);

      const { rerender } = renderHook((props: { enabled: boolean }) => useBalance(props), {
        wrapper,
        initialProps: { enabled: false },
      });

      expect(mockGetBalance).not.toHaveBeenCalled();

      rerender({ enabled: true });

      await waitFor(() => {
        expect(mockGetBalance).toHaveBeenCalled();
      });
    });
  });

  describe("refresh", () => {
    it("should refresh balance when refresh is called", async () => {
      mockGetBalance
        .mockResolvedValueOnce(1000000000000000000n)
        .mockResolvedValueOnce(2000000000000000000n);

      const { result } = renderHook(() => useBalance(), { wrapper });

      await waitFor(() => {
        expect(result.current.balance).toBe(1000000000000000000n);
      });

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.balance).toBe(2000000000000000000n);
      });
    });

    it("should set isRefreshing during refresh", async () => {
      let resolveSecondCall: ((value: bigint) => void) | undefined;
      mockGetBalance.mockResolvedValueOnce(1000000000000000000n).mockImplementationOnce(
        async () =>
          new Promise((resolve) => {
            resolveSecondCall = resolve;
          })
      );

      const { result } = renderHook(() => useBalance(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.refresh();
      });

      expect(result.current.isRefreshing).toBe(true);
      expect(result.current.isLoading).toBe(false); // Not loading, refreshing

      act(() => {
        resolveSecondCall!(2000000000000000000n);
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });
  });

  describe("refetch interval", () => {
    it("should auto-refresh at specified interval", async () => {
      mockGetBalance.mockResolvedValue(1000000000000000000n);

      // Use a very short interval for testing
      const { unmount } = renderHook(() => useBalance({ refetchInterval: 50 }), { wrapper });

      await waitFor(() => {
        expect(mockGetBalance).toHaveBeenCalledTimes(1);
      });

      // Wait for interval to fire
      await waitFor(
        () => {
          expect(mockGetBalance).toHaveBeenCalledTimes(2);
        },
        { timeout: 200 }
      );

      unmount();
    });

    it("should not auto-refresh when interval is 0", async () => {
      mockGetBalance.mockResolvedValue(1000000000000000000n);

      const { unmount } = renderHook(() => useBalance({ refetchInterval: 0 }), {
        wrapper,
      });

      await waitFor(() => {
        expect(mockGetBalance).toHaveBeenCalledTimes(1);
      });

      // Wait a short period
      await new Promise((r) => setTimeout(r, 100));

      // Should still be 1 call
      expect(mockGetBalance).toHaveBeenCalledTimes(1);

      unmount();
    });
  });

  describe("error handling", () => {
    it("should set error on fetch failure", async () => {
      mockGetBalance.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useBalance(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toContain("Network error");
      expect(result.current.balance).toBeNull();
    });

    it("should clear error on successful fetch", async () => {
      // Use a non-retryable error (validation error) so auto-retry doesn't interfere
      mockGetBalance
        .mockRejectedValueOnce(new Error("Invalid address format"))
        .mockResolvedValueOnce(1000000000000000000n);

      const { result } = renderHook(() => useBalance(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      expect(result.current.balance).toBe(1000000000000000000n);
    });
  });

  describe("retry behavior", () => {
    it("should expose retry state", async () => {
      mockGetBalance.mockResolvedValue(1000000000000000000n);

      const { result } = renderHook(() => useBalance(), { wrapper });

      expect(result.current.retry).toEqual({
        attempt: 0,
        nextRetryAt: null,
        isRetrying: false,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should classify network errors as retryable", async () => {
      // Error with "network" in message should be classified as retryable
      const networkError = new Error("Network connection failed");
      mockGetBalance.mockRejectedValue(networkError);

      const { result, unmount } = renderHook(() => useBalance(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Verify error is classified as retryable
      expect(result.current.error?.retryable).toBe(true);
      expect(result.current.error?.code).toBe("NETWORK_ERROR");

      unmount();
    });
  });

  describe("cleanup", () => {
    it("should cleanup interval on unmount", async () => {
      mockGetBalance.mockResolvedValue(1000000000000000000n);

      const { unmount } = renderHook(() => useBalance({ refetchInterval: 50 }), { wrapper });

      await waitFor(() => {
        expect(mockGetBalance).toHaveBeenCalledTimes(1);
      });

      const callCountBeforeUnmount = mockGetBalance.mock.calls.length;
      unmount();

      // Wait a period longer than the interval
      await new Promise((r) => setTimeout(r, 100));

      // Should not have made additional calls after unmount
      expect(mockGetBalance).toHaveBeenCalledTimes(callCountBeforeUnmount);
    });
  });

  describe("return values", () => {
    it("should return address being queried", async () => {
      mockGetBalance.mockResolvedValue(1000000000000000000n);

      const { result } = renderHook(() => useBalance(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.address).toBe("0xdefault1234567890abcdef1234567890abcdef");
    });

    it("should return token address when provided", async () => {
      const tokenAddress = "0xtoken1234567890abcdef1234567890abcdef12";
      mockGetBalance.mockResolvedValue(1000000n);

      const { result } = renderHook(() => useBalance({ token: tokenAddress }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.token).toBe(tokenAddress);
    });

    it("should return null token for native token", async () => {
      mockGetBalance.mockResolvedValue(1000000000000000000n);

      const { result } = renderHook(() => useBalance(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.token).toBeNull();
    });
  });
});
