/**
 * @module tests/gas-price
 * @description Unit tests for gas price caching and strategies
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GasPriceManager, type GasPriceStrategy } from "../client/gas-price.js";

describe("GasPriceManager", () => {
  const DEFAULT_GAS_PRICE = 1_000_000_000n; // 1 Gwei
  const CACHE_TTL = 12_000; // 12 seconds

  let mockFetcher: ReturnType<typeof vi.fn<[], Promise<bigint>>>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetcher = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function createManager(strategy: GasPriceStrategy): GasPriceManager {
    return new GasPriceManager({
      strategy,
      defaultGasPrice: DEFAULT_GAS_PRICE,
      cacheTtl: CACHE_TTL,
      fetcher: mockFetcher,
    });
  }

  describe("fixed strategy", () => {
    it("should return fixed gas price without fetching", async () => {
      // Arrange
      const fixedPrice = 5_000_000_000n;
      const manager = createManager({ fixed: fixedPrice });

      // Act
      const result = await manager.getGasPrice();

      // Assert
      expect(result).toBe(fixedPrice);
      expect(mockFetcher).not.toHaveBeenCalled();
    });

    it("should always return the same fixed price on multiple calls", async () => {
      // Arrange
      const fixedPrice = 2_000_000_000n;
      const manager = createManager({ fixed: fixedPrice });

      // Act
      const result1 = await manager.getGasPrice();
      vi.advanceTimersByTime(60_000); // Advance 1 minute
      const result2 = await manager.getGasPrice();

      // Assert
      expect(result1).toBe(fixedPrice);
      expect(result2).toBe(fixedPrice);
      expect(mockFetcher).not.toHaveBeenCalled();
    });
  });

  describe("always_fetch strategy", () => {
    it("should always fetch fresh gas price", async () => {
      // Arrange
      const manager = createManager("always_fetch");
      mockFetcher.mockResolvedValue(3_000_000_000n);

      // Act
      const result1 = await manager.getGasPrice();
      mockFetcher.mockResolvedValue(4_000_000_000n);
      const result2 = await manager.getGasPrice();

      // Assert
      expect(result1).toBe(3_000_000_000n);
      expect(result2).toBe(4_000_000_000n);
      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });

    it("should return default on fetch failure", async () => {
      // Arrange
      const manager = createManager("always_fetch");
      mockFetcher.mockRejectedValue(new Error("Network error"));

      // Act
      const result = await manager.getGasPrice();

      // Assert
      expect(result).toBe(DEFAULT_GAS_PRICE);
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe("auto strategy", () => {
    it("should fetch on first call", async () => {
      // Arrange
      const manager = createManager("auto");
      mockFetcher.mockResolvedValue(2_500_000_000n);

      // Act
      const result = await manager.getGasPrice();

      // Assert
      expect(result).toBe(2_500_000_000n);
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });

    it("should return cached value within TTL", async () => {
      // Arrange
      const manager = createManager("auto");
      mockFetcher.mockResolvedValue(2_500_000_000n);

      // Act
      const result1 = await manager.getGasPrice();
      vi.advanceTimersByTime(CACHE_TTL / 2); // Half the TTL
      const result2 = await manager.getGasPrice();

      // Assert
      expect(result1).toBe(2_500_000_000n);
      expect(result2).toBe(2_500_000_000n);
      expect(mockFetcher).toHaveBeenCalledTimes(1); // Only one fetch
    });

    it("should refetch after TTL expires", async () => {
      // Arrange
      const manager = createManager("auto");
      mockFetcher.mockResolvedValue(2_500_000_000n);

      // Act
      const result1 = await manager.getGasPrice();
      vi.advanceTimersByTime(CACHE_TTL + 1); // Just past TTL
      mockFetcher.mockResolvedValue(3_500_000_000n);
      const result2 = await manager.getGasPrice();

      // Assert
      expect(result1).toBe(2_500_000_000n);
      expect(result2).toBe(3_500_000_000n);
      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });

    it("should return default on first fetch failure", async () => {
      // Arrange
      const manager = createManager("auto");
      mockFetcher.mockRejectedValue(new Error("Connection refused"));

      // Act
      const result = await manager.getGasPrice();

      // Assert
      expect(result).toBe(DEFAULT_GAS_PRICE);
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });

    it("should cache even default value after fetch failure", async () => {
      // Arrange
      const manager = createManager("auto");
      mockFetcher.mockRejectedValue(new Error("Connection refused"));

      // Act
      await manager.getGasPrice();
      // Advance time but stay within TTL
      vi.advanceTimersByTime(CACHE_TTL / 2);
      const result2 = await manager.getGasPrice();

      // Assert - should use cached default, not refetch
      expect(result2).toBe(DEFAULT_GAS_PRICE);
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe("clearCache", () => {
    it("should force refetch after cache clear", async () => {
      // Arrange
      const manager = createManager("auto");
      mockFetcher.mockResolvedValue(2_000_000_000n);

      // Act
      const result1 = await manager.getGasPrice();
      manager.clearCache();
      mockFetcher.mockResolvedValue(3_000_000_000n);
      const result2 = await manager.getGasPrice();

      // Assert
      expect(result1).toBe(2_000_000_000n);
      expect(result2).toBe(3_000_000_000n);
      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });

    it("should have no effect on fixed strategy", async () => {
      // Arrange
      const fixedPrice = 5_000_000_000n;
      const manager = createManager({ fixed: fixedPrice });

      // Act
      const result1 = await manager.getGasPrice();
      manager.clearCache();
      const result2 = await manager.getGasPrice();

      // Assert
      expect(result1).toBe(fixedPrice);
      expect(result2).toBe(fixedPrice);
      expect(mockFetcher).not.toHaveBeenCalled();
    });

    it("should have no effect on always_fetch strategy", async () => {
      // Arrange
      const manager = createManager("always_fetch");
      mockFetcher.mockResolvedValue(2_000_000_000n);

      // Act
      await manager.getGasPrice();
      manager.clearCache();
      await manager.getGasPrice();

      // Assert - always_fetch always calls fetcher anyway
      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });
  });

  describe("edge cases", () => {
    it("should handle zero gas price from fetcher", async () => {
      // Arrange
      const manager = createManager("auto");
      mockFetcher.mockResolvedValue(0n);

      // Act
      const result = await manager.getGasPrice();

      // Assert
      expect(result).toBe(0n);
    });

    it("should handle very large gas price", async () => {
      // Arrange
      const manager = createManager("auto");
      const largePrice = 1_000_000_000_000_000_000n; // 1 ETH worth of gas price (extreme)
      mockFetcher.mockResolvedValue(largePrice);

      // Act
      const result = await manager.getGasPrice();

      // Assert
      expect(result).toBe(largePrice);
    });

    it("should handle rapid sequential calls correctly", async () => {
      // Arrange
      const manager = createManager("auto");
      let fetchCount = 0;
      mockFetcher.mockImplementation(async () => {
        await Promise.resolve(); // Satisfy eslint require-await
        fetchCount++;
        return BigInt(fetchCount * 1_000_000_000);
      });

      // Act - multiple rapid calls
      const promises = [manager.getGasPrice(), manager.getGasPrice(), manager.getGasPrice()];
      const results = await Promise.all(promises);

      // Assert - first call fetches, others might use cache
      // Due to async nature, at least one should be 1_000_000_000n
      expect(results.some((r) => r === 1_000_000_000n)).toBe(true);
    });
  });
});
