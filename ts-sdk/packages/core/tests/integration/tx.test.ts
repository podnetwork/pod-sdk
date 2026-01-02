// Integration tests for transaction sending with wallet
//
// These tests verify the full flow of sending transactions using a wallet signer.
// They use mocked RPC responses to test the integration between components
// without requiring a real network connection.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PodClient } from "../../src/client/client.js";
import { parsePod } from "../../src/utils/format.js";
import type { Hash } from "../../src/types/hash.js";
import type { Address } from "../../src/types/address.js";
import type { Signer } from "../../src/tx/namespace.js";

// Test constants
const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const TEST_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as Address;
const RECIPIENT_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as Address;
const TEST_TX_HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hash;
const TEST_CHAIN_ID = 1293n;

// Mock wallet signer for testing
class MockWallet implements Signer {
  readonly address: Address;
  private readonly privateKey: string;

  constructor(privateKey: string, address: Address) {
    this.privateKey = privateKey;
    this.address = address;
  }

  async getAddress(): Promise<Address> {
    await Promise.resolve(); // Satisfy eslint require-await
    return this.address;
  }

  async signTransaction(): Promise<`0x${string}`> {
    await Promise.resolve(); // Satisfy eslint require-await
    // Return a mock signed transaction
    return "0x02f8738205050185012a05f20082520894742d35cc6634c0532925a3b844bc9e7595f8e6a2880de0b6b3a764000080c001a0abc123def456a0abc123def456a0abc123def456a0abc123def456a0abc123defa04567890abc4567890abc4567890abc4567890abc4567890abc4567890abc456";
  }
}

// Helper to create a mock receipt for RPC responses (uses hex strings)
// Matches actual node response format with attested_tx and signatures at top level
function createMockReceiptRpc(options?: {
  hasAttestations?: boolean;
  status?: boolean;
}): Record<string, unknown> {
  return {
    transactionHash: TEST_TX_HASH,
    blockNumber: "0x64", // 100
    blockHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    from: TEST_ADDRESS,
    to: RECIPIENT_ADDRESS,
    gasUsed: "0x5208", // 21000
    cumulativeGasUsed: "0x5208",
    status: (options?.status ?? true) ? "0x1" : "0x0",
    contractAddress: null,
    logs: [],
    effectiveGasPrice: "0x3b9aca00", // 1 gwei
    transactionIndex: "0x0",
    // pod-specific fields at top level (matching actual node response)
    attested_tx: {
      hash: TEST_TX_HASH,
      committee_epoch: 0,
    },
    signatures: (options?.hasAttestations ?? true) ? { "0": "3045022100abcdef" } : {},
  };
}

