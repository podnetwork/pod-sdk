// Unit tests for PendingTransaction class

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Hash } from "../../../src/types/hash.js";
import type { TransactionReceipt } from "../../../src/schemas/receipt.js";
import {
  PendingTransaction,
  type PollingConfig,
  DEFAULT_POLLING_CONFIG,
  DEFAULT_TIMEOUT,
  calculatePollingDelay,
  resolvePollingConfig,
} from "../../../src/tx/index.js";
import { PodExecutionError, POD_ERRORS } from "../../../src/errors/index.js";

// Sample transaction hash
const SAMPLE_TX_HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hash;

// Sample addresses - use type assertion to match Address branded type
const SAMPLE_FROM =
  "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" as unknown as TransactionReceipt["from"];
const SAMPLE_TO = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199" as unknown as NonNullable<
  TransactionReceipt["to"]
>;

// Create a minimal mock receipt matching actual node response format
function createMockReceipt(options: {
  hasAttestations?: boolean;
  status?: boolean;
}): TransactionReceipt {
  return {
    transactionHash: SAMPLE_TX_HASH,
    blockNumber: 100n,
    blockHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as Hash,
    from: SAMPLE_FROM,
    to: SAMPLE_TO,
    gasUsed: 21000n,
    cumulativeGasUsed: 21000n,
    status: options.status ?? true,
    contractAddress: undefined,
    logs: [],
    effectiveGasPrice: 1000000000n,
    transactionIndex: 0n,
    podMetadata: {
      attestedTx: {
        hash: SAMPLE_TX_HASH,
        committeeEpoch: 0,
      },
      signatures: options.hasAttestations ? { "0": "3045022100abcdef" } : {},
      signatureCount: options.hasAttestations ? 1 : 0,
    },
  };
}

