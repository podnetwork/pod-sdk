/**
 * @module utils
 * @description Browser-compatible utility functions without Node.js dependencies
 */

/**
 * Convert a Uint8Array to a hex string without Node.js Buffer.
 *
 * This is a browser-compatible alternative to `Buffer.from(bytes).toString('hex')`.
 *
 * @param bytes - The bytes to convert
 * @returns Hex string with 0x prefix, lowercase
 *
 * @example
 * ```typescript
 * const bytes = new Uint8Array([0xab, 0xcd, 0xef]);
 * const hex = bytesToHex(bytes);
 * // hex = '0xabcdef'
 * ```
 */
export function bytesToHex(bytes: Uint8Array): `0x${string}` {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `0x${hex}`;
}
