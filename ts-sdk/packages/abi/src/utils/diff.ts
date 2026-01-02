/**
 * ABI comparison utilities
 *
 * @see FR-032, FR-033
 */

import type { Abi } from "abitype";
import { getSignature, type SignableAbiItem } from "./signature.js";
import type { AbiItemType, AbiItem } from "./filter.js";

/**
 * Change details for a modified ABI item
 */
export interface AbiItemChange {
  /** Item name */
  name: string;
  /** Item type (function, event, error) */
  type: AbiItemType;
  /** Original item from old ABI */
  old: AbiItem;
  /** Modified item from new ABI */
  new: AbiItem;
  /** True if change breaks compatibility */
  breaking: boolean;
}

/**
 * Result of comparing two ABIs
 */
export interface AbiDiff {
  /** Items in new ABI but not old */
  added: readonly AbiItem[];
  /** Items in old ABI but not new */
  removed: readonly AbiItem[];
  /** Items with same name but different signature */
  changed: readonly AbiItemChange[];
  /** Identical items in both ABIs */
  unchanged: readonly AbiItem[];
}

/**
 * Get a unique key for an ABI item for comparison
 */
function getItemKey(item: AbiItem): string {
  return getSignature(item as SignableAbiItem);
}

/**
 * Check if an item type supports breaking change detection
 */
function isSignableItem(item: unknown): item is SignableAbiItem {
  const i = item as { type?: string; name?: string };
  return (
    (i.type === "function" || i.type === "event" || i.type === "error") &&
    typeof i.name === "string"
  );
}

/**
 * Determine if a change is breaking
 *
 * Breaking changes include:
 * - Changing function input types
 * - Changing function output types
 * - Changing event indexed parameters
 * - Changing error parameter types
 */
function isBreakingChange(oldItem: AbiItem, newItem: AbiItem): boolean {
  // Different types are always breaking
  if (oldItem.type !== newItem.type) {
    return true;
  }

  // Compare signatures - different signatures mean breaking change
  const oldSig = getItemKey(oldItem);
  const newSig = getItemKey(newItem);

  if (oldSig !== newSig) {
    return true;
  }

  // For functions, check if outputs changed
  if (oldItem.type === "function" && newItem.type === "function") {
    const oldOutputs = JSON.stringify("outputs" in oldItem ? oldItem.outputs : []);
    const newOutputs = JSON.stringify("outputs" in newItem ? newItem.outputs : []);
    if (oldOutputs !== newOutputs) {
      return true;
    }

    // State mutability changes can be breaking
    if (oldItem.stateMutability !== newItem.stateMutability) {
      // Going from view/pure to nonpayable/payable is breaking for callers
      const wasReadOnly = oldItem.stateMutability === "view" || oldItem.stateMutability === "pure";
      const isNowMutating =
        newItem.stateMutability === "nonpayable" || newItem.stateMutability === "payable";
      if (wasReadOnly && isNowMutating) {
        return true;
      }
    }
  }

  // For events, check if indexed changed
  if (oldItem.type === "event" && newItem.type === "event") {
    const oldIndexed = oldItem.inputs.map((i) => i.indexed);
    const newIndexed = newItem.inputs.map((i) => i.indexed);
    if (JSON.stringify(oldIndexed) !== JSON.stringify(newIndexed)) {
      return true;
    }
  }

  return false;
}

/**
 * Compare two ABIs and return differences.
 *
 * @param oldAbi - Original ABI
 * @param newAbi - Updated ABI
 * @returns Diff result with added, removed, changed, and unchanged items
 *
 * @example
 * ```ts
 * const diff = diffAbis(v1Abi, v2Abi);
 * console.log(`Added: ${diff.added.length}, Removed: ${diff.removed.length}`);
 * ```
 *
 * @see FR-032
 */
export function diffAbis(oldAbi: Abi, newAbi: Abi): AbiDiff {
  const oldItems = oldAbi.filter(isSignableItem);
  const newItems = newAbi.filter(isSignableItem);

  // Build maps by name+type for comparison
  const oldByNameType = new Map<string, AbiItem>();
  const newByNameType = new Map<string, AbiItem>();

  for (const item of oldItems) {
    const key = `${item.type}:${item.name}`;
    oldByNameType.set(key, item);
  }

  for (const item of newItems) {
    const key = `${item.type}:${item.name}`;
    newByNameType.set(key, item);
  }

  const added: AbiItem[] = [];
  const removed: AbiItem[] = [];
  const changed: AbiItemChange[] = [];
  const unchanged: AbiItem[] = [];

  // Find added and changed items
  for (const [key, newItem] of newByNameType) {
    const oldItem = oldByNameType.get(key);

    if (oldItem === undefined) {
      added.push(newItem);
    } else {
      const oldSig = getItemKey(oldItem);
      const newSig = getItemKey(newItem);

      if (oldSig === newSig && JSON.stringify(oldItem) === JSON.stringify(newItem)) {
        unchanged.push(newItem);
      } else {
        changed.push({
          name: newItem.name,
          type: newItem.type as AbiItemType,
          old: oldItem,
          new: newItem,
          breaking: isBreakingChange(oldItem, newItem),
        });
      }
    }
  }

  // Find removed items
  for (const [key, oldItem] of oldByNameType) {
    if (!newByNameType.has(key)) {
      removed.push(oldItem);
    }
  }

  return { added, removed, changed, unchanged };
}

/**
 * Check if new ABI is backwards compatible (no removals or breaking changes).
 *
 * @param oldAbi - Original ABI
 * @param newAbi - Updated ABI
 * @returns True if upgrade is safe
 *
 * @example
 * ```ts
 * if (!isBackwardsCompatible(v1Abi, v2Abi)) {
 *   throw new Error("Breaking change detected!");
 * }
 * ```
 *
 * @see FR-033
 */
export function isBackwardsCompatible(oldAbi: Abi, newAbi: Abi): boolean {
  const diff = diffAbis(oldAbi, newAbi);

  // Any removals are breaking
  if (diff.removed.length > 0) {
    return false;
  }

  // Any breaking changes are... breaking
  if (diff.changed.some((c) => c.breaking)) {
    return false;
  }

  return true;
}
