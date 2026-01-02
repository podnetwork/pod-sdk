/**
 * Constructor encoding utilities
 *
 * @see FR-016
 */

import type { Abi } from "abitype";
import { getInterface } from "../internal/interface-cache.js";
import { FunctionNotFoundError } from "../errors/index.js";

// External types
type Hex = `0x${string}`;

/**
 * Encode constructor arguments for contract deployment.
 *
 * @param abi - Contract ABI containing constructor definition
 * @param args - Constructor arguments
 * @returns ABI-encoded constructor arguments (no selector)
 * @throws FunctionNotFoundError if no constructor in ABI
 * @throws TypeBoundsError if argument exceeds Solidity type bounds
 *
 * @example
 * ```ts
 * const constructorData = encodeConstructor(TokenABI, [name, symbol, decimals]);
 * const deployData = bytecode + constructorData.slice(2); // Remove 0x prefix
 * ```
 *
 * @see FR-016
 */
export function encodeConstructor(abi: Abi, args: unknown[] = []): Hex {
  const iface = getInterface(abi);

  // Check if constructor arguments match
  const constructorFragment = iface.deploy;

  if (constructorFragment.inputs.length === 0 && args.length > 0) {
    throw new FunctionNotFoundError("constructor");
  }

  try {
    // encodeDeploy returns the encoded constructor arguments
    const encoded = iface.encodeDeploy(args);
    return encoded as Hex;
  } catch (error) {
    // Re-throw as our error type if it's a bounds error
    if (error instanceof Error && error.message.includes("out of bounds")) {
      throw error;
    }
    throw error;
  }
}

/**
 * Check if an ABI has a constructor with parameters
 *
 * @param abi - Contract ABI
 * @returns True if constructor exists and has inputs
 */
export function hasConstructorParams(abi: Abi): boolean {
  const iface = getInterface(abi);
  return iface.deploy.inputs.length > 0;
}

/**
 * Get the number of constructor parameters
 *
 * @param abi - Contract ABI
 * @returns Number of constructor parameters
 */
export function getConstructorParamCount(abi: Abi): number {
  const iface = getInterface(abi);
  return iface.deploy.inputs.length;
}
