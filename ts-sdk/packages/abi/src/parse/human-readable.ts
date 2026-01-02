/**
 * Human-readable ABI parsing utilities
 *
 * @see FR-022 through FR-025
 */

import type { Abi, AbiFunction, AbiEvent, AbiError, AbiConstructor } from "abitype";
import { Interface, type InterfaceAbi } from "ethers";
import { ParseError } from "../errors/index.js";

/**
 * Any ABI item that can be parsed from human-readable format
 */
export type AbiItem = AbiFunction | AbiEvent | AbiError | AbiConstructor;

/**
 * Parse a single human-readable signature.
 *
 * @param signature - Human-readable signature string
 * @returns Parsed ABI item
 * @throws ParseError if signature is malformed (with position info)
 *
 * @example
 * ```ts
 * const fn = parseAbiItem("function transfer(address to, uint256 amount) returns (bool)");
 * // { type: "function", name: "transfer", inputs: [...], outputs: [...] }
 * ```
 *
 * @see FR-022, FR-024, FR-025
 */
export function parseAbiItem(signature: string): AbiItem {
  try {
    // Use ethers.js Interface to parse human-readable format
    const iface = new Interface([signature]);

    // Get the first (and only) fragment
    const fragment = iface.fragments[0];

    if (fragment === undefined) {
      throw new ParseError("Failed to parse signature", 0, signature);
    }

    // Convert ethers Fragment to standard ABI format
    const json: unknown = JSON.parse(fragment.format("json"));

    return json as AbiItem;
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }

    // Try to extract position from ethers error message
    const message = error instanceof Error ? error.message : "Unknown parse error";
    const positionMatch = /position (\d+)/.exec(message);
    const positionStr = positionMatch?.[1];
    const position =
      positionStr !== undefined && positionStr !== "" ? parseInt(positionStr, 10) : 0;

    throw new ParseError(message, position, signature);
  }
}

/**
 * Parse an array of human-readable signatures into a standard ABI array.
 *
 * @param signatures - Array of human-readable signature strings
 * @returns Standard ABI array
 * @throws ParseError if any signature is malformed
 *
 * @example
 * ```ts
 * const abi = parseAbi([
 *   "function transfer(address to, uint256 amount) returns (bool)",
 *   "function balanceOf(address owner) view returns (uint256)",
 *   "event Transfer(address indexed from, address indexed to, uint256 value)",
 *   "error InsufficientBalance(uint256 available, uint256 required)",
 * ]);
 * ```
 *
 * @see FR-022, FR-024
 */
export function parseAbi(signatures: string[]): Abi {
  try {
    // Use ethers.js Interface to parse all signatures at once
    const iface = new Interface(signatures);

    // Convert all fragments to standard ABI format
    const abi: AbiItem[] = [];

    for (const fragment of iface.fragments) {
      const json: unknown = JSON.parse(fragment.format("json"));
      abi.push(json as AbiItem);
    }

    return abi as Abi;
  } catch (error) {
    // If batch parsing fails, try one by one to find the problematic signature
    for (let i = 0; i < signatures.length; i++) {
      const sig = signatures[i];
      if (sig === undefined) continue;
      try {
        parseAbiItem(sig);
      } catch (itemError) {
        if (itemError instanceof ParseError) {
          throw itemError;
        }
        const message = itemError instanceof Error ? itemError.message : "Unknown parse error";
        throw new ParseError(`Error in signature ${String(i + 1)}: ${message}`, 0, sig);
      }
    }

    // If individual parsing worked but batch didn't, throw generic error
    const message = error instanceof Error ? error.message : "Unknown parse error";
    throw new ParseError(message, 0, signatures.join(", "));
  }
}

/**
 * Format an ABI item back to human-readable string.
 *
 * @param item - ABI item to format
 * @returns Human-readable signature string
 *
 * @example
 * ```ts
 * const sig = formatAbiItem({
 *   type: "function",
 *   name: "transfer",
 *   inputs: [
 *     { name: "to", type: "address" },
 *     { name: "amount", type: "uint256" },
 *   ],
 *   outputs: [{ type: "bool" }],
 *   stateMutability: "nonpayable",
 * });
 * // "function transfer(address to, uint256 amount) returns (bool)"
 * ```
 *
 * @see FR-023
 */
export function formatAbiItem(item: AbiItem): string {
  // Create an Interface with just this item (cast to InterfaceAbi for compatibility)
  const iface = new Interface([item] as unknown as InterfaceAbi);

  // Get the fragment and format it
  const fragment = iface.fragments[0];

  if (fragment === undefined) {
    return "";
  }

  return fragment.format("sighash");
}

/**
 * Format entire ABI to human-readable strings.
 *
 * @param abi - Standard ABI array
 * @returns Array of human-readable signature strings
 *
 * @see FR-023
 */
export function formatAbi(abi: Abi): string[] {
  const iface = new Interface(abi as unknown as InterfaceAbi);

  return iface.fragments.map((fragment) => fragment.format("sighash"));
}
