/**
 * @module types/hash
 * @description Branded Hash type with Zod validation for 32-byte hashes
 */

import { z } from "zod";

/**
 * Brand symbol for type-safe hashes.
 * Exported for TypeScript declaration compatibility.
 * @internal
 */
export declare const HashBrand: unique symbol;

/**
 * A 32-byte hash (transaction hash, block hash, orderbook ID, etc.).
 *
 * This is a branded type that guarantees the hash is:
 * - Properly formatted (0x + 64 hex chars)
 * - Normalized to lowercase
 *
 * @example
 * ```typescript
 * import { toHash, isHash } from '@podnetwork/core';
 *
 * const hash = toHash('0xABC123...');
 * // Returns lowercase normalized hash
 *
 * if (isHash(someValue)) {
 *   // someValue is typed as Hash
 * }
 * ```
 */
export type Hash = `0x${string}` & { readonly [HashBrand]: true };

/**
 * Zod schema for validating and transforming 32-byte hashes.
 *
 * Accepts any valid 0x-prefixed 64-character hex string and
 * normalizes it to lowercase.
 *
 * @example
 * ```typescript
 * const result = HashSchema.safeParse('0xABC123...');
 * if (result.success) {
 *   const hash: Hash = result.data;
 * }
 * ```
 */
export const HashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/i, "Invalid hash: must be 0x followed by 64 hex characters")
  .transform((v): Hash => v.toLowerCase() as Hash);

/**
 * Input type for functions that accept hash-like values.
 */
export type HashLike = string | Hash;
