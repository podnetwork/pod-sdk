/**
 * @module types/bytes
 * @description Bytes type with Zod validation for variable-length hex-encoded data
 */

import { z } from "zod";

/**
 * Variable-length hex-encoded byte string.
 *
 * Must be 0x-prefixed with an even number of hex characters
 * (complete bytes). Can be empty (just "0x").
 *
 * @example
 * ```typescript
 * const data: Bytes = '0x1234abcd';
 * const empty: Bytes = '0x';
 * ```
 */
export type Bytes = `0x${string}`;

/**
 * Zod schema for validating and transforming byte strings.
 *
 * Validates that the input is a 0x-prefixed hex string with
 * an even number of characters (complete bytes) and normalizes
 * to lowercase.
 *
 * @example
 * ```typescript
 * const result = BytesSchema.safeParse('0xDEADBEEF');
 * if (result.success) {
 *   const bytes: Bytes = result.data; // '0xdeadbeef'
 * }
 * ```
 */
export const BytesSchema = z
  .string()
  .regex(
    /^0x([a-fA-F0-9]{2})*$/i,
    "Invalid bytes: must be 0x followed by an even number of hex characters"
  )
  .transform((v): Bytes => v.toLowerCase() as Bytes);

/**
 * Input type for functions that accept byte-like values.
 * Matches ethers.js BytesLike for compatibility.
 */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- Bytes is kept for documentation/type clarity
export type BytesLike = string | Uint8Array | Bytes;
