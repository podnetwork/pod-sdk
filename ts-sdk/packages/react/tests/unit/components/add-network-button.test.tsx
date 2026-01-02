/**
 * Tests for AddNetworkButton compound component
 */

/* eslint-disable @typescript-eslint/no-deprecated */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/promise-function-async */
/* eslint-disable @typescript-eslint/no-confusing-void-expression */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, renderHook, act, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { AddNetworkButton } from "../../../src/components/add-network-button/index.js";
import { useAddNetworkButtonContext } from "../../../src/components/add-network-button/add-network-context.js";

// Mock wallet-browser package
vi.mock("@podnetwork/wallet-browser", () => ({
  addPodNetworkToWallet: vi.fn(),
  isBrowserWalletAvailable: vi.fn(),
  isConnectedToPodNetwork: vi.fn(),
  POD_DEV_NETWORK: {
    chainId: 1293n,
    chainName: "devnet",
    rpcUrl: "https://rpc.test",
    nativeCurrency: { name: "POD", symbol: "POD", decimals: 18 },
  },
  POD_CHRONOS_DEV_NETWORK: {
    chainId: 9999n,
    chainName: "Chronos devnet",
    rpcUrl: "https://chronos.test",
    nativeCurrency: { name: "POD", symbol: "POD", decimals: 18 },
  },
}));

import {
  addPodNetworkToWallet,
  isBrowserWalletAvailable,
  isConnectedToPodNetwork,
  POD_DEV_NETWORK,
} from "@podnetwork/wallet-browser";

const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
  <AddNetworkButton.Root>{children}</AddNetworkButton.Root>
);

