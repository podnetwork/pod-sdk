/**
 * Function encoding utilities
 *
 * @see FR-012, FR-015, FR-017, FR-018
 */

import type { Abi } from "abitype";
import { getInterface } from "../internal/interface-cache.js";
import { FunctionNotFoundError, AmbiguousFunctionError } from "../errors/index.js";

// External types
type Hex = `0x${string}`;

/**
 * Get all function fragments matching a name
 */
function getFunctionOverloads(abi: Abi, functionName: string): string[] {
  const iface = getInterface(abi);
  const overloads: string[] = [];

  iface.forEachFunction((fn) => {
    if (fn.name === functionName) {
      overloads.push(fn.format("sighash"));
    }
  });

  return overloads;
}

/**
 * Encode a function call into calldata.
 *
 * @param abi - Contract ABI containing function definitions
 * @param functionNameOrSignature - Function name or full signature for overloads
 * @param args - Function arguments
 * @returns ABI-encoded calldata with 4-byte selector prefix
 * @throws FunctionNotFoundError if function not in ABI
 * @throws AmbiguousFunctionError if name matches multiple overloads
 * @throws TypeBoundsError if argument exceeds Solidity type bounds
 *
 * @example
 * ```ts
 * // Simple function
 * const data = encodeFunction(ERC20_ABI, "transfer", [recipient, amount]);
 *
 * // Overloaded function - use full signature
 * const data = encodeFunction(abi, "safeTransferFrom(address,address,uint256)", [from, to, tokenId]);
 * ```
 *
 * @see FR-012, FR-017, FR-018
 */
export function encodeFunction(
  abi: Abi,
  functionNameOrSignature: string,
  args: unknown[] = []
): Hex {
  const iface = getInterface(abi);

  // First try to get the function directly
  let fragment = iface.getFunction(functionNameOrSignature);

  if (fragment === null) {
    // Check if it's an overloaded function by name only
    const overloads = getFunctionOverloads(abi, functionNameOrSignature);

    if (overloads.length > 1) {
      throw new AmbiguousFunctionError(functionNameOrSignature, overloads);
    }

    if (overloads.length === 0) {
      throw new FunctionNotFoundError(functionNameOrSignature);
    }

    // Single overload found, get it again with the full signature
    const signature = overloads[0];
    if (signature === undefined) {
      throw new FunctionNotFoundError(functionNameOrSignature);
    }
    fragment = iface.getFunction(signature);

    if (fragment === null) {
      throw new FunctionNotFoundError(functionNameOrSignature);
    }
  }

  try {
    return iface.encodeFunctionData(fragment, args) as Hex;
  } catch (error) {
    // Re-throw as our error type if it's a bounds error
    if (error instanceof Error && error.message.includes("out of bounds")) {
      throw error;
    }
    throw error;
  }
}

/**
 * Get the 4-byte selector for a named function.
 *
 * @param abi - Contract ABI containing function definitions
 * @param functionNameOrSignature - Function name or full signature
 * @returns 4-byte selector
 * @throws FunctionNotFoundError if function not in ABI
 * @throws AmbiguousFunctionError if name matches multiple overloads
 *
 * @see FR-015
 */
export function getFunctionSelector(abi: Abi, functionNameOrSignature: string): Hex {
  const iface = getInterface(abi);

  // First try to get the function directly
  let fragment = iface.getFunction(functionNameOrSignature);

  if (fragment === null) {
    // Check if it's an overloaded function by name only
    const overloads = getFunctionOverloads(abi, functionNameOrSignature);

    if (overloads.length > 1) {
      throw new AmbiguousFunctionError(functionNameOrSignature, overloads);
    }

    if (overloads.length === 0) {
      throw new FunctionNotFoundError(functionNameOrSignature);
    }

    // Single overload found, get it again with the full signature
    const signature = overloads[0];
    if (signature === undefined) {
      throw new FunctionNotFoundError(functionNameOrSignature);
    }
    fragment = iface.getFunction(signature);

    if (fragment === null) {
      throw new FunctionNotFoundError(functionNameOrSignature);
    }
  }

  return fragment.selector as Hex;
}

/**
 * Get all function selectors mapped to function names.
 *
 * @param abi - Contract ABI containing function definitions
 * @returns Map of selector to function name (first overload name if multiple)
 *
 * @see FR-015
 */
export function getFunctionSelectors(abi: Abi): Map<Hex, string> {
  const iface = getInterface(abi);
  const selectors = new Map<Hex, string>();

  iface.forEachFunction((fn) => {
    selectors.set(fn.selector as Hex, fn.name);
  });

  return selectors;
}
