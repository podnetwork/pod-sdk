/**
 * @module utils/crypto
 * @description Cryptographic utilities using @noble/hashes
 * @internal This module is not exported publicly
 */

import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex } from "@noble/hashes/utils.js";

/**
 * Convert hex string to Uint8Array.
 * Handles 0x prefix automatically.
 */
function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(h.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Compute keccak256 hash of hex data.
 * Matches ethers.keccak256() behavior for hex strings.
 *
 * @param data - Hex string (with or without 0x prefix)
 * @returns 0x-prefixed 64-char hex hash
 */
export function keccak256(data: string): string {
  const bytes = hexToBytes(data);
  return "0x" + bytesToHex(keccak_256(bytes));
}

/**
 * Compute keccak256 hash of UTF-8 string.
 * Used for EIP-55 checksum calculation.
 *
 * @param text - UTF-8 string (NOT hex)
 * @returns 0x-prefixed 64-char hex hash
 */
export function keccak256Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return "0x" + bytesToHex(keccak_256(bytes));
}
