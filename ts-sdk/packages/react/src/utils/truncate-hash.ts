/**
 * @module utils/truncate-hash
 * @description Utility for truncating hashes and addresses for display
 */

import type { TruncateMode } from "../types.js";

/**
 * Options for truncateHash utility.
 * @category Utilities
 */
export interface TruncateHashOptions {
  /** Truncation mode. Default: 'middle' */
  readonly mode?: TruncateMode;
  /** Characters to show at start/end. Default: 6 */
  readonly chars?: number;
}

/**
 * Truncates a hash or address for display.
 *
 * @param hash - The hash or address to truncate
 * @param options - Truncation options
 * @returns Truncated string
 *
 * @example
 * ```typescript
 * truncateHash('0x1234567890abcdef1234567890abcdef12345678');
 * // => '0x1234...5678' (mode: 'middle', chars: 6)
 *
 * truncateHash('0x1234567890abcdef', { mode: 'end', chars: 8 });
 * // => '0x12345678...'
 *
 * truncateHash('0x1234567890abcdef', { mode: 'start', chars: 8 });
 * // => '...90abcdef'
 *
 * truncateHash('0x1234567890abcdef', { mode: 'none' });
 * // => '0x1234567890abcdef' (no truncation)
 * ```
 */
export function truncateHash(hash: string, options: TruncateHashOptions = {}): string {
  const { mode = "middle", chars = 6 } = options;

  // Handle invalid input
  if (typeof hash !== "string" || hash.length === 0) {
    return "";
  }

  // No truncation
  if (mode === "none") {
    return hash;
  }

  // Normalize hash (ensure lowercase for consistency)
  const normalizedHash = hash.toLowerCase();

  // Check if hash is too short to truncate
  const minLength = mode === "middle" ? chars * 2 + 3 : chars + 3;
  if (normalizedHash.length <= minLength) {
    return normalizedHash;
  }

  // Handle 0x prefix
  const has0xPrefix = normalizedHash.startsWith("0x");
  const hashWithoutPrefix = has0xPrefix ? normalizedHash.slice(2) : normalizedHash;

  switch (mode) {
    case "start": {
      // Show end chars only: ...abcdef
      const end = hashWithoutPrefix.slice(-chars);
      return `...${end}`;
    }

    case "end": {
      // Show start chars only: 0x1234...
      const prefix = has0xPrefix ? "0x" : "";
      const start = hashWithoutPrefix.slice(0, chars);
      return `${prefix}${start}...`;
    }

    case "middle":
    default: {
      // Show start and end chars: 0x1234...abcd
      const prefix = has0xPrefix ? "0x" : "";
      const start = hashWithoutPrefix.slice(0, chars);
      const end = hashWithoutPrefix.slice(-chars);
      return `${prefix}${start}...${end}`;
    }
  }
}

/**
 * Check if a string is a valid hex hash (with or without 0x prefix).
 *
 * @param value - The value to check
 * @returns true if valid hex hash
 */
export function isValidHash(value: string): boolean {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  const hex = value.startsWith("0x") ? value.slice(2) : value;
  return /^[0-9a-fA-F]+$/.test(hex) && hex.length > 0;
}

/**
 * Check if a string is a valid Ethereum address (40 hex chars with 0x prefix).
 *
 * @param value - The value to check
 * @returns true if valid address
 */
export function isValidAddress(value: string): boolean {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

/**
 * Check if a string is a valid transaction hash (64 hex chars with 0x prefix).
 *
 * @param value - The value to check
 * @returns true if valid transaction hash
 */
export function isValidTxHash(value: string): boolean {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  return /^0x[0-9a-fA-F]{64}$/.test(value);
}
