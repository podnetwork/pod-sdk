/**
 * @module utils/time
 * @description Time utilities for working with Pod network timestamps
 *
 * Pod uses microsecond timestamps for precision timing, particularly for
 * Past Perfection Time (PPT) and auction deadlines.
 */

/**
 * Microseconds per millisecond.
 */
const MICROS_PER_MILLI = 1000n;

/**
 * Microseconds per second.
 */
const MICROS_PER_SECOND = 1_000_000n;

/**
 * Gets the current time in microseconds since Unix epoch.
 *
 * This is the local time, not the network's Past Perfection Time (PPT).
 * Use this for creating deadline timestamps relative to now.
 *
 * @returns Current time in microseconds
 *
 * @example
 * ```typescript
 * // Wait for 100ms from now
 * const deadline = nowMicros() + millisToMicros(100);
 * await client.rpc.waitPastPerfectTime(deadline);
 * ```
 */
export function nowMicros(): bigint {
  return BigInt(Date.now()) * MICROS_PER_MILLI;
}

/**
 * Converts seconds to microseconds.
 *
 * @param seconds - Time in seconds
 * @returns Time in microseconds
 *
 * @example
 * ```typescript
 * const fiveSeconds = secondsToMicros(5);
 * // => 5_000_000n
 * ```
 */
export function secondsToMicros(seconds: number): bigint {
  return BigInt(seconds) * MICROS_PER_SECOND;
}

/**
 * Converts milliseconds to microseconds.
 *
 * @param millis - Time in milliseconds
 * @returns Time in microseconds
 *
 * @example
 * ```typescript
 * const halfSecond = millisToMicros(500);
 * // => 500_000n
 * ```
 */
export function millisToMicros(millis: number): bigint {
  return BigInt(millis) * MICROS_PER_MILLI;
}

/**
 * Converts microseconds to milliseconds (lossy - truncates).
 *
 * @param micros - Time in microseconds
 * @returns Time in milliseconds
 *
 * @example
 * ```typescript
 * const ms = microsToMillis(1_500_000n);
 * // => 1500n
 * ```
 */
export function microsToMillis(micros: bigint): bigint {
  return micros / MICROS_PER_MILLI;
}

/**
 * Converts microseconds to seconds (lossy - truncates).
 *
 * @param micros - Time in microseconds
 * @returns Time in seconds
 *
 * @example
 * ```typescript
 * const secs = microsToSeconds(5_500_000n);
 * // => 5n
 * ```
 */
export function microsToSeconds(micros: bigint): bigint {
  return micros / MICROS_PER_SECOND;
}
