/**
 * @module types/bigint
 * @description BigInt parsing and conversion utilities
 */

import { z } from "zod";

/**
 * Zod schema for parsing bigint from various input formats.
 *
 * Accepts:
 * - Native bigint values
 * - Hex strings (0x prefixed)
 * - Decimal strings
 * - Numbers (converted to bigint)
 *
 * @example
 * ```typescript
 * BigIntSchema.parse(100n);       // 100n
 * BigIntSchema.parse('0x64');     // 100n
 * BigIntSchema.parse('100');      // 100n
 * BigIntSchema.parse(100);        // 100n
 * ```
 */
export const BigIntSchema = z
  .union([
    z.bigint(),
    z
      .string()
      .refine(
        (v) => /^0x[a-fA-F0-9]+$/.test(v) || /^\d+$/.test(v),
        "Must be a hex string (0x...) or decimal string"
      ),
    z.number().int(),
  ])
  .transform((v): bigint => {
    if (typeof v === "bigint") return v;
    if (typeof v === "number") return BigInt(v);
    // String - hex or decimal
    if (v.startsWith("0x")) {
      return BigInt(v);
    }
    return BigInt(v);
  });

/**
 * Non-negative bigint schema.
 */
export const BigIntNonNegativeSchema = BigIntSchema.refine(
  (v) => v >= 0n,
  "Value must be non-negative"
);

/**
 * Positive bigint schema.
 */
export const BigIntPositiveSchema = BigIntSchema.refine((v) => v > 0n, "Value must be positive");

/**
 * Safely converts a bigint to a JavaScript number.
 *
 * Returns undefined if the value exceeds Number.MAX_SAFE_INTEGER.
 *
 * @param value - The bigint to convert
 * @returns The number value, or undefined if overflow
 *
 * @example
 * ```typescript
 * safeToNumber(100n);                         // 100
 * safeToNumber(BigInt(Number.MAX_SAFE_INTEGER) + 1n); // undefined
 * ```
 */
export function safeToNumber(value: bigint): number | undefined {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    return undefined;
  }
  if (value < BigInt(Number.MIN_SAFE_INTEGER)) {
    return undefined;
  }
  return Number(value);
}

/**
 * Converts a bigint to a JavaScript number.
 *
 * @param value - The bigint to convert
 * @returns The number value
 * @throws Error if the value exceeds safe integer range
 *
 * @example
 * ```typescript
 * toNumber(100n);  // 100
 * toNumber(BigInt(Number.MAX_SAFE_INTEGER) + 1n); // throws
 * ```
 */
export function toNumber(value: bigint): number {
  const result = safeToNumber(value);
  if (result === undefined) {
    throw new Error(`BigInt value ${String(value)} exceeds safe integer range`);
  }
  return result;
}

/**
 * Converts a value to hex string for JSON-RPC.
 *
 * @param value - The bigint value
 * @returns Hex string with 0x prefix
 *
 * @example
 * ```typescript
 * toHex(100n);  // '0x64'
 * toHex(0n);    // '0x0'
 * ```
 */
export function toHex(value: bigint): `0x${string}` {
  return `0x${value.toString(16)}`;
}

/**
 * Parses a hex string or decimal string to bigint.
 *
 * @param value - Hex string (0x...) or decimal string
 * @returns The bigint value
 *
 * @example
 * ```typescript
 * parseBigInt('0x64');  // 100n
 * parseBigInt('100');   // 100n
 * ```
 */
export function parseBigInt(value: string): bigint {
  if (value.startsWith("0x")) {
    return BigInt(value);
  }
  return BigInt(value);
}
