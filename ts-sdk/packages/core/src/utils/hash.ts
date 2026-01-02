/**
 * @module utils/hash
 * @description Hash conversion and validation utilities
 */

import type { Hash, HashLike } from "../types/hash.js";

/**
 * Regular expression for validating 32-byte hashes.
 */
const HASH_REGEX = /^0x[a-fA-F0-9]{64}$/i;

/**
 * Converts a hash-like value to a normalized Hash.
 *
 * @param value - The hash string to convert
 * @returns The normalized (lowercase) Hash
 * @throws Error if the value is not a valid 32-byte hash
 *
 * @example
 * ```typescript
 * const hash = toHash('0xABC123...');
 * // Returns lowercase normalized hash
 * ```
 */
export function toHash(value: HashLike): Hash {
  if (!isHash(value)) {
    throw new Error(`Invalid hash: ${value}`);
  }
  return value.toLowerCase() as Hash;
}

/**
 * Checks if a value is a valid 32-byte hash.
 *
 * @param value - The value to check
 * @returns True if the value is a valid hash
 *
 * @example
 * ```typescript
 * isHash('0x' + 'a'.repeat(64)); // true
 * isHash('0x123');               // false
 * isHash('not-a-hash');          // false
 * ```
 */
export function isHash(value: unknown): value is Hash {
  if (typeof value !== "string") {
    return false;
  }
  return HASH_REGEX.test(value);
}

/**
 * Zero hash constant.
 */
export const ZERO_HASH = toHash("0x" + "0".repeat(64));

/**
 * Checks if a hash is the zero hash.
 *
 * @param hash - The hash to check
 * @returns True if the hash is the zero hash
 *
 * @example
 * ```typescript
 * isZeroHash('0x' + '0'.repeat(64)); // true
 * isZeroHash('0x' + 'a'.repeat(64)); // false
 * ```
 */
export function isZeroHash(hash: HashLike): boolean {
  return toHash(hash) === ZERO_HASH;
}

/**
 * Shortens a hash for display purposes.
 *
 * @param hash - The hash to shorten
 * @param chars - Number of characters to show on each side (default: 4)
 * @returns Shortened hash string (e.g., "0xabcd...1234")
 *
 * @example
 * ```typescript
 * shortenHash('0x' + 'a'.repeat(64)); // '0xaaaa...aaaa'
 * shortenHash('0x' + 'a'.repeat(64), 6); // '0xaaaaaa...aaaaaa'
 * ```
 */
export function shortenHash(hash: HashLike, chars = 4): string {
  const normalized = toHash(hash);
  if (chars * 2 + 5 >= normalized.length) {
    return normalized; // Don't shorten if it would be longer
  }
  return `${normalized.slice(0, chars + 2)}...${normalized.slice(-chars)}`;
}