describe("AddNetworkButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(isBrowserWalletAvailable).mockReturnValue(true);
    vi.mocked(isConnectedToPodNetwork).mockResolvedValue(false);
    vi.mocked(addPodNetworkToWallet).mockResolvedValue({
      success: true,
      wasAdded: true,
      wasSwitched: true,
    });

    return () => {
      vi.useRealTimers();
    };
  });

  describe("AddNetworkButton.Root", () => {
    describe("initial state", () => {
      it("provides idle status initially", () => {
        const { result } = renderHook(() => useAddNetworkButtonContext("Test"), { wrapper });
        expect(result.current.status).toBe("idle");
      });

      it("provides default network config", () => {
        const { result } = renderHook(() => useAddNetworkButtonContext("Test"), { wrapper });
        expect(result.current.network).toEqual(POD_DEV_NETWORK);
      });

      it("checks wallet availability on mount", () => {
        renderHook(() => useAddNetworkButtonContext("Test"), { wrapper });
        expect(isBrowserWalletAvailable).toHaveBeenCalled();
      });

      it("checks connection status on mount", async () => {
        renderHook(() => useAddNetworkButtonContext("Test"), { wrapper });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
        expect(isConnectedToPodNetwork).toHaveBeenCalledWith(POD_DEV_NETWORK);
      });

      it("has computed flags correctly set", () => {
        const { result } = renderHook(() => useAddNetworkButtonContext("Test"), { wrapper });
        expect(result.current.isAdding).toBe(false);
        expect(result.current.isSuccess).toBe(false);
        expect(result.current.isError).toBe(false);
        expect(result.current.result).toBeNull();
        expect(result.current.error).toBeNull();
      });
    });

    describe("data attributes", () => {
      it("sets data-status attribute", () => {
        render(
          <AddNetworkButton.Root data-testid="root">
            <span>test</span>
          </AddNetworkButton.Root>
        );
        expect(screen.getByTestId("root").getAttribute("data-status")).toBe("idle");
      });

      it("sets data-connected attribute", async () => {
        vi.mocked(isConnectedToPodNetwork).mockResolvedValue(true);
        render(
          <AddNetworkButton.Root data-testid="root" refreshInterval={0}>
            <span>test</span>
          </AddNetworkButton.Root>
        );
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
        expect(screen.getByTestId("root").getAttribute("data-connected")).toBe("true");
      });

      it("sets data-wallet-available attribute", () => {
        render(
          <AddNetworkButton.Root data-testid="root">
            <span>test</span>
          </AddNetworkButton.Root>
        );
        expect(screen.getByTestId("root").getAttribute("data-wallet-available")).toBe("true");
      });
    });

    describe("refreshInterval", () => {
      it("polls connection status at specified interval", async () => {
        render(
          <AddNetworkButton.Root refreshInterval={1000}>
            <span>test</span>
          </AddNetworkButton.Root>
        );

        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
        expect(isConnectedToPodNetwork).toHaveBeenCalledTimes(2); // initial + 1 interval

        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
        expect(isConnectedToPodNetwork).toHaveBeenCalledTimes(3);
      });

      it("does not poll when refreshInterval is 0", async () => {
        render(
          <AddNetworkButton.Root refreshInterval={0}>
            <span>test</span>
          </AddNetworkButton.Root>
        );

        await act(async () => {
          await vi.advanceTimersByTimeAsync(10000);
        });
        // Only initial check
        expect(isConnectedToPodNetwork).toHaveBeenCalledTimes(1);
      });
    });

    describe("addNetwork callback", () => {
      it("updates status to adding during operation", async () => {
        vi.mocked(addPodNetworkToWallet).mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ success: true, wasAdded: true, wasSwitched: true }), 100)
            )
        );

        const { result } = renderHook(() => useAddNetworkButtonContext("Test"), { wrapper });

        let addPromise: Promise<unknown>;
        act(() => {
          addPromise = result.current.addNetwork();
        });

        expect(result.current.status).toBe("adding");
        expect(result.current.isAdding).toBe(true);

        await act(async () => {
          await vi.advanceTimersByTimeAsync(100);
          await addPromise;
        });

        expect(result.current.status).toBe("success");
      });

      it("updates to success on successful add", async () => {
        const { result } = renderHook(() => useAddNetworkButtonContext("Test"), { wrapper });

        await act(async () => {
          await result.current.addNetwork();
        });

        expect(result.current.status).toBe("success");
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.isConnected).toBe(true);
        expect(result.current.result).toEqual({
          success: true,
          wasAdded: true,
          wasSwitched: true,
        });
      });

      it("updates to error on failed add", async () => {
        vi.mocked(addPodNetworkToWallet).mockResolvedValue({
          success: false,
          wasAdded: false,
          wasSwitched: false,
          error: "User rejected",
        });

        const { result } = renderHook(() => useAddNetworkButtonContext("Test"), { wrapper });

        await act(async () => {
          await result.current.addNetwork();
        });

        expect(result.current.status).toBe("error");
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe("User rejected");
      });

      it("handles thrown errors", async () => {
        vi.mocked(addPodNetworkToWallet).mockRejectedValue(new Error("Network error"));

        const { result } = renderHook(() => useAddNetworkButtonContext("Test"), { wrapper });

        await act(async () => {
          await result.current.addNetwork();
        });

        expect(result.current.status).toBe("error");
        expect(result.current.error).toBe("Network error");
      });
    });

    describe("callbacks", () => {
      it("calls onAddSuccess on successful add", async () => {
        const onAddSuccess = vi.fn();
        const customWrapper = ({ children }: { children: ReactNode }) => (
          <AddNetworkButton.Root onAddSuccess={onAddSuccess}>{children}</AddNetworkButton.Root>
        );

        const { result } = renderHook(() => useAddNetworkButtonContext("Test"), {
          wrapper: customWrapper,
        });

        await act(async () => {
          await result.current.addNetwork();
        });

        expect(onAddSuccess).toHaveBeenCalledWith({
          success: true,
          wasAdded: true,
          wasSwitched: true,
        });
      });

      it("calls onAddError on failed add", async () => {
        vi.mocked(addPodNetworkToWallet).mockResolvedValue({
          success: false,
          wasAdded: false,
          wasSwitched: false,
          error: "User rejected",
        });

        const onAddError = vi.fn();
        const customWrapper = ({ children }: { children: ReactNode }) => (
          <AddNetworkButton.Root onAddError={onAddError}>{children}</AddNetworkButton.Root>
        );

        const { result } = renderHook(() => useAddNetworkButtonContext("Test"), {
          wrapper: customWrapper,
        });

        await act(async () => {
          await result.current.addNetwork();
        });

        expect(onAddError).toHaveBeenCalledWith("User rejected");
      });
    });

    describe("reset", () => {
      it("resets state to idle", async () => {
        const { result } = renderHook(() => useAddNetworkButtonContext("Test"), { wrapper });

        await act(async () => {
          await result.current.addNetwork();
        });
        expect(result.current.status).toBe("success");

        act(() => {
          result.current.reset();
        });

        expect(result.current.status).toBe("idle");
        expect(result.current.result).toBeNull();
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe("AddNetworkButton.Trigger", () => {
    describe("context requirement", () => {
      it("throws when used outside Root", () => {
        expect(() => {
          render(<AddNetworkButton.Trigger>Add Network</AddNetworkButton.Trigger>);
        }).toThrow("must be used within <AddNetworkButton.Root>");
      });
    });

    describe("click behavior", () => {
      it("calls addNetwork on click", async () => {
        render(
          <AddNetworkButton.Root>
            <AddNetworkButton.Trigger>Add Network</AddNetworkButton.Trigger>
          </AddNetworkButton.Root>
        );

        await act(async () => {
          fireEvent.click(screen.getByRole("button"));
        });
        expect(addPodNetworkToWallet).toHaveBeenCalledWith(POD_DEV_NETWORK);
      });

      it("respects event.preventDefault", async () => {
        render(
          <AddNetworkButton.Root>
            <AddNetworkButton.Trigger
              onClick={(e) => {
                e.preventDefault();
              }}
            >
              Add Network
            </AddNetworkButton.Trigger>
          </AddNetworkButton.Root>
        );

        await act(async () => {
          fireEvent.click(screen.getByRole("button"));
        });
        expect(addPodNetworkToWallet).not.toHaveBeenCalled();
      });
    });

    describe("disabled states", () => {
      it("is disabled when wallet not available", () => {
        vi.mocked(isBrowserWalletAvailable).mockReturnValue(false);

        render(
          <AddNetworkButton.Root>
            <AddNetworkButton.Trigger>Add Network</AddNetworkButton.Trigger>
          </AddNetworkButton.Root>
        );

        expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
      });

      it("is disabled when adding", async () => {
        vi.mocked(addPodNetworkToWallet).mockImplementation(
          () => new Promise(() => {}) // Never resolves
        );

        render(
          <AddNetworkButton.Root>
            <AddNetworkButton.Trigger>Add Network</AddNetworkButton.Trigger>
          </AddNetworkButton.Root>
        );

        await act(async () => {
          fireEvent.click(screen.getByRole("button"));
        });
        expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
      });

      it("respects disabled prop", () => {
        render(
          <AddNetworkButton.Root>
            <AddNetworkButton.Trigger disabled>Add Network</AddNetworkButton.Trigger>
          </AddNetworkButton.Root>
        );

        expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
      });
    });

    describe("content display", () => {
      it("shows children by default", () => {
        render(
          <AddNetworkButton.Root>
            <AddNetworkButton.Trigger>Add Pod Network</AddNetworkButton.Trigger>
          </AddNetworkButton.Root>
        );

        expect(screen.getByRole("button").textContent).toBe("Add Pod Network");
      });

      it("shows noWalletText when wallet not available", () => {
        vi.mocked(isBrowserWalletAvailable).mockReturnValue(false);

        render(
          <AddNetworkButton.Root>
            <AddNetworkButton.Trigger noWalletText="Install MetaMask">
              Add Network
            </AddNetworkButton.Trigger>
          </AddNetworkButton.Root>
        );

        expect(screen.getByRole("button").textContent).toBe("Install MetaMask");
      });

      it("shows connectedText when connected", async () => {
        vi.mocked(isConnectedToPodNetwork).mockResolvedValue(true);

        render(
          <AddNetworkButton.Root refreshInterval={0}>
            <AddNetworkButton.Trigger connectedText="Already Connected">
              Add Network
            </AddNetworkButton.Trigger>
          </AddNetworkButton.Root>
        );

        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });

        expect(screen.getByRole("button").textContent).toBe("Already Connected");
      });

      it("hides when connected with connectedText=null", async () => {
        vi.mocked(isConnectedToPodNetwork).mockResolvedValue(true);

        render(
          <AddNetworkButton.Root refreshInterval={0}>
            <AddNetworkButton.Trigger connectedText={null}>Add Network</AddNetworkButton.Trigger>
          </AddNetworkButton.Root>
        );

        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });

        expect(screen.queryByRole("button")).toBeNull();
      });
    });

    describe("data attributes", () => {
      it("sets data-adding attribute", async () => {
        vi.mocked(addPodNetworkToWallet).mockImplementation(
          () => new Promise(() => {}) // Never resolves
        );

        render(
          <AddNetworkButton.Root refreshInterval={0}>
            <AddNetworkButton.Trigger>Add Network</AddNetworkButton.Trigger>
          </AddNetworkButton.Root>
        );

        const button = screen.getByRole("button");
        expect(button.getAttribute("data-adding")).toBe("false");

        await act(async () => {
          fireEvent.click(button);
        });
        expect(button.getAttribute("data-adding")).toBe("true");
      });

      it("sets data-connected attribute", async () => {
        vi.mocked(isConnectedToPodNetwork).mockResolvedValue(true);

        render(
          <AddNetworkButton.Root refreshInterval={0}>
            <AddNetworkButton.Trigger>Add Network</AddNetworkButton.Trigger>
          </AddNetworkButton.Root>
        );

        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });

        expect(screen.getByRole("button").getAttribute("data-connected")).toBe("true");
      });

      it("sets data-wallet-available attribute", () => {
        render(
          <AddNetworkButton.Root>
            <AddNetworkButton.Trigger>Add Network</AddNetworkButton.Trigger>
          </AddNetworkButton.Root>
        );

        expect(screen.getByRole("button").getAttribute("data-wallet-available")).toBe("true");
      });
    });
  });

  describe("AddNetworkButton.Status", () => {
    describe("context requirement", () => {
      it("throws when used outside Root", () => {
        expect(() => {
          render(<AddNetworkButton.Status />);
        }).toThrow("must be used within <AddNetworkButton.Root>");
      });
    });

    describe("visibility", () => {
      it("does not render when idle by default", () => {
        render(
          <AddNetworkButton.Root>
            <AddNetworkButton.Status data-testid="status" />
          </AddNetworkButton.Root>
        );

        expect(screen.queryByTestId("status")).toBeNull();
      });

      it("renders when idle with showIdle=true and custom label", () => {
        render(
          <AddNetworkButton.Root>
            <AddNetworkButton.Status showIdle labels={{ idle: "Ready" }} data-testid="status" />
          </AddNetworkButton.Root>
        );

        expect(screen.getByTestId("status")).toBeTruthy();
      });

      it("renders when adding", async () => {
        vi.mocked(addPodNetworkToWallet).mockImplementation(
          () => new Promise(() => {}) // Never resolves
        );

        render(
          <AddNetworkButton.Root>
            <AddNetworkButton.Trigger>Add</AddNetworkButton.Trigger>
            <AddNetworkButton.Status data-testid="status" />
          </AddNetworkButton.Root>
        );

        await act(async () => {
          fireEvent.click(screen.getByRole("button"));
        });
        expect(screen.getByTestId("status")).toBeTruthy();
      });
    });

    describe("labels", () => {
      it("shows default adding label", async () => {
        vi.mocked(addPodNetworkToWallet).mockImplementation(
          () => new Promise(() => {}) // Never resolves
        );

        render(
          <AddNetworkButton.Root>
            <AddNetworkButton.Trigger>Add</AddNetworkButton.Trigger>
            <AddNetworkButton.Status />
          </AddNetworkButton.Root>
        );

        await act(async () => {
          fireEvent.click(screen.getByRole("button"));
        });
        expect(screen.getByText("Adding network...")).toBeTruthy();
      });

      it("shows default success label", async () => {
        render(
          <AddNetworkButton.Root>
            <AddNetworkButton.Trigger>Add</AddNetworkButton.Trigger>
            <AddNetworkButton.Status />
          </AddNetworkButton.Root>
        );

        await act(async () => {
          fireEvent.click(screen.getByRole("button"));
        });
        expect(screen.getByText("Network added")).toBeTruthy();
      });

      it("shows custom labels", async () => {
        vi.mocked(addPodNetworkToWallet).mockImplementation(
          () => new Promise(() => {}) // Never resolves
        );

        render(
          <AddNetworkButton.Root>
            <AddNetworkButton.Trigger>Add</AddNetworkButton.Trigger>
            <AddNetworkButton.Status labels={{ adding: "Please wait..." }} />
          </AddNetworkButton.Root>
        );

        await act(async () => {
          fireEvent.click(screen.getByRole("button"));
        });
        expect(screen.getByText("Please wait...")).toBeTruthy();
      });

      it("shows error message on error", async () => {
        vi.mocked(addPodNetworkToWallet).mockResolvedValue({
          success: false,
          wasAdded: false,
          wasSwitched: false,
          error: "User rejected the request",
        });

        render(
          <AddNetworkButton.Root>
            <AddNetworkButton.Trigger>Add</AddNetworkButton.Trigger>
            <AddNetworkButton.Status />
          </AddNetworkButton.Root>
        );

        await act(async () => {
          fireEvent.click(screen.getByRole("button"));
        });
        expect(screen.getByText("User rejected the request")).toBeTruthy();
      });
    });

    describe("showNetworkName", () => {
      it("shows network name on success when enabled", async () => {
        render(
          <AddNetworkButton.Root>
            <AddNetworkButton.Trigger>Add</AddNetworkButton.Trigger>
            <AddNetworkButton.Status showNetworkName />
          </AddNetworkButton.Root>
        );

        await act(async () => {
          fireEvent.click(screen.getByRole("button"));
        });
        expect(screen.getByText("Connected to devnet")).toBeTruthy();
      });

      it("shows network name when already connected", async () => {
        vi.mocked(isConnectedToPodNetwork).mockResolvedValue(true);

        render(
          <AddNetworkButton.Root refreshInterval={0}>
            <AddNetworkButton.Status showNetworkName />
          </AddNetworkButton.Root>
        );

        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });

        expect(screen.getByText("Connected to devnet")).toBeTruthy();
      });
    });

    describe("data attributes", () => {
      it("sets data-status attribute", async () => {
        vi.mocked(addPodNetworkToWallet).mockImplementation(
          () => new Promise(() => {}) // Never resolves
        );

        render(
          <AddNetworkButton.Root>
            <AddNetworkButton.Trigger>Add</AddNetworkButton.Trigger>
            <AddNetworkButton.Status data-testid="status" />
          </AddNetworkButton.Root>
        );

        await act(async () => {
          fireEvent.click(screen.getByRole("button"));
        });
        expect(screen.getByTestId("status").getAttribute("data-status")).toBe("adding");
      });

      it("sets aria-live attribute for accessibility", async () => {
        vi.mocked(addPodNetworkToWallet).mockImplementation(
          () => new Promise(() => {}) // Never resolves
        );

        render(
          <AddNetworkButton.Root>
            <AddNetworkButton.Trigger>Add</AddNetworkButton.Trigger>
            <AddNetworkButton.Status data-testid="status" />
          </AddNetworkButton.Root>
        );

        await act(async () => {
          fireEvent.click(screen.getByRole("button"));
        });
        expect(screen.getByTestId("status").getAttribute("aria-live")).toBe("polite");
      });
    });
  });

  describe("integration tests", () => {
    it("complete add network flow", async () => {
      const onAddSuccess = vi.fn();

      render(
        <AddNetworkButton.Root onAddSuccess={onAddSuccess}>
          <AddNetworkButton.Trigger>Add Pod Network</AddNetworkButton.Trigger>
          <AddNetworkButton.Status />
        </AddNetworkButton.Root>
      );

      // Initial state
      expect(screen.getByRole("button").textContent).toBe("Add Pod Network");
      expect(screen.queryByText("Adding network...")).toBeNull();

      // Click to add
      await act(async () => {
        fireEvent.click(screen.getByRole("button"));
      });

      // Success state
      expect(screen.getByText("Network added")).toBeTruthy();
      expect(onAddSuccess).toHaveBeenCalled();
    });

    it("error recovery flow", async () => {
      vi.mocked(addPodNetworkToWallet)
        .mockResolvedValueOnce({
          success: false,
          wasAdded: false,
          wasSwitched: false,
          error: "User rejected",
        })
        .mockResolvedValueOnce({
          success: true,
          wasAdded: true,
          wasSwitched: true,
        });

      render(
        <AddNetworkButton.Root>
          <AddNetworkButton.Trigger>Add Pod Network</AddNetworkButton.Trigger>
          <AddNetworkButton.Status />
        </AddNetworkButton.Root>
      );

      // First attempt - fails
      await act(async () => {
        fireEvent.click(screen.getByRole("button"));
      });
      expect(screen.getByText("User rejected")).toBeTruthy();

      // Second attempt - succeeds
      await act(async () => {
        fireEvent.click(screen.getByRole("button"));
      });
      expect(screen.getByText("Network added")).toBeTruthy();
    });
  });
});