describe("PendingTransaction", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("construction", () => {
    it("should create with txHash and fetcher", () => {
      const fetcher = vi.fn();
      const pending = new PendingTransaction(SAMPLE_TX_HASH, fetcher);

      expect(pending.txHash).toBe(SAMPLE_TX_HASH);
    });

    it("should have default timeout and polling config", () => {
      const fetcher = vi.fn();
      const pending = new PendingTransaction(SAMPLE_TX_HASH, fetcher);

      expect(pending.getTimeout()).toBe(DEFAULT_TIMEOUT);
      expect(pending.getPollingConfig()).toEqual(DEFAULT_POLLING_CONFIG);
    });
  });

  describe("withTimeout", () => {
    it("should create new instance with custom timeout", () => {
      const fetcher = vi.fn();
      const original = new PendingTransaction(SAMPLE_TX_HASH, fetcher);
      const modified = original.withTimeout(60_000);

      expect(modified).not.toBe(original);
      expect(modified.getTimeout()).toBe(60_000);
      expect(original.getTimeout()).toBe(DEFAULT_TIMEOUT);
    });

    it("should throw for non-positive timeout", () => {
      const fetcher = vi.fn();
      const pending = new PendingTransaction(SAMPLE_TX_HASH, fetcher);

      expect(() => pending.withTimeout(0)).toThrow("Timeout must be positive");
      expect(() => pending.withTimeout(-1000)).toThrow("Timeout must be positive");
    });
  });

  describe("withPollingConfig", () => {
    it("should create new instance with custom polling config", () => {
      const fetcher = vi.fn();
      const original = new PendingTransaction(SAMPLE_TX_HASH, fetcher);
      const modified = original.withPollingConfig({ maxAttempts: 20 });

      expect(modified).not.toBe(original);
      expect(modified.getPollingConfig().maxAttempts).toBe(20);
      expect(original.getPollingConfig().maxAttempts).toBe(DEFAULT_POLLING_CONFIG.maxAttempts);
    });

    it("should merge partial config with defaults", () => {
      const fetcher = vi.fn();
      const pending = new PendingTransaction(SAMPLE_TX_HASH, fetcher);
      const modified = pending.withPollingConfig({ initialDelay: 200 });

      const config = modified.getPollingConfig();
      expect(config.initialDelay).toBe(200);
      expect(config.maxDelay).toBe(DEFAULT_POLLING_CONFIG.maxDelay);
      expect(config.multiplier).toBe(DEFAULT_POLLING_CONFIG.multiplier);
      expect(config.maxAttempts).toBe(DEFAULT_POLLING_CONFIG.maxAttempts);
    });
  });

  describe("withoutConfirmation", () => {
    it("should create new instance that returns receipt without waiting for confirmation", async () => {
      // Create a fetcher that returns an unconfirmed receipt
      const unconfirmedReceipt = createMockReceipt({ hasAttestations: false });
      const fetcher = vi.fn().mockResolvedValue(unconfirmedReceipt);

      const pending = new PendingTransaction(SAMPLE_TX_HASH, fetcher);
      const withoutConfirm = pending.withoutConfirmation();

      // This should return immediately without waiting for confirmation
      const receiptPromise = withoutConfirm.waitForReceipt();
      await vi.runAllTimersAsync();
      const receipt = await receiptPromise;

      expect(receipt).toBe(unconfirmedReceipt);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe("tryGetReceipt", () => {
    it("should call fetcher and return receipt", async () => {
      const mockReceipt = createMockReceipt({ hasAttestations: true });
      const fetcher = vi.fn().mockResolvedValue(mockReceipt);
      const pending = new PendingTransaction(SAMPLE_TX_HASH, fetcher);

      const receipt = await pending.tryGetReceipt();

      expect(fetcher).toHaveBeenCalledWith(SAMPLE_TX_HASH);
      expect(receipt).toBe(mockReceipt);
    });

    it("should return undefined when fetcher returns undefined", async () => {
      const fetcher = vi.fn().mockResolvedValue(undefined);
      const pending = new PendingTransaction(SAMPLE_TX_HASH, fetcher);

      const receipt = await pending.tryGetReceipt();

      expect(receipt).toBeUndefined();
    });
  });

  describe("waitForReceipt", () => {
    it("should return receipt when found and confirmed", async () => {
      const confirmedReceipt = createMockReceipt({ hasAttestations: true });
      const fetcher = vi.fn().mockResolvedValue(confirmedReceipt);
      const pending = new PendingTransaction(SAMPLE_TX_HASH, fetcher);

      const receiptPromise = pending.waitForReceipt();
      await vi.runAllTimersAsync();
      const receipt = await receiptPromise;

      expect(receipt).toBe(confirmedReceipt);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("should poll until confirmed", async () => {
      const unconfirmed = createMockReceipt({ hasAttestations: false });
      const confirmed = createMockReceipt({ hasAttestations: true });

      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(undefined) // First call: not found
        .mockResolvedValueOnce(unconfirmed) // Second call: found but not confirmed
        .mockResolvedValueOnce(confirmed); // Third call: confirmed

      const pending = new PendingTransaction(SAMPLE_TX_HASH, fetcher);

      const receiptPromise = pending.waitForReceipt();
      await vi.runAllTimersAsync();
      const receipt = await receiptPromise;

      expect(receipt).toBe(confirmed);
      expect(fetcher).toHaveBeenCalledTimes(3);
    });

    it("should throw POLLING_TIMEOUT after max attempts", async () => {
      const fetcher = vi.fn().mockResolvedValue(undefined);
      const pending = new PendingTransaction(SAMPLE_TX_HASH, fetcher).withPollingConfig({
        maxAttempts: 3,
        initialDelay: 10,
      });

      // Start the promise and attach handler before running timers
      let caughtError: unknown = null;
      const receiptPromise = pending.waitForReceipt().catch((err: unknown) => {
        caughtError = err;
      });

      await vi.runAllTimersAsync();
      await receiptPromise;

      expect(caughtError).toBeInstanceOf(PodExecutionError);
      expect((caughtError as PodExecutionError).code).toBe(POD_ERRORS.TX_POLLING_TIMEOUT);
    });

    it("should throw CONFIRMATION_TIMEOUT when timeout exceeded", async () => {
      // Use real timers for this test since the timeout check uses Date.now()
      vi.useRealTimers();

      const fetcher = vi.fn().mockImplementation(async () => {
        // Add a small delay to let time pass
        await new Promise((resolve) => setTimeout(resolve, 30));
        return undefined;
      });

      const pending = new PendingTransaction(SAMPLE_TX_HASH, fetcher)
        .withTimeout(50) // Very short timeout
        .withPollingConfig({ initialDelay: 10, maxAttempts: 100 });

      await expect(pending.waitForReceipt()).rejects.toMatchObject({
        code: POD_ERRORS.TX_CONFIRMATION_TIMEOUT,
      });

      // Restore fake timers for subsequent tests
      vi.useFakeTimers();
    });
  });
});

describe("PollingConfig utilities", () => {
  describe("DEFAULT_POLLING_CONFIG", () => {
    it("should have expected defaults", () => {
      expect(DEFAULT_POLLING_CONFIG.initialDelay).toBe(100);
      expect(DEFAULT_POLLING_CONFIG.maxDelay).toBe(10_000);
      expect(DEFAULT_POLLING_CONFIG.multiplier).toBe(2.0);
      expect(DEFAULT_POLLING_CONFIG.maxAttempts).toBe(10);
    });
  });

  describe("DEFAULT_TIMEOUT", () => {
    it("should be 2 minutes", () => {
      expect(DEFAULT_TIMEOUT).toBe(120_000);
    });
  });

  describe("calculatePollingDelay", () => {
    it("should return initialDelay for first attempt", () => {
      const config: PollingConfig = {
        initialDelay: 100,
        maxDelay: 10_000,
        multiplier: 2.0,
        maxAttempts: 10,
      };

      // Run multiple times due to jitter
      const delays: number[] = [];
      for (let i = 0; i < 100; i++) {
        delays.push(calculatePollingDelay(0, config));
      }

      // Should be within ±10% of 100
      expect(Math.min(...delays)).toBeGreaterThanOrEqual(90);
      expect(Math.max(...delays)).toBeLessThanOrEqual(110);
    });

    it("should double delay for subsequent attempts", () => {
      const config: PollingConfig = {
        initialDelay: 100,
        maxDelay: 10_000,
        multiplier: 2.0,
        maxAttempts: 10,
      };

      // Test without jitter by checking average of many runs
      let sum = 0;
      const runs = 1000;
      for (let i = 0; i < runs; i++) {
        sum += calculatePollingDelay(3, config);
      }
      const avg = sum / runs;

      // Should be close to 100 * 2^3 = 800 (within 20% due to jitter averaging)
      expect(avg).toBeGreaterThan(700);
      expect(avg).toBeLessThan(900);
    });

    it("should cap at maxDelay", () => {
      const config: PollingConfig = {
        initialDelay: 100,
        maxDelay: 1_000,
        multiplier: 2.0,
        maxAttempts: 10,
      };

      // Attempt 10 would be 100 * 2^10 = 102400, but should cap at 1000
      const delay = calculatePollingDelay(10, config);

      // Should be within ±10% of 1000
      expect(delay).toBeLessThanOrEqual(1100);
    });
  });

  describe("resolvePollingConfig", () => {
    it("should return defaults when no config provided", () => {
      const resolved = resolvePollingConfig();
      expect(resolved).toEqual(DEFAULT_POLLING_CONFIG);
    });

    it("should return defaults when undefined provided", () => {
      const resolved = resolvePollingConfig(undefined);
      expect(resolved).toEqual(DEFAULT_POLLING_CONFIG);
    });

    it("should merge partial config with defaults", () => {
      const resolved = resolvePollingConfig({ maxAttempts: 20 });

      expect(resolved.maxAttempts).toBe(20);
      expect(resolved.initialDelay).toBe(DEFAULT_POLLING_CONFIG.initialDelay);
      expect(resolved.maxDelay).toBe(DEFAULT_POLLING_CONFIG.maxDelay);
      expect(resolved.multiplier).toBe(DEFAULT_POLLING_CONFIG.multiplier);
    });

    it("should allow overriding all fields", () => {
      const custom: PollingConfig = {
        initialDelay: 50,
        maxDelay: 5000,
        multiplier: 1.5,
        maxAttempts: 15,
      };

      const resolved = resolvePollingConfig(custom);
      expect(resolved).toEqual(custom);
    });
  });
});
