// Browser wallet signer tests for @podnetwork/wallet-browser
//
// These tests verify the BrowserWalletSigner integration with EIP-1193 providers.
// Since we can't use actual MetaMask in automated tests, we mock the provider
// interface to test all the integration logic.
//
// For real browser testing with MetaMask, use:
// - @playwright/test with metamask-testing-library
// - Manual testing in a browser environment

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PodWalletError, POD_ERRORS, toAddress } from "@podnetwork/core";

import { BrowserWalletSigner, type EIP1193Provider } from "../../src/browser-signer.js";

// Mock the browser environment detection from @podnetwork/core
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
function createMockProvider(overrides?: Partial<EIP1193Provider>): EIP1193Provider {
  const defaultMock: EIP1193Provider = {
    request: vi.fn(async ({ method }: { method: string }) => {
      switch (method) {
        case "eth_requestAccounts":
          return Promise.resolve(["0x742d35cC6634C0532925A3B844Bc9e7595f8e6a2"]);
        case "eth_accounts":
          return Promise.resolve(["0x742d35cC6634C0532925A3B844Bc9e7595f8e6a2"]);
        case "eth_chainId":
          return Promise.resolve("0x50d"); // 1293 in hex (Pod testnet)
        case "personal_sign":
          return Promise.resolve("0x1234567890abcdef...signature");
        case "eth_sendTransaction":
          return Promise.resolve("0x" + "a".repeat(64)); // Valid transaction hash
        default:
          throw new Error(`Unknown method: ${method}`);
      }
    }),
    on: vi.fn(),
    removeListener: vi.fn(),
  };

  return {
    ...defaultMock,
    ...overrides,
  };
}

