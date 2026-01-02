/**
 * Calldata decoding utilities
 *
 * @see FR-013, FR-014
 */

import type { Abi } from "abitype";
import { getInterface } from "../internal/interface-cache.js";
import { FunctionNotFoundError } from "../errors/index.js";

// External types
type Hex = `0x${string}`;

/**
 * Decoded function calldata
 */
export interface DecodedFunction {
  /** Function name from ABI */
  functionName: string;
  /** Named arguments (if parameter names exist in ABI) */
  args: Record<string, unknown>;
  /** Positional arguments */
  argsList: readonly unknown[];
  /** 4-byte function selector */
  selector: Hex;
}

/**
 * Decode calldata back into function name and arguments.
 *
 * @param abi - Contract ABI containing function definitions
 * @param data - Calldata to decode
 * @returns Decoded function or null if selector not found in ABI
 *
 * @see FR-013
 */
export function decodeCalldata(abi: Abi, data: Hex): DecodedFunction | null {
  if (data.length < 10) {
    return null;
  }

  const iface = getInterface(abi);

  try {
    const parsed = iface.parseTransaction({ data });

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
      functionName: parsed.name,
      args,
      argsList,
      selector: data.slice(0, 10) as Hex,
    };
  } catch {
    return null;
  }
}

/**
 * Decode function calldata (alias for decodeCalldata)
 *
 * @param abi - Contract ABI containing function definitions
 * @param data - Calldata to decode
 * @returns Decoded function or null if selector not found in ABI
 *
 * @see FR-013
 */
export function decodeFunction(abi: Abi, data: Hex): DecodedFunction | null {
  return decodeCalldata(abi, data);
}

/**
 * Decode the return value of a function call.
 *
 * @param abi - Contract ABI containing function definitions
 * @param functionName - Name of the function (or full signature for overloads)
 * @param data - Return data to decode
 * @returns Decoded return value
 * @throws FunctionNotFoundError if function not in ABI
 *
 * @see FR-014
 */
export function decodeReturnValue(abi: Abi, functionName: string, data: Hex): unknown {
  const iface = getInterface(abi);
  const fragment = iface.getFunction(functionName);

  if (fragment === null) {
    throw new FunctionNotFoundError(functionName);
  }

  try {
    const result = iface.decodeFunctionResult(fragment, data);

    // If single return value, return it directly
    if (fragment.outputs.length === 1) {
      return result[0];
    }

    // For multiple return values, build named object if possible
    const namedResult: Record<string, unknown> = {};
    const hasNames = fragment.outputs.every((o) => o.name !== "");

    if (hasNames) {
      for (let i = 0; i < fragment.outputs.length; i++) {
        const output = fragment.outputs[i];
        if (output === undefined) continue;
        namedResult[output.name] = result[i];
      }
      return namedResult;
    }

    return result;
  } catch {
    throw new FunctionNotFoundError(functionName);
  }
}

/**
 * Decode function result (alias for decodeReturnValue)
 *
 * @param abi - Contract ABI containing function definitions
 * @param functionName - Name of the function (or full signature for overloads)
 * @param data - Return data to decode
 * @returns Decoded return value
 *
 * @see FR-014
 */
export function decodeFunctionResult(abi: Abi, functionName: string, data: Hex): unknown {
  return decodeReturnValue(abi, functionName, data);
}
