/**
 * @module types/address
 * @description Branded Address type with Zod validation for 20-byte Ethereum addresses
 */

import { z } from "zod";
import { toAddress } from "../utils/address.js";

/**
 * Brand symbol for type-safe addresses.
 * Exported for TypeScript declaration compatibility.
 * @internal
 */
export declare const AddressBrand: unique symbol;

/**
 * A 20-byte Ethereum-compatible address.
 *
 * This is a branded type that guarantees the address is:
 * - Properly formatted (0x + 40 hex chars)
 * - Checksum-valid (EIP-55)
 *
 * @example
 * ```typescript
 * import { toAddress, isAddress } from '@podnetwork/core';
 *
 * const addr = toAddress('0x742d35cc6634c0532925a3b844bc454e4438f44e');
 * // Returns: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' (checksummed)
 *
 * if (isAddress(someValue)) {
 *   // someValue is typed as Address
 * }
 * ```
 */
export type Address = `0x${string}` & { readonly [AddressBrand]: true };

/**
 * Zod schema for validating and transforming addresses.
 *
 * Accepts any valid 0x-prefixed 40-character hex string and
 * normalizes it to EIP-55 checksum format.
 *
 * @example
 * ```typescript
 * const result = AddressSchema.safeParse('0x742d35cc6634c0532925a3b844bc454e4438f44e');
 * if (result.success) {
 *   const address: Address = result.data;
 * }
 * ```
 */
export const AddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/i, "Invalid address: must be 0x followed by 40 hex characters")
  .transform((v): Address => toAddress(v));

/**
 * Input type for functions that accept address-like values.
 * Matches ethers.js AddressLike for compatibility.
 */
export type AddressLike = string | Address;