describe("BrowserWalletSigner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isAvailable", () => {
    it("returns true when provider is available", () => {
      const provider = createMockProvider();
      expect(BrowserWalletSigner.isAvailable({ provider })).toBe(true);
    });

    it("returns false when provider has no request method", () => {
      const provider = { on: vi.fn() } as unknown as EIP1193Provider;
      expect(BrowserWalletSigner.isAvailable({ provider })).toBe(false);
    });

    it("returns false when provider is undefined", () => {
      expect(
        BrowserWalletSigner.isAvailable({ provider: undefined as unknown as EIP1193Provider })
      ).toBe(false);
    });
  });

  describe("connect", () => {
    it("connects to provider and returns signer", async () => {
      const provider = createMockProvider();
      const signer = await BrowserWalletSigner.connect({ provider });

      expect(signer).toBeInstanceOf(BrowserWalletSigner);
      expect(signer.address).toBe(toAddress("0x742d35cC6634C0532925A3B844Bc9e7595f8e6a2"));
    });

    it("uses specified account index", async () => {
      const provider = createMockProvider({
        request: vi.fn(async ({ method }: { method: string }) => {
          if (method === "eth_requestAccounts") {
            return Promise.resolve([
              "0x742d35cC6634C0532925A3B844Bc9e7595f8e6a2",
              "0x1234567890123456789012345678901234567890",
            ]);
          }
          return Promise.resolve(null);
        }),
      });

      const signer = await BrowserWalletSigner.connect({
        provider,
        accountIndex: 1,
      });

      expect(signer.address).toBe(toAddress("0x1234567890123456789012345678901234567890"));
    });

    it("throws when no provider available", async () => {
      // Pass undefined provider explicitly
      await expect(
        BrowserWalletSigner.connect({ provider: undefined as unknown as EIP1193Provider })
      ).rejects.toThrow(PodWalletError);
    });

    it("throws when no accounts returned", async () => {
      const provider = createMockProvider({
        request: vi.fn(async () => Promise.resolve([])),
      });

      await expect(BrowserWalletSigner.connect({ provider })).rejects.toThrow(
        "Browser wallet is not connected"
      );
    });

    it("throws when account index out of range", async () => {
      const provider = createMockProvider();

      await expect(BrowserWalletSigner.connect({ provider, accountIndex: 5 })).rejects.toThrow(
        "Browser wallet is not connected"
      );
    });

    it("throws PodWalletError with NOT_CONNECTED code on user rejection", async () => {
      const provider = createMockProvider({
        request: vi.fn(async () => {
          const error = new Error("User rejected") as Error & { code: number };
          error.code = 4001;
          return Promise.reject(error);
        }),
      });

      try {
        await BrowserWalletSigner.connect({ provider });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(PodWalletError);
        expect((error as PodWalletError).code).toBe(POD_ERRORS.WALLET_USER_REJECTED);
        expect((error as PodWalletError).message).toContain("rejected");
      }
    });
  });

  describe("getAddress", () => {
    it("returns the connected address", async () => {
      const provider = createMockProvider();
      const signer = await BrowserWalletSigner.connect({ provider });

      const address = await signer.getAddress();
      expect(address).toBe(toAddress("0x742d35cC6634C0532925A3B844Bc9e7595f8e6a2"));
    });
  });

  describe("signMessage", () => {
    it("signs message via personal_sign", async () => {
      const expectedSignature = "0xabcdef...signature";
      const mockRequest = vi.fn(
        async ({ method, params }: { method: string; params?: unknown[] }) => {
          if (method === "eth_requestAccounts") {
            return Promise.resolve(["0x742d35cC6634C0532925A3B844Bc9e7595f8e6a2"]);
          }
          if (method === "personal_sign") {
            // Verify params are correct (message, address)
            expect(params?.[0]).toBe("Hello, Pod!");
            expect(params?.[1]).toBe("0x742d35cC6634C0532925A3B844Bc9e7595f8e6a2");
            return Promise.resolve(expectedSignature);
          }
          return Promise.resolve(null);
        }
      );

      const provider = createMockProvider({ request: mockRequest });
      const signer = await BrowserWalletSigner.connect({ provider });

      const signature = await signer.signMessage("Hello, Pod!");
      expect(signature).toBe(expectedSignature);
    });

    it("handles Uint8Array message", async () => {
      const mockRequest = vi.fn(
        async ({ method, params }: { method: string; params?: unknown[] }) => {
          if (method === "eth_requestAccounts") {
            return Promise.resolve(["0x742d35cC6634C0532925A3B844Bc9e7595f8e6a2"]);
          }
          if (method === "personal_sign") {
            // Message should be converted to hex
            expect(params?.[0]).toBe("0x48656c6c6f"); // "Hello" in hex
            return Promise.resolve("0xsignature");
          }
          return Promise.resolve(null);
        }
      );

      const provider = createMockProvider({ request: mockRequest });
      const signer = await BrowserWalletSigner.connect({ provider });

      const message = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      await signer.signMessage(message);
    });

    it("handles user rejection during message signing", async () => {
      const provider = createMockProvider({
        request: vi.fn(async ({ method }: { method: string }) => {
          if (method === "eth_requestAccounts") {
            return Promise.resolve(["0x742d35cC6634C0532925A3B844Bc9e7595f8e6a2"]);
          }
          if (method === "personal_sign") {
            const error = new Error("User denied message signature") as Error & {
              code: number;
            };
            error.code = 4001;
            return Promise.reject(error);
          }
          return Promise.resolve(null);
        }),
      });

      const signer = await BrowserWalletSigner.connect({ provider });

      try {
        await signer.signMessage("Test message");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(PodWalletError);
        expect((error as PodWalletError).code).toBe(POD_ERRORS.WALLET_USER_REJECTED);
      }
    });
  });

  describe("sendTransaction", () => {
    it("validates chain ID before sending", async () => {
      const mockRequest = vi.fn(async ({ method }: { method: string }) => {
        if (method === "eth_requestAccounts") {
          return Promise.resolve(["0x742d35cC6634C0532925A3B844Bc9e7595f8e6a2"]);
        }
        if (method === "eth_chainId") {
          return Promise.resolve("0x1"); // Chain ID 1 (different from expected 1293)
        }
        return Promise.resolve(null);
      });

      const provider = createMockProvider({ request: mockRequest });
      const signer = await BrowserWalletSigner.connect({ provider });

      try {
        await signer.sendTransaction(
          { to: toAddress("0x1234567890123456789012345678901234567890"), value: 1n },
          1293n
        );
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(PodWalletError);
        expect((error as PodWalletError).code).toBe(POD_ERRORS.WALLET_CHAIN_MISMATCH);
        expect((error as PodWalletError).message).toContain("1293");
        expect((error as PodWalletError).message).toContain("1");
      }
    });

    it("sends transaction when chain ID matches", async () => {
      const expectedHash = "0x" + "b".repeat(64);
      const mockRequest = vi.fn(async ({ method }: { method: string }) => {
        if (method === "eth_requestAccounts") {
          return Promise.resolve(["0x742d35cC6634C0532925A3B844Bc9e7595f8e6a2"]);
        }
        if (method === "eth_chainId") {
          return Promise.resolve("0x50d"); // 1293 in hex - matches expected
        }
        if (method === "eth_sendTransaction") {
          return Promise.resolve(expectedHash);
        }
        return Promise.resolve(null);
      });

      const provider = createMockProvider({ request: mockRequest });
      const signer = await BrowserWalletSigner.connect({ provider });

      const hash = await signer.sendTransaction(
        { to: toAddress("0x1234567890123456789012345678901234567890"), value: 1n },
        1293n
      );

      expect(hash).toBe(expectedHash);
    });
  });

  describe("eip1193Provider", () => {
    it("exposes the underlying provider", async () => {
      const provider = createMockProvider();
      const signer = await BrowserWalletSigner.connect({ provider });

      expect(signer.eip1193Provider).toBe(provider);
    });

    it("allows advanced provider operations", async () => {
      const provider = createMockProvider({
        request: vi.fn(async ({ method }: { method: string }) => {
          if (method === "eth_requestAccounts") {
            return Promise.resolve(["0x742d35cC6634C0532925A3B844Bc9e7595f8e6a2"]);
          }
          if (method === "eth_chainId") {
            return Promise.resolve("0x50d");
          }
          return Promise.resolve(null);
        }),
      });

      const signer = await BrowserWalletSigner.connect({ provider });

      // Use provider for custom RPC calls
      const chainId = await signer.eip1193Provider.request({
        method: "eth_chainId",
      });
      expect(chainId).toBe("0x50d");
    });
  });

  describe("browser compatibility", () => {
    it("works without Buffer global (simulated browser environment)", async () => {
      // Save Buffer reference if it exists
      type GlobalWithBuffer = typeof globalThis & { Buffer?: unknown };
      const globalWithBuffer = globalThis as GlobalWithBuffer;
      const originalBuffer = globalWithBuffer.Buffer;
      const hadBuffer = "Buffer" in globalWithBuffer;

      // Remove Buffer from global scope to simulate browser environment
      delete globalWithBuffer.Buffer;

      try {
        const mockRequest = vi.fn(
          async ({ method, params }: { method: string; params?: unknown[] }) => {
            if (method === "eth_requestAccounts") {
              return Promise.resolve(["0x742d35cC6634C0532925A3B844Bc9e7595f8e6a2"]);
            }
            if (method === "personal_sign") {
              // Verify the message was converted to hex without Buffer
              expect(params?.[0]).toBe("0x48656c6c6f"); // "Hello" in hex
              return Promise.resolve("0xsignature");
            }
            return Promise.resolve(null);
          }
        );

        const provider = createMockProvider({ request: mockRequest });
        const signer = await BrowserWalletSigner.connect({ provider });

        // Sign message with Uint8Array - this uses bytesToHex which should work without Buffer
        const message = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
        const signature = await signer.signMessage(message);

        expect(signature).toBe("0xsignature");
      } finally {
        // Restore Buffer if it was present
        if (hadBuffer) {
          globalWithBuffer.Buffer = originalBuffer;
        }
      }
    });
  });
});
