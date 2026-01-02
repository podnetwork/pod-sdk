/**
 * @module ws/reconnect
 * @description Exponential backoff reconnection logic for WebSocket connections
 */

import type { ExponentialBackoffPolicy, ReconnectPolicy, NeverReconnectPolicy } from "./types.js";

/**
 * Default values for exponential backoff policy.
 */
const DEFAULTS = {
  initialDelay: 100,
  maxDelay: 30000,
  multiplier: 2,
  maxAttempts: 10,
} as const;

/**
 * Resolved exponential backoff policy with all values filled in.
 *
 * This interface represents a fully-resolved backoff policy where
 * all optional values have been filled with defaults.
 */
export interface ResolvedBackoffPolicy {
  /** Initial delay in milliseconds before first reconnection attempt (default: 100) */
  readonly initialDelay: number;
  /** Maximum delay in milliseconds between reconnection attempts (default: 30000) */
  readonly maxDelay: number;
  /** Multiplier for exponential backoff (default: 2) */
  readonly multiplier: number;
  /** Maximum number of reconnection attempts, or undefined for unlimited (default: 10) */
  readonly maxAttempts: number | undefined;
}

/**
 * Resolves an ExponentialBackoffPolicy to have all values defined.
 *
 * @param policy - The policy to resolve
 * @returns Policy with all values filled in with defaults
 */
export function resolveBackoffPolicy(policy: ExponentialBackoffPolicy): ResolvedBackoffPolicy {
  return {
    initialDelay: policy.initialDelay ?? DEFAULTS.initialDelay,
    maxDelay: policy.maxDelay ?? DEFAULTS.maxDelay,
    multiplier: policy.multiplier ?? DEFAULTS.multiplier,
    maxAttempts: policy.maxAttempts ?? DEFAULTS.maxAttempts,
  };
}

/**
 * Calculates the delay for a reconnection attempt with jitter.
 *
 * The delay follows the formula:
 * `delay = min(initialDelay * multiplier^attempt, maxDelay)`
 *
 * A ±10% jitter is applied to prevent thundering herd problems
 * when many clients reconnect simultaneously.
 *
 * @param attempt - The current attempt number (0-based)
 * @param policy - The resolved backoff policy
 * @returns Delay in milliseconds with jitter applied
 *
 * @example
 * ```typescript
 * const policy = resolveBackoffPolicy({ type: 'exponentialBackoff' });
 *
 * calculateDelay(0, policy); // ~100ms (with jitter)
 * calculateDelay(1, policy); // ~200ms (with jitter)
 * calculateDelay(2, policy); // ~400ms (with jitter)
 * calculateDelay(10, policy); // ~30000ms (capped at maxDelay)
 * ```
 */
export function calculateDelay(attempt: number, policy: ResolvedBackoffPolicy): number {
  // Calculate base delay with exponential backoff
  const base = Math.min(
    policy.initialDelay * Math.pow(policy.multiplier, attempt),
    policy.maxDelay
  );

  // Apply ±10% jitter to prevent thundering herd
  const jitter = base * 0.1 * (Math.random() * 2 - 1);

  return Math.floor(base + jitter);
}

/**
 * Checks if another reconnection attempt should be made.
 *
 * @param attempt - The current attempt number (0-based)
 * @param policy - The reconnect policy
 * @returns true if reconnection should be attempted
 *
 * @example
 * ```typescript
 * const policy = { type: 'exponentialBackoff', maxAttempts: 5 };
 *
 * shouldReconnect(0, policy); // true
 * shouldReconnect(4, policy); // true
 * shouldReconnect(5, policy); // false (exceeded maxAttempts)
 *
 * const neverPolicy = { type: 'never' };
 * shouldReconnect(0, neverPolicy); // false
 * ```
 */
export function shouldReconnect(attempt: number, policy: ReconnectPolicy): boolean {
  if (policy.type === "never") {
    return false;
  }

  const resolved = resolveBackoffPolicy(policy);

  // Unlimited attempts if maxAttempts is undefined
  if (resolved.maxAttempts === undefined) {
    return true;
  }

  return attempt < resolved.maxAttempts;
}