describe("Transaction Integration", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("sendTransaction with Wallet", () => {
    it("should send a simple POD transfer", async () => {
      // Arrange
      const wallet = new MockWallet(TEST_PRIVATE_KEY, TEST_ADDRESS);

      // Setup RPC responses
      mockFetch.mockImplementation(async (url: string, options: RequestInit) => {
        await Promise.resolve(); // Satisfy eslint require-await
        const body = JSON.parse(options.body as string);

        const responses: Record<string, unknown> = {
          eth_chainId: `0x${TEST_CHAIN_ID.toString(16)}`,
          eth_getTransactionCount: "0x0",
          eth_estimateGas: "0x5208", // 21000
          eth_gasPrice: "0x3b9aca00", // 1 gwei
          eth_sendRawTransaction: TEST_TX_HASH,
          eth_getTransactionReceipt: createMockReceiptRpc({ hasAttestations: true }),
        };

        return {
          ok: true,
          json: async () => {
            await Promise.resolve(); // Satisfy eslint require-await
            return {
              jsonrpc: "2.0",
              id: body.id,
              result: responses[body.method as string],
            };
          },
        };
      });

      const client = new PodClient({
        url: "http://localhost:8545",
        chainId: TEST_CHAIN_ID,
      });

      // Act
      const pending = await client.tx.sendTransaction(
        {
          to: RECIPIENT_ADDRESS,
          value: parsePod("1.0"),
        },
        wallet
      );

      // Assert
      expect(pending.txHash).toBe(TEST_TX_HASH);

      // Wait for receipt
      const receiptPromise = pending.waitForReceipt();
      await vi.runAllTimersAsync();
      const receipt = await receiptPromise;

      expect(receipt.transactionHash).toBe(TEST_TX_HASH);
      expect(receipt.status).toBe(true);
      expect(receipt.podMetadata.signatureCount).toBeGreaterThan(0);
    });

    it("should use wallet nonce when not specified", async () => {
      // Arrange
      const wallet = new MockWallet(TEST_PRIVATE_KEY, TEST_ADDRESS);
      const capturedRequests: { method: string; params: unknown[] }[] = [];

      mockFetch.mockImplementation(async (url: string, options: RequestInit) => {
        await Promise.resolve(); // Satisfy eslint require-await
        const body = JSON.parse(options.body as string);
        capturedRequests.push({ method: body.method, params: body.params });

        const responses: Record<string, unknown> = {
          eth_chainId: `0x${TEST_CHAIN_ID.toString(16)}`,
          eth_getTransactionCount: "0x5", // nonce 5
          eth_estimateGas: "0x5208",
          eth_gasPrice: "0x3b9aca00",
          eth_sendRawTransaction: TEST_TX_HASH,
        };

        return {
          ok: true,
          json: async () => {
            await Promise.resolve(); // Satisfy eslint require-await
            return {
              jsonrpc: "2.0",
              id: body.id,
              result: responses[body.method as string],
            };
          },
        };
      });

      const client = new PodClient({
        url: "http://localhost:8545",
        chainId: TEST_CHAIN_ID,
      });

      // Act
      await client.tx.sendTransaction(
        {
          to: RECIPIENT_ADDRESS,
          value: parsePod("1.0"),
        },
        wallet
      );

      // Assert - should have called getTransactionCount
      const nonceRequest = capturedRequests.find((r) => r.method === "eth_getTransactionCount");
      expect(nonceRequest).toBeDefined();
      // SDK sends checksummed address
      expect(nonceRequest?.params[0]).toBe(TEST_ADDRESS);
    });

    it("should estimate gas when not specified", async () => {
      // Arrange
      const wallet = new MockWallet(TEST_PRIVATE_KEY, TEST_ADDRESS);
      const capturedRequests: { method: string; params: unknown[] }[] = [];

      mockFetch.mockImplementation(async (url: string, options: RequestInit) => {
        await Promise.resolve(); // Satisfy eslint require-await
        const body = JSON.parse(options.body as string);
        capturedRequests.push({ method: body.method, params: body.params });

        const responses: Record<string, unknown> = {
          eth_chainId: `0x${TEST_CHAIN_ID.toString(16)}`,
          eth_getTransactionCount: "0x0",
          eth_estimateGas: "0x7530", // 30000
          eth_gasPrice: "0x3b9aca00",
          eth_sendRawTransaction: TEST_TX_HASH,
        };

        return {
          ok: true,
          json: async () => {
            await Promise.resolve(); // Satisfy eslint require-await
            return {
              jsonrpc: "2.0",
              id: body.id,
              result: responses[body.method as string],
            };
          },
        };
      });

      const client = new PodClient({
        url: "http://localhost:8545",
        chainId: TEST_CHAIN_ID,
      });

      // Act
      await client.tx.sendTransaction(
        {
          to: RECIPIENT_ADDRESS,
          value: parsePod("1.0"),
        },
        wallet
      );

      // Assert - should have called estimateGas
      const gasRequest = capturedRequests.find((r) => r.method === "eth_estimateGas");
      expect(gasRequest).toBeDefined();
    });

    it("should use provided gas values without calling estimateGas", async () => {
      // Arrange
      const wallet = new MockWallet(TEST_PRIVATE_KEY, TEST_ADDRESS);
      const capturedRequests: { method: string }[] = [];

      mockFetch.mockImplementation(async (url: string, options: RequestInit) => {
        await Promise.resolve(); // Satisfy eslint require-await
        const body = JSON.parse(options.body as string);
        capturedRequests.push({ method: body.method });

        const responses: Record<string, unknown> = {
          eth_chainId: `0x${TEST_CHAIN_ID.toString(16)}`,
          eth_getTransactionCount: "0x0",
          eth_sendRawTransaction: TEST_TX_HASH,
        };

        return {
          ok: true,
          json: async () => {
            await Promise.resolve(); // Satisfy eslint require-await
            return {
              jsonrpc: "2.0",
              id: body.id,
              result: responses[body.method as string],
            };
          },
        };
      });

      const client = new PodClient({
        url: "http://localhost:8545",
        chainId: TEST_CHAIN_ID,
      });

      // Act
      await client.tx.sendTransaction(
        {
          to: RECIPIENT_ADDRESS,
          value: parsePod("1.0"),
          gas: 21000n,
          maxFeePerGas: 10_000_000_000n,
          maxPriorityFeePerGas: 1_000_000_000n,
        },
        wallet
      );

      // Assert - should NOT have called estimateGas
      const gasRequest = capturedRequests.find((r) => r.method === "eth_estimateGas");
      expect(gasRequest).toBeUndefined();
    });
  });

  describe("PendingTransaction with wallet-signed tx", () => {
    it("should poll for confirmation after signing", async () => {
      // Arrange
      const wallet = new MockWallet(TEST_PRIVATE_KEY, TEST_ADDRESS);
      let receiptCallCount = 0;

      mockFetch.mockImplementation(async (url: string, options: RequestInit) => {
        await Promise.resolve(); // Satisfy eslint require-await
        const body = JSON.parse(options.body as string);

        if (body.method === "eth_getTransactionReceipt") {
          receiptCallCount++;
          // Return undefined first, then confirmed receipt
          if (receiptCallCount === 1) {
            return {
              ok: true,
              json: async () => {
                await Promise.resolve(); // Satisfy eslint require-await
                return {
                  jsonrpc: "2.0",
                  id: body.id,
                  result: null,
                };
              },
            };
          }
          return {
            ok: true,
            json: async () => {
              await Promise.resolve(); // Satisfy eslint require-await
              return {
                jsonrpc: "2.0",
                id: body.id,
                result: createMockReceiptRpc({ hasAttestations: true }),
              };
            },
          };
        }

        const responses: Record<string, unknown> = {
          eth_chainId: `0x${TEST_CHAIN_ID.toString(16)}`,
          eth_getTransactionCount: "0x0",
          eth_estimateGas: "0x5208",
          eth_gasPrice: "0x3b9aca00",
          eth_sendRawTransaction: TEST_TX_HASH,
        };

        return {
          ok: true,
          json: async () => {
            await Promise.resolve(); // Satisfy eslint require-await
            return {
              jsonrpc: "2.0",
              id: body.id,
              result: responses[body.method as string],
            };
          },
        };
      });

      const client = new PodClient({
        url: "http://localhost:8545",
        chainId: TEST_CHAIN_ID,
      });

      // Act
      const pending = await client.tx.sendTransaction(
        { to: RECIPIENT_ADDRESS, value: parsePod("1.0") },
        wallet
      );

      const receiptPromise = pending.waitForReceipt();
      await vi.runAllTimersAsync();
      const receipt = await receiptPromise;

      // Assert
      expect(receiptCallCount).toBeGreaterThan(1);
      expect(receipt.podMetadata.signatureCount).toBeGreaterThan(0);
    });
  });

  describe("Full transfer flow", () => {
    it("should complete a transfer and report correct values", async () => {
      // Arrange
      const wallet = new MockWallet(TEST_PRIVATE_KEY, TEST_ADDRESS);
      const transferAmount = parsePod("2.5");

      mockFetch.mockImplementation(async (url: string, options: RequestInit) => {
        await Promise.resolve(); // Satisfy eslint require-await
        const body = JSON.parse(options.body as string);

        const responses: Record<string, unknown> = {
          eth_chainId: `0x${TEST_CHAIN_ID.toString(16)}`,
          eth_getTransactionCount: "0x0",
          eth_estimateGas: "0x5208",
          eth_gasPrice: "0x3b9aca00",
          eth_sendRawTransaction: TEST_TX_HASH,
          eth_getTransactionReceipt: createMockReceiptRpc({ hasAttestations: true }),
        };

        return {
          ok: true,
          json: async () => {
            await Promise.resolve(); // Satisfy eslint require-await
            return {
              jsonrpc: "2.0",
              id: body.id,
              result: responses[body.method as string],
            };
          },
        };
      });

      const client = new PodClient({
        url: "http://localhost:8545",
        chainId: TEST_CHAIN_ID,
      });

      // Act
      const pending = await client.tx.sendTransaction(
        {
          to: RECIPIENT_ADDRESS,
          value: transferAmount,
        },
        wallet
      );

      const receiptPromise = pending.waitForReceipt();
      await vi.runAllTimersAsync();
      const receipt = await receiptPromise;

      // Assert
      expect(receipt.from).toBe(TEST_ADDRESS);
      expect(receipt.to).toBe(RECIPIENT_ADDRESS);
      expect(receipt.status).toBe(true);
      expect(receipt.gasUsed).toBe(21000n);
    });
  });
});
