// Add network tests for @podnetwork/wallet-browser
//
// These tests verify the add-network utilities for EIP-3085 network addition.
// Since we can't use actual MetaMask in automated tests, we mock the provider
// interface to test all the integration logic.

import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  addPodNetworkToWallet,
  switchToPodNetwork,
  isBrowserWalletAvailable,
  getCurrentChainId,
  isConnectedToPodNetwork,
  POD_DEV_NETWORK,
  POD_CHRONOS_DEV_NETWORK,
  type PodNetworkConfig,
} from "../../src/add-network.js";
import type { EIP1193Provider } from "../../src/types.js";

// Mock the @podnetwork/core module
vi.mock("@podnetwork/core", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    isBrowser: vi.fn(() => true),
  };
});

/**
 * Create a mock EIP-1193 provider for testing.
 */
function createMockProvider(
  overrides?: Partial<{
    currentChainId: string;
    throwOnSwitch: { code?: number; message?: string } | null;
    throwOnAdd: { code?: number; message?: string } | null;
  }>
): EIP1193Provider {
  const config = {
    currentChainId: "0x1", // Default to chain 1
    throwOnSwitch: null as { code?: number; message?: string } | null,
    throwOnAdd: null as { code?: number; message?: string } | null,
    ...overrides,
  };

  return {
    // eslint-disable-next-line @typescript-eslint/require-await
    request: vi.fn(async ({ method }: { method: string }): Promise<string | null> => {
      switch (method) {
        case "eth_chainId":
          return config.currentChainId;

        case "wallet_switchEthereumChain":
          if (config.throwOnSwitch != null) {
            const error = new Error(config.throwOnSwitch.message ?? "Switch failed");
            (error as Error & { code?: number }).code = config.throwOnSwitch.code;
            throw error;
          }
          return null;

        case "wallet_addEthereumChain":
          if (config.throwOnAdd != null) {
            const error = new Error(config.throwOnAdd.message ?? "Add failed");
            (error as Error & { code?: number }).code = config.throwOnAdd.code;
            throw error;
          }
          return null;

        default:
          throw new Error(`Unknown method: ${method}`);
      }
    }),
    on: vi.fn(),
    removeListener: vi.fn(),
  };
}

