/**
 * @module client/gas-price
 * @description Gas price strategy and caching
 */

import { getLogger, LoggerCategory } from "../logging/index.js";

const logger = getLogger(LoggerCategory.CORE);

/**
 * Gas price strategy configuration.
 *
 * - 'auto': Cache gas price with TTL, fetch on miss, fallback to default
 * - 'always_fetch': Always fetch fresh gas price (no caching)
 * - { fixed: bigint }: Use a fixed gas price
 *
 * @example
 * ```typescript
 * // Auto strategy with caching (default)
 * const strategy: GasPriceStrategy = 'auto';
 *
 * // Always fetch fresh price
 * const strategy: GasPriceStrategy = 'always_fetch';
 *
 * // Fixed price of 2 Gwei
 * const strategy: GasPriceStrategy = { fixed: 2_000_000_000n };
 * ```
 */
export type GasPriceStrategy = "auto" | "always_fetch" | { fixed: bigint };

/**
 * Gas price fetcher function type.
 */
export type GasPriceFetcher = () => Promise<bigint>;

/**
 * Cached gas price entry.
 */
interface CachedGasPrice {
  value: bigint;
  timestamp: number;
}

/**
 * Gas price manager with caching support.
 *
 * Implements the gas price strategy logic with automatic caching
 * and fallback to default values.
 *
 * @example
 * ```typescript
 * const manager = new GasPriceManager({
 *   strategy: 'auto',
 *   defaultGasPrice: 1_000_000_000n,
 *   cacheTtl: 12_000,
 *   fetcher: async () => {
 *     // Fetch from RPC
 *     return await rpc.getGasPrice();
 *   },
 * });
 *
 * const gasPrice = await manager.getGasPrice();
 * ```
 */
export class GasPriceManager {
  private readonly strategy: GasPriceStrategy;
  private readonly defaultGasPrice: bigint;
  private readonly cacheTtl: number;
  private readonly fetcher: GasPriceFetcher;
  private cache: CachedGasPrice | undefined;

  constructor(options: {
    strategy: GasPriceStrategy;
    defaultGasPrice: bigint;
    cacheTtl: number;
    fetcher: GasPriceFetcher;
  }) {
    this.strategy = options.strategy;
    this.defaultGasPrice = options.defaultGasPrice;
    this.cacheTtl = options.cacheTtl;
    this.fetcher = options.fetcher;
  }

  /**
   * Gets the current gas price based on the configured strategy.
   *
   * @returns The gas price in wei
   */
  async getGasPrice(): Promise<bigint> {
    // Fixed strategy - return fixed value
    if (typeof this.strategy === "object" && "fixed" in this.strategy) {
      logger.debug("Using fixed gas price", { gasPrice: this.strategy.fixed.toString() });
      return this.strategy.fixed;
    }

    // Always fetch - no caching
    if (this.strategy === "always_fetch") {
      return this.fetchWithFallback();
    }

    // Auto strategy - use cache with TTL
    if (this.cache !== undefined && this.isCacheValid()) {
      logger.debug("Using cached gas price", {
        gasPrice: this.cache.value.toString(),
        age: Date.now() - this.cache.timestamp,
      });
      return this.cache.value;
    }

    const gasPrice = await this.fetchWithFallback();
    this.cache = {
      value: gasPrice,
      timestamp: Date.now(),
    };
    return gasPrice;
  }

  /**
   * Clears the gas price cache.
   * Useful when you want to force a fresh fetch on next call.
   */
  clearCache(): void {
    this.cache = undefined;
    logger.debug("Gas price cache cleared");
  }

  /**
   * Checks if the cache is still valid.
   */
  private isCacheValid(): boolean {
    if (this.cache === undefined) return false;
    return Date.now() - this.cache.timestamp < this.cacheTtl;
  }

  /**
   * Fetches gas price with fallback to default.
   */
  private async fetchWithFallback(): Promise<bigint> {
    try {
      const gasPrice = await this.fetcher();
      logger.debug("Fetched gas price", { gasPrice: gasPrice.toString() });
      return gasPrice;
    } catch (error) {
      logger.warn("Failed to fetch gas price, using default", {
        error: error instanceof Error ? error.message : String(error),
        defaultGasPrice: this.defaultGasPrice.toString(),
      });
      return this.defaultGasPrice;
    }
  }
}
