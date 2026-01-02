/**
 * ABI filtering utilities
 *
 * @see FR-029 through FR-031
 */

import type { Abi, AbiFunction, AbiEvent, AbiError, AbiStateMutability } from "abitype";

/**
 * Literal type for ABI item kinds
 */
export type AbiItemType = "function" | "event" | "error" | "constructor" | "fallback" | "receive";

/**
 * Union type for filterable ABI items
 */
export type AbiItem = AbiFunction | AbiEvent | AbiError;

/**
 * Options for filtering ABI items
 */
export interface FilterOptions {
  /** Filter to specific item names */
  names?: string[];
}

/**
 * Extended options for filtering functions
 */
export interface FunctionFilterOptions extends FilterOptions {
  /** Filter by state mutability */
  stateMutability?: AbiStateMutability[];
}

/**
 * Extract ABI items by type with optional filtering.
 *
 * @param abi - Contract ABI
 * @param type - Type of items to extract
 * @param options - Optional filtering options
 * @returns Filtered ABI array
 *
 * @see FR-029
 */
export function filterAbi(abi: Abi, type: AbiItemType, options: FilterOptions = {}): Abi {
  const { names } = options;

  return abi.filter((item) => {
    if (item.type !== type) {
      return false;
    }

    if (names !== undefined && "name" in item && item.name !== "") {
      return names.includes(item.name);
    }

    return true;
  }) as Abi;
}

/**
 * Get all functions, optionally filtered by mutability.
 *
 * @param abi - Contract ABI
 * @param options - Optional filtering options
 * @returns Array of function definitions
 *
 * @see FR-029, FR-030
 */
export function getAbiFunctions(abi: Abi, options: FunctionFilterOptions = {}): AbiFunction[] {
  const { names, stateMutability } = options;

  return abi.filter((item): item is AbiFunction => {
    if (item.type !== "function") {
      return false;
    }

    if (names !== undefined && !names.includes(item.name)) {
      return false;
    }

    if (stateMutability !== undefined && !stateMutability.includes(item.stateMutability)) {
      return false;
    }

    return true;
  });
}

/**
 * Get all events from an ABI.
 *
 * @param abi - Contract ABI
 * @returns Array of event definitions
 *
 * @see FR-029
 */
export function getAbiEvents(abi: Abi): AbiEvent[] {
  return abi.filter((item): item is AbiEvent => item.type === "event");
}

/**
 * Get all errors from an ABI.
 *
 * @param abi - Contract ABI
 * @returns Array of error definitions
 *
 * @see FR-029
 */
export function getAbiErrors(abi: Abi): AbiError[] {
  return abi.filter((item): item is AbiError => item.type === "error");
}

/**
 * Get a specific item by type and name.
 *
 * @param abi - Contract ABI
 * @param type - Type of item
 * @param name - Item name
 * @returns Item if found, undefined otherwise
 *
 * @see FR-031
 */
export function getAbiItem(abi: Abi, type: AbiItemType, name: string): AbiItem | undefined {
  return abi.find((item) => item.type === type && "name" in item && item.name === name) as
    | AbiItem
    | undefined;
}

/**
 * Check if ABI contains a function.
 *
 * @param abi - Contract ABI
 * @param name - Function name
 * @returns True if function exists
 *
 * @see FR-031
 */
export function hasFunction(abi: Abi, name: string): boolean {
  return abi.some((item) => item.type === "function" && item.name === name);
}

/**
 * Check if ABI contains an event.
 *
 * @param abi - Contract ABI
 * @param name - Event name
 * @returns True if event exists
 *
 * @see FR-031
 */
export function hasEvent(abi: Abi, name: string): boolean {
  return abi.some((item) => item.type === "event" && item.name === name);
}

/**
 * Check if ABI contains an error.
 *
 * @param abi - Contract ABI
 * @param name - Error name
 * @returns True if error exists
 *
 * @see FR-031
 */
export function hasError(abi: Abi, name: string): boolean {
  return abi.some((item) => item.type === "error" && item.name === name);
}
