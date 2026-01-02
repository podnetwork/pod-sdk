/**
 * @module tx/polling
 * @description Polling configuration for transaction receipt waiting
 */

/**
 * Configuration for polling transaction receipts.
 *
 * Uses exponential backoff with jitter to avoid thundering herd problems.
 *
 * @example
 * ```typescript
 * const config: PollingConfig = {
 *   initialDelay: 100,      // Start with 100ms
 *   maxDelay: 10000,        // Cap at 10 seconds
 *   multiplier: 2.0,        // Double each attempt
 *   maxAttempts: 10,        // Give up after 10 attempts
 * };
 * ```
 */
export interface PollingConfig {
  /**
   * Initial delay before first poll in milliseconds.
   * @default 100
   */
  readonly initialDelay: number;

  /**
   * Maximum delay between polls in milliseconds.
   * @default 10000
   */
  readonly maxDelay: number;

  /**
   * Multiplier for exponential backoff.
   * @default 2.0
   */
  readonly multiplier: number;

  /**
   * Maximum number of polling attempts.
   * @default 10
   */
  readonly maxAttempts: number;
}

/**
 * Default polling configuration.
 *
 * Suitable for typical transaction confirmation times:
 * - Polls: 100ms, 200ms, 400ms, 800ms, 1600ms, 3200ms, 6400ms, 10000ms, 10000ms, 10000ms
 * - Total time before timeout: ~43 seconds
 */
export const DEFAULT_POLLING_CONFIG: Readonly<PollingConfig> = {
  initialDelay: 100,
  maxDelay: 10_000,
  multiplier: 2.0,
  maxAttempts: 10,
} as const;

/**
 * Default timeout for waiting on transaction receipts.
 * @default 120000 (2 minutes)
 */
export const DEFAULT_TIMEOUT = 120_000;

/**
 * Calculates the delay for a polling attempt with exponential backoff and jitter.
 *
 * @param attempt - Zero-based attempt number
 * @param config - Polling configuration
 * @returns Delay in milliseconds with ±10% jitter
 *
 * @example
 * ```typescript
 * const delay = calculatePollingDelay(3, DEFAULT_POLLING_CONFIG);
 * // Returns ~800ms (with jitter: 720-880ms)
 * ```
 */
export function calculatePollingDelay(attempt: number, config: PollingConfig): number {
  // Calculate base delay with exponential backoff
  const baseDelay = Math.min(
    config.initialDelay * Math.pow(config.multiplier, attempt),
    config.maxDelay
  );

  // Add ±10% jitter to prevent thundering herd
  const jitter = baseDelay * 0.1 * (Math.random() * 2 - 1);

  return Math.floor(baseDelay + jitter);
}

/**
 * Merges partial config with defaults.
 *
 * @param partial - Partial polling configuration
 * @returns Complete polling configuration
 */
export function resolvePollingConfig(partial?: Partial<PollingConfig>): PollingConfig {
  if (partial === undefined) {
    return DEFAULT_POLLING_CONFIG;
  }

  return {
    initialDelay: partial.initialDelay ?? DEFAULT_POLLING_CONFIG.initialDelay,
    maxDelay: partial.maxDelay ?? DEFAULT_POLLING_CONFIG.maxDelay,
    multiplier: partial.multiplier ?? DEFAULT_POLLING_CONFIG.multiplier,
    maxAttempts: partial.maxAttempts ?? DEFAULT_POLLING_CONFIG.maxAttempts,
  };
}
