/**
 * @module utils/address
 * @description Address conversion and validation utilities
 *
 * ## Why not ethers.js?
 *
 * We implement EIP-55 checksum validation ourselves rather than importing from
 * ethers.js because:
 *
 * 1. **Bundle size**: ethers.js is ~300KB minified. We only need ~30 lines of
 *    code for address validation, which we can implement with @noble/hashes
 *    (~10KB for keccak256 only).
 *
 * 2. **Dependency reduction**: By not requiring ethers as a peer dependency,
 *    packages that only need address validation (auction, orderbook, faucet,
 *    ws, react) don't force consumers to install ethers.
 *
 * 3. **Simplicity**: EIP-55 checksum is a well-defined, stable algorithm that
 *    doesn't change. The implementation is straightforward and auditable.
 *
 * Packages that genuinely need ethers (wallet, abi, contracts) still use it
 * directly for features like Wallet, HDNodeWallet, and Interface classes.
 */

import { keccak256Utf8 } from "./crypto.js";
import type { Address, AddressLike } from "../types/address.js";

/**
 * EIP-55 mixed-case checksum encoding.
 * @see https://eips.ethereum.org/EIPS/eip-55
 */
function checksumAddress(address: string): string {
  const addr = address.toLowerCase().slice(2); // Remove 0x prefix
  const hash = keccak256Utf8(addr).slice(2); // Hash the lowercase address

  let result = "0x";
  for (let i = 0; i < 40; i++) {
    // If the i-th hash char is >= 8, uppercase the i-th address char
    // Both hash and addr are guaranteed to have 40 characters at this point
    const hashChar = hash.charAt(i);
    const addrChar = addr.charAt(i);
    result += parseInt(hashChar, 16) >= 8 ? addrChar.toUpperCase() : addrChar;
  }
  return result;
}

/**
 * Converts an address-like value to a checksummed Address.
 *
 * @param value - The address string to convert
 * @returns The checksummed Address
 * @throws Error if the value is not a valid address
 *
 * @example
 * ```typescript
 * const addr = toAddress('0x742d35cc6634c0532925a3b844bc454e4438f44e');
 * // Returns: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
 * ```
 */
export function toAddress(value: AddressLike): Address {
  if (!isAddress(value)) {
    throw new Error(`Invalid address: ${value}`);
  }
  return checksumAddress(value as string) as Address;
}

/**
 * Checks if a value is a valid Ethereum address.
 * Validates format and checksum if mixed-case.
 *
 * @param value - The value to check
 * @returns True if the value is a valid address
 *
 * @example
 * ```typescript
 * isAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e'); // true
 * isAddress('0x123');                                       // false
 * isAddress('not-an-address');                              // false
 * ```
 */
export function isAddress(value: unknown): value is Address {
  if (typeof value !== "string") return false;
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) return false;

  // If all lowercase or all uppercase, valid (checksum not required)
  const withoutPrefix = value.slice(2);
  if (
    withoutPrefix === withoutPrefix.toLowerCase() ||
    withoutPrefix === withoutPrefix.toUpperCase()
  ) {
    return true;
  }

  // Mixed case - validate checksum
  return checksumAddress(value) === value;
}

/**
 * Zero address constant.
 */
export const ZERO_ADDRESS = toAddress("0x0000000000000000000000000000000000000000");

/**
 * Checks if an address is the zero address.
 *
 * @param address - The address to check
 * @returns True if the address is the zero address
 *
 * @example
 * ```typescript
 * isZeroAddress('0x0000000000000000000000000000000000000000'); // true
 * isZeroAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e'); // false
 * ```
 */
export function isZeroAddress(address: AddressLike): boolean {
  return toAddress(address) === ZERO_ADDRESS;
}
