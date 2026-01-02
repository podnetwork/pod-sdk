/**
 * Internal Interface caching utility
 *
 * Caches ethers.js Interface instances to avoid repeated parsing of the same ABI.
 * Uses WeakMap so cached interfaces are garbage collected when the ABI is no longer referenced.
 */

import type { Abi } from "abitype";
import { Interface, type InterfaceAbi } from "ethers";

/**
 * WeakMap cache for Interface instances keyed by ABI reference
 *
 * Using WeakMap ensures that:
 * 1. Interfaces are only created once per unique ABI object
 * 2. Cached interfaces are automatically garbage collected when ABI is no longer referenced
 * 3. Memory usage is bounded by the number of active ABI references
 */
const interfaceCache = new WeakMap<object, Interface>();

/**
 * Get or create an ethers.js Interface for the given ABI
 *
 * @param abi - The ABI to create an Interface for
 * @returns Cached or newly created Interface instance
 *
 * @example
 * ```ts
 * const iface = getInterface(ERC20_ABI);
 * const decoded = iface.parseLog(log);
 * ```
 */
export function getInterface(abi: Abi): Interface {
  // Use the ABI array as the cache key
  let iface = interfaceCache.get(abi);

  if (iface === undefined) {
    // Cast to InterfaceAbi since abitype Abi is compatible
    iface = new Interface(abi as InterfaceAbi);
    interfaceCache.set(abi, iface);
  }

  return iface;
}

/**
 * Clear a specific Interface from the cache
 *
 * Useful for testing or when an ABI needs to be re-parsed.
 *
 * @param abi - The ABI whose Interface should be removed from cache
 * @returns true if an Interface was removed, false otherwise
 */
export function clearCachedInterface(abi: Abi): boolean {
  return interfaceCache.delete(abi);
}