/**
 * Type guard for NeverReconnectPolicy.
 */
export function isNeverReconnect(policy: ReconnectPolicy): policy is NeverReconnectPolicy {
  return policy.type === "never";
}

/**
 * Type guard for ExponentialBackoffPolicy.
 */
export function isExponentialBackoff(policy: ReconnectPolicy): policy is ExponentialBackoffPolicy {
  return policy.type === "exponentialBackoff";
}

/**
 * Helper to create a promise that resolves after the calculated delay.
 *
 * @param attempt - The current attempt number
 * @param policy - The resolved backoff policy
 * @param signal - Optional AbortSignal for cancellation
 * @returns Promise that resolves after the delay, or rejects if aborted
 *
 * @example
 * ```typescript
 * const policy = resolveBackoffPolicy({ type: 'exponentialBackoff' });
 *
 * // Wait before reconnecting
 * await waitForReconnect(0, policy);
 * // Attempt reconnection...
 *
 * // With cancellation
 * const controller = new AbortController();
 * try {
 *   await waitForReconnect(0, policy, controller.signal);
 * } catch (e) {
 *   if (e.name === 'AbortError') {
 *     console.log('Reconnection cancelled');
 *   }
 * }
 * ```
 */
export async function waitForReconnect(
  attempt: number,
  policy: ResolvedBackoffPolicy,
  signal?: AbortSignal
): Promise<void> {
  const delay = calculateDelay(attempt, policy);

  return new Promise((resolve, reject) => {
    // Check if already aborted
    if (signal?.aborted === true) {
      reject(new DOMException("Reconnection aborted", "AbortError"));
      return;
    }

    const onAbort = (): void => {
      clearTimeout(timeoutId);
      reject(new DOMException("Reconnection aborted", "AbortError"));
    };

    const timeoutId = setTimeout(() => {
      // Clean up abort listener
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delay);

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Manages reconnection state and logic.
 *
 * @example
 * ```typescript
 * const manager = new ReconnectionManager({
 *   type: 'exponentialBackoff',
 *   maxAttempts: 5,
 * });
 *
 * while (manager.shouldRetry()) {
 *   try {
 *     await manager.wait();
 *     await connect();
 *     manager.reset(); // Success! Reset attempt counter
 *     break;
 *   } catch (error) {
 *     manager.recordFailure();
 *   }
 * }
 * ```
 */
export class ReconnectionManager {
  private readonly policy: ReconnectPolicy;
  private readonly resolved: ResolvedBackoffPolicy | undefined;
  private attempt = 0;

  /**
   * Creates a new ReconnectionManager.
   *
   * @param policy - The reconnection policy to use
   */
  constructor(policy: ReconnectPolicy) {
    this.policy = policy;
    if (policy.type === "exponentialBackoff") {
      this.resolved = resolveBackoffPolicy(policy);
    }
  }

  /**
   * Gets the current attempt number (0-based).
   */
  get currentAttempt(): number {
    return this.attempt;
  }

  /**
   * Checks if another reconnection attempt should be made.
   */
  shouldRetry(): boolean {
    return shouldReconnect(this.attempt, this.policy);
  }

  /**
   * Gets the delay for the next reconnection attempt.
   *
   * @returns Delay in milliseconds, or undefined if using 'never' policy
   */
  getNextDelay(): number | undefined {
    if (this.resolved === undefined) {
      return undefined;
    }
    return calculateDelay(this.attempt, this.resolved);
  }

  /**
   * Waits for the appropriate delay before the next attempt.
   *
   * @param signal - Optional AbortSignal for cancellation
   * @throws If policy is 'never' or if aborted
   */
  async wait(signal?: AbortSignal): Promise<void> {
    if (this.resolved === undefined) {
      throw new Error("Cannot wait with 'never' reconnect policy");
    }
    await waitForReconnect(this.attempt, this.resolved, signal);
  }

  /**
   * Records a failed reconnection attempt.
   */
  recordFailure(): void {
    this.attempt++;
  }

  /**
   * Resets the attempt counter after a successful connection.
   */
  reset(): void {
    this.attempt = 0;
  }
}
