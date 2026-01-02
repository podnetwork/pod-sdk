/**
 * Error decoding utilities
 *
 * @see FR-009 through FR-011
 */

import type { Abi } from "abitype";
import { getInterface } from "../internal/interface-cache.js";
import { ErrorNotFoundError } from "../errors/index.js";

// External types
type Hex = `0x${string}`;

/**
 * Decoded revert error
 */
export interface DecodedError {
  /** Error name from ABI */
  errorName: string;
  /** Named arguments (if parameter names exist in ABI) */
  args: Record<string, unknown>;
  /** Positional arguments */
  argsList: readonly unknown[];
  /** 4-byte error selector */
  selector: Hex;
  /** Original revert data (for debugging) */
  data: Hex;
}

/**
 * Decode revert data into error name and arguments.
 *
 * @param abi - Contract ABI containing error definitions
 * @param data - Revert data from failed transaction
 * @returns Decoded error or null if selector not found in ABI
 *
 * @example
 * ```ts
 * const decoded = decodeError(contractAbi, revertData);
 * if (decoded) {
 *   console.log(decoded.errorName); // "InsufficientBalance"
 *   console.log(decoded.args.available); // 100n
 * }
 * ```
 *
 * @see FR-009, FR-010
 */
export function decodeError(abi: Abi, data: Hex): DecodedError | null {
  if (data.length < 10) {
    return null;
  }

  const iface = getInterface(abi);

  try {
    const parsed = iface.parseError(data);

    if (parsed === null) {
      return null;
    }

    // Build args object from fragment inputs
    const args: Record<string, unknown> = {};
    const argsList: unknown[] = [];

    for (let i = 0; i < parsed.fragment.inputs.length; i++) {
      const input = parsed.fragment.inputs[i];
      if (input === undefined) continue;
      const value: unknown = parsed.args[i];
      argsList.push(value);
      if (input.name !== "") {
        args[input.name] = value;
      }
    }

    return {
      errorName: parsed.name,
      args,
      argsList,
      selector: data.slice(0, 10) as Hex,
      data,
    };
  } catch {
    return null;
  }
}

/**
 * Check if revert data matches a specific error by name.
 *
 * @param abi - Contract ABI containing error definitions
 * @param data - Revert data from failed transaction
 * @param errorName - Name of the error to check
 * @returns True if data matches the named error
 *
 * @see FR-009
 */
export function isError(abi: Abi, data: Hex, errorName: string): boolean {
  const decoded = decodeError(abi, data);
  return decoded?.errorName === errorName;
}

/**
 * Get the 4-byte selector for a named error.
 *
 * @param abi - Contract ABI containing error definitions
 * @param errorName - Name of the error
 * @returns 4-byte selector
 * @throws ErrorNotFoundError if error not in ABI
 *
 * @see FR-011
 */
export function getErrorSelector(abi: Abi, errorName: string): Hex {
  const iface = getInterface(abi);
  const error = iface.getError(errorName);

  if (error === null) {
    throw new ErrorNotFoundError(`0x${"0".repeat(8)}`);
  }

  return error.selector as Hex;
}

/**
 * Get all error selectors mapped to error names.
 *
 * @param abi - Contract ABI containing error definitions
 * @returns Map of selector to error name
 *
 * @see FR-011
 */
export function getErrorSelectors(abi: Abi): Map<Hex, string> {
  const iface = getInterface(abi);
  const selectors = new Map<Hex, string>();

  iface.forEachError((error) => {
    selectors.set(error.selector as Hex, error.name);
  });

  return selectors;
}