describe("add-network utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POD_DEV_NETWORK preset", () => {
    it("has correct chain ID", () => {
      expect(POD_DEV_NETWORK.chainId).toBe(1293n);
    });

    it("has correct chain name", () => {
      expect(POD_DEV_NETWORK.chainName).toBe("devnet");
    });

    it("has correct native currency", () => {
      expect(POD_DEV_NETWORK.nativeCurrency).toEqual({
        name: "POD",
        symbol: "POD",
        decimals: 18,
      });
    });

    it("has required properties", () => {
      expect(POD_DEV_NETWORK.rpcUrl).toBeDefined();
      expect(POD_DEV_NETWORK.wsUrl).toBeDefined();
      expect(POD_DEV_NETWORK.blockExplorerUrl).toBeDefined();
    });
  });

  describe("POD_CHRONOS_DEV_NETWORK preset", () => {
    it("has correct chain name", () => {
      expect(POD_CHRONOS_DEV_NETWORK.chainName).toBe("Chronos devnet");
    });

    it("has correct native currency", () => {
      expect(POD_CHRONOS_DEV_NETWORK.nativeCurrency).toEqual({
        name: "POD",
        symbol: "POD",
        decimals: 18,
      });
    });

    it("has required properties", () => {
      expect(POD_CHRONOS_DEV_NETWORK.rpcUrl).toBeDefined();
      expect(POD_CHRONOS_DEV_NETWORK.wsUrl).toBeDefined();
      expect(POD_CHRONOS_DEV_NETWORK.blockExplorerUrl).toBeDefined();
    });
  });

  describe("isBrowserWalletAvailable", () => {
    it("returns true when provider has request method", () => {
      const provider = createMockProvider();
      expect(isBrowserWalletAvailable(provider)).toBe(true);
    });

    it("returns false when provider has no request method", () => {
      const provider = { on: vi.fn() } as unknown as EIP1193Provider;
      expect(isBrowserWalletAvailable(provider)).toBe(false);
    });

    it("returns false when provider is undefined", () => {
      expect(isBrowserWalletAvailable(undefined as unknown as EIP1193Provider)).toBe(false);
    });
  });

  describe("getCurrentChainId", () => {
    it("returns the current chain ID", async () => {
      const provider = createMockProvider({ currentChainId: "0x50d" }); // 1293
      const chainId = await getCurrentChainId(provider);
      expect(chainId).toBe(1293n);
    });

    it("returns null when provider is unavailable", async () => {
      const chainId = await getCurrentChainId(undefined as unknown as EIP1193Provider);
      expect(chainId).toBeNull();
    });

    it("returns null when request fails", async () => {
      const provider: EIP1193Provider = {
        request: vi.fn().mockRejectedValue(new Error("Failed")),
        on: vi.fn(),
        removeListener: vi.fn(),
      };
      const chainId = await getCurrentChainId(provider);
      expect(chainId).toBeNull();
    });
  });

  describe("isConnectedToPodNetwork", () => {
    it("returns true when connected to the specified network", async () => {
      const provider = createMockProvider({ currentChainId: "0x50d" }); // 1293
      const connected = await isConnectedToPodNetwork(POD_DEV_NETWORK, provider);
      expect(connected).toBe(true);
    });

    it("returns false when connected to a different network", async () => {
      const provider = createMockProvider({ currentChainId: "0x1" }); // Ethereum mainnet
      const connected = await isConnectedToPodNetwork(POD_DEV_NETWORK, provider);
      expect(connected).toBe(false);
    });

    it("returns false when provider is unavailable", async () => {
      const connected = await isConnectedToPodNetwork(
        POD_DEV_NETWORK,
        undefined as unknown as EIP1193Provider
      );
      expect(connected).toBe(false);
    });
  });

  describe("addPodNetworkToWallet", () => {
    it("switches to existing network successfully", async () => {
      const provider = createMockProvider();
      const result = await addPodNetworkToWallet(POD_DEV_NETWORK, provider);

      expect(result).toEqual({
        success: true,
        wasAdded: false,
        wasSwitched: true,
      });
      expect(provider.request).toHaveBeenCalledWith({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x50d" }],
      });
    });

    it("adds and switches when chain not found (4902)", async () => {
      const provider = createMockProvider({
        throwOnSwitch: { code: 4902 },
      });
      const result = await addPodNetworkToWallet(POD_DEV_NETWORK, provider);

      expect(result).toEqual({
        success: true,
        wasAdded: true,
        wasSwitched: true,
      });
      expect(provider.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "wallet_addEthereumChain",
        })
      );
    });

    it("returns error when user rejects switch (4001)", async () => {
      const provider = createMockProvider({
        throwOnSwitch: { code: 4001 },
      });
      const result = await addPodNetworkToWallet(POD_DEV_NETWORK, provider);

      expect(result.success).toBe(false);
      expect(result.error).toContain("User rejected");
    });

    it("returns error when user rejects add", async () => {
      const provider = createMockProvider({
        throwOnSwitch: { code: 4902 },
        throwOnAdd: { code: 4001 },
      });
      const result = await addPodNetworkToWallet(POD_DEV_NETWORK, provider);

      expect(result.success).toBe(false);
      expect(result.error).toContain("User rejected");
    });

    it("returns error when no wallet is available", async () => {
      const result = await addPodNetworkToWallet(
        POD_DEV_NETWORK,
        undefined as unknown as EIP1193Provider
      );

      expect(result).toEqual({
        success: false,
        wasAdded: false,
        wasSwitched: false,
        error: "No browser wallet detected. Please install MetaMask or a compatible wallet.",
      });
    });

    it("handles unknown switch errors", async () => {
      const error = new Error("Unknown error");
      (error as { code?: number }).code = 9999;
      const provider = createMockProvider({
        throwOnSwitch: error as { code?: number; message?: string },
      });
      const result = await addPodNetworkToWallet(POD_DEV_NETWORK, provider);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });

    it("handles unknown add errors", async () => {
      const error = new Error("Add failed");
      (error as { code?: number }).code = 9999;
      const provider = createMockProvider({
        throwOnSwitch: { code: 4902 },
        throwOnAdd: error as { code?: number; message?: string },
      });
      const result = await addPodNetworkToWallet(POD_DEV_NETWORK, provider);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Add failed");
    });

    it("uses default network when none specified", async () => {
      const provider = createMockProvider();
      await addPodNetworkToWallet(undefined, provider);

      expect(provider.request).toHaveBeenCalledWith({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x50d" }], // POD_DEV_NETWORK chain ID
      });
    });

    it("includes block explorer URL when available", async () => {
      const provider = createMockProvider({
        throwOnSwitch: { code: 4902 },
      });
      await addPodNetworkToWallet(POD_DEV_NETWORK, provider);

      expect(provider.request).toHaveBeenCalledWith({
        method: "wallet_addEthereumChain",
        params: [
          expect.objectContaining({
            blockExplorerUrls: expect.any(Array),
          }),
        ],
      });
    });

    it("handles user rejection by message pattern", async () => {
      const provider = createMockProvider({
        throwOnSwitch: { message: "User denied transaction" },
      });
      const result = await addPodNetworkToWallet(POD_DEV_NETWORK, provider);

      expect(result.success).toBe(false);
      expect(result.error).toContain("User rejected");
    });
  });

  describe("switchToPodNetwork", () => {
    it("switches successfully when network exists", async () => {
      const provider = createMockProvider();
      const result = await switchToPodNetwork(POD_DEV_NETWORK, provider);

      expect(result).toEqual({
        success: true,
        wasAdded: false,
        wasSwitched: true,
      });
    });

    it("returns error when chain not found (does not add)", async () => {
      const provider = createMockProvider({
        throwOnSwitch: { code: 4902 },
      });
      const result = await switchToPodNetwork(POD_DEV_NETWORK, provider);

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(result.error).toContain("addPodNetworkToWallet");
      // Should NOT call wallet_addEthereumChain
      expect(provider.request).not.toHaveBeenCalledWith(
        expect.objectContaining({
          method: "wallet_addEthereumChain",
        })
      );
    });

    it("returns error when user rejects", async () => {
      const provider = createMockProvider({
        throwOnSwitch: { code: 4001 },
      });
      const result = await switchToPodNetwork(POD_DEV_NETWORK, provider);

      expect(result.success).toBe(false);
      expect(result.error).toContain("User rejected");
    });

    it("returns error when no wallet is available", async () => {
      const result = await switchToPodNetwork(
        POD_DEV_NETWORK,
        undefined as unknown as EIP1193Provider
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("No browser wallet detected");
    });

    it("handles unknown errors", async () => {
      const error = new Error("Switch failed");
      (error as { code?: number }).code = 9999;
      const provider = createMockProvider({
        throwOnSwitch: error as { code?: number; message?: string },
      });
      const result = await switchToPodNetwork(POD_DEV_NETWORK, provider);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Switch failed");
    });

    it("uses default network when none specified", async () => {
      const provider = createMockProvider();
      await switchToPodNetwork(undefined, provider);

      expect(provider.request).toHaveBeenCalledWith({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x50d" }],
      });
    });
  });

  describe("custom network config", () => {
    const customNetwork: PodNetworkConfig = {
      chainId: 42n,
      chainName: "Custom Network",
      rpcUrl: "https://custom.rpc",
      nativeCurrency: {
        name: "CUSTOM",
        symbol: "CUST",
        decimals: 18,
      },
    };

    it("uses custom chain ID for switch", async () => {
      const provider = createMockProvider();
      await addPodNetworkToWallet(customNetwork, provider);

      expect(provider.request).toHaveBeenCalledWith({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x2a" }], // 42 in hex
      });
    });

    it("includes custom config in add request", async () => {
      const provider = createMockProvider({
        throwOnSwitch: { code: 4902 },
      });
      await addPodNetworkToWallet(customNetwork, provider);

      expect(provider.request).toHaveBeenCalledWith({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x2a",
            chainName: "Custom Network",
            nativeCurrency: {
              name: "CUSTOM",
              symbol: "CUST",
              decimals: 18,
            },
            rpcUrls: ["https://custom.rpc"],
          },
        ],
      });
    });

    it("omits block explorer when not provided", async () => {
      const provider = createMockProvider({
        throwOnSwitch: { code: 4902 },
      });
      await addPodNetworkToWallet(customNetwork, provider);

      const addCall = (provider.request as ReturnType<typeof vi.fn>).mock.calls.find(
        (call: unknown[]) => (call[0] as { method: string }).method === "wallet_addEthereumChain"
      );
      expect(addCall[0].params[0]).not.toHaveProperty("blockExplorerUrls");
    });
  });
});
