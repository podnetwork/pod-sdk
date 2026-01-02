/**
 * @module client/config
 * @description PodClient configuration types and validation
 */

import { z } from "zod";
import { DEFAULTS } from "../constants.js";
import type { GasPriceStrategy } from "./gas-price.js";

/**
 * Pod client configuration.
 *
 * @example
 * ```typescript
 * const config: PodClientConfig = {
 *   url: 'https://rpc.testnet.pod.network',
 *   timeout: 30000,
 *   gasPriceStrategy: 'auto',
 * };
 * ```
 */
export interface PodClientConfig {
  /**
   * RPC endpoint URL (required).
   */
  url: string;

  /**
   * WebSocket endpoint URL (optional).
   * Required for subscription functionality.
   */
  wsUrl?: string;

  /**
   * Request timeout in milliseconds.
   * @default 30000
   */
  timeout: number;

  /**
   * Maximum retry attempts for failed requests.
   * @default 3
   */
  maxRetries: number;

  /**
   * Gas price strategy.
   * - 'auto': Cache gas price with TTL, fetch on miss, fallback to default
   * - 'always_fetch': Always fetch fresh gas price
   * - { fixed: bigint }: Use a fixed gas price
   *
   * @default 'auto'
   */
  gasPriceStrategy: GasPriceStrategy;

  /**
   * Default gas price fallback in wei.
   * Used when gas price cannot be fetched.
   * @default 1000000000 (1 Gwei)
   */
  defaultGasPrice: bigint;

  /**
   * Gas price cache TTL in milliseconds.
   * Only used with 'auto' strategy.
   * @default 12000
   */
  gasPriceCacheTtl: number;

  /**
   * Chain ID override.
   * If not provided, will be auto-detected on first use.
   */
  chainId?: bigint;

  /**
   * Maximum concurrent WebSocket subscriptions.
   * @default 10
   */
  maxSubscriptions: number;

  /**
   * Gas estimation buffer as percentage.
   * Applied to estimated gas to provide safety margin.
   * - 100 = no buffer (use exact estimate)
   * - 120 = 20% buffer (recommended)
   * - 150 = 50% buffer (conservative)
   *
   * @default 120 (20% buffer)
   */
  gasEstimationBuffer: number;
}

/**
 * Partial configuration for client creation.
 * URL is required, everything else has defaults.
 */
export type PodClientConfigInput = Partial<PodClientConfig> & { url: string };

/**
 * Zod schema for validating client configuration.
 */
export const PodClientConfigSchema = z.object({
  url: z.string().url("url must be a valid HTTP(S) URL"),
  wsUrl: z.string().url("wsUrl must be a valid WS(S) URL").optional(),
  timeout: z.number().positive().int().default(DEFAULTS.TIMEOUT),
  maxRetries: z.number().nonnegative().int().default(DEFAULTS.MAX_RETRIES),
  gasPriceStrategy: z
    .union([
      z.literal("auto"),
      z.literal("always_fetch"),
      z.object({ fixed: z.bigint().positive() }),
    ])
    .default("auto"),
  defaultGasPrice: z.bigint().positive().default(DEFAULTS.DEFAULT_GAS_PRICE),
  gasPriceCacheTtl: z.number().positive().int().default(DEFAULTS.GAS_PRICE_CACHE_TTL),
  chainId: z.bigint().positive().optional(),
  maxSubscriptions: z.number().int().min(1).max(100).default(DEFAULTS.MAX_SUBSCRIPTIONS),
  gasEstimationBuffer: z
    .number()
    .int()
    .min(100, "gasEstimationBuffer must be at least 100 (no buffer)")
    .max(200, "gasEstimationBuffer must be at most 200 (100% buffer)")
    .default(DEFAULTS.GAS_ESTIMATION_BUFFER),
});

/**
 * Applies default values to a partial configuration.
 *
 * @param input - Partial configuration with at least URL
 * @returns Complete configuration with all defaults applied
 *
 * @example
 * ```typescript
 * const config = resolveConfig({ url: 'https://rpc.testnet.pod.network' });
 * // config.timeout === 30000
 * // config.maxRetries === 3
 * // etc.
 * ```
 */
export function resolveConfig(input: PodClientConfigInput): PodClientConfig {
  const parsed = PodClientConfigSchema.parse(input);
  // Build config without optional undefined values
  const config: PodClientConfig = {
    url: parsed.url,
    timeout: parsed.timeout,
    maxRetries: parsed.maxRetries,
    gasPriceStrategy: parsed.gasPriceStrategy,
    defaultGasPrice: parsed.defaultGasPrice,
    gasPriceCacheTtl: parsed.gasPriceCacheTtl,
    maxSubscriptions: parsed.maxSubscriptions,
    gasEstimationBuffer: parsed.gasEstimationBuffer,
  };
  if (parsed.wsUrl !== undefined) {
    config.wsUrl = parsed.wsUrl;
  }
  if (parsed.chainId !== undefined) {
    config.chainId = parsed.chainId;
  }
  return config;
}

/**
 * Validates that a configuration is complete and valid.
 *
 * @param config - Configuration to validate
 * @throws ZodError if configuration is invalid
 */
export function validateConfig(config: unknown): asserts config is PodClientConfig {
  PodClientConfigSchema.parse(config);
}
