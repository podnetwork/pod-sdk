/**
 * Signature computation utilities
 *
 * @see FR-026 through FR-028
 */

import type { Abi, AbiFunction, AbiEvent, AbiError } from "abitype";
import { keccak256, toUtf8Bytes } from "ethers";
import { getInterface } from "../internal/interface-cache.js";
import { FunctionNotFoundError, EventNotFoundError, ErrorNotFoundError } from "../errors/index.js";

// External types
type Hex = `0x${string}`;

/**
 * Union type for signable ABI items
 */
export type SignableAbiItem = AbiFunction | AbiEvent | AbiError;

/**
 * Compute 4-byte selector from function/error signature string.
 *
 * @param signature - Canonical signature (e.g., "transfer(address,uint256)")
 * @returns 4-byte selector (keccak256 hash truncated)
 *
 * @example
 * ```ts
 * const selector = computeSelector("transfer(address,uint256)");
 * // "0xa9059cbb"
 * ```
 *
 * @see FR-026
 */
export function computeSelector(signature: string): Hex {
  const hash = keccak256(toUtf8Bytes(signature));
  return hash.slice(0, 10) as Hex;
}

/**
 * Compute 32-byte topic from event signature string.
 *
 * @param signature - Canonical signature (e.g., "Transfer(address,address,uint256)")
 * @returns 32-byte topic (full keccak256 hash)
 *
 * @example
 * ```ts
 * const topic = computeEventTopic("Transfer(address,address,uint256)");
 * // "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
 * ```
 *
 * @see FR-027
 */
export function computeEventTopic(signature: string): Hex {
  return keccak256(toUtf8Bytes(signature)) as Hex;
}

/**
 * Get canonical signature string from ABI item.
 *
 * @param item - ABI item (function, event, or error)
 * @returns Canonical signature string
 *
 * @example
 * ```ts
 * const sig = getSignature(transferFunction);
 * // "transfer(address,uint256)"
 * ```
 *
 * @see FR-028
 */
export function getSignature(item: SignableAbiItem): string {
  const name = item.name;
  const inputs = item.inputs;
  const types = inputs.map((input) => input.type).join(",");
  return `${name}(${types})`;
}

/**
 * Get canonical signature for a named function.
 *
 * @param abi - Contract ABI
 * @param name - Function name
 * @returns Canonical signature string
 * @throws FunctionNotFoundError if not found
 *
 * @see FR-028
 */
export function getFunctionSignature(abi: Abi, name: string): string {
  const iface = getInterface(abi);
  const fn = iface.getFunction(name);

  if (fn === null) {
    throw new FunctionNotFoundError(name);
  }

  return fn.format("sighash");
}

/**
 * Get canonical signature for a named event.
 *
 * @param abi - Contract ABI
 * @param name - Event name
 * @returns Canonical signature string
 * @throws EventNotFoundError if not found
 *
 * @see FR-028
 */
export function getEventSignature(abi: Abi, name: string): string {
  const iface = getInterface(abi);
  const event = iface.getEvent(name);

  if (event === null) {
    throw new EventNotFoundError(`0x${"0".repeat(64)}`);
  }

  return event.format("sighash");
}

/**
 * Get canonical signature for a named error.
 *
 * @param abi - Contract ABI
 * @param name - Error name
 * @returns Canonical signature string
 * @throws ErrorNotFoundError if not found
 *
 * @see FR-028
 */
export function getErrorSignature(abi: Abi, name: string): string {
  const iface = getInterface(abi);
  const error = iface.getError(name);

  if (error === null) {
    throw new ErrorNotFoundError(`0x${"0".repeat(8)}`);
  }

  return error.format("sighash");
}
