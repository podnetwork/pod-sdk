/**
 * @module types/block-number
 * @description Block identifier types (number or tag)
 */

import { z } from "zod";

/**
 * Special block tags for querying blockchain state.
 */
export type BlockTag = "latest" | "earliest" | "pending" | "safe" | "finalized";

/**
 * All valid block tags as an array for validation.
 */
export const BLOCK_TAGS: readonly BlockTag[] = [
  "latest",
  "earliest",
  "pending",
  "safe",
  "finalized",
] as const;

/**
 * Block identifier - either a numeric block number or a special tag.
 *
 * @example
 * ```typescript
 * const latest: BlockNumber = 'latest';
 * const specific: BlockNumber = 12345n;
 * ```
 */
export type BlockNumber = bigint | BlockTag;

/**
 * Zod schema for block tags.
 */
export const BlockTagSchema = z.enum(["latest", "earliest", "pending", "safe", "finalized"]);

/**
 * Zod schema for block numbers (bigint).
 */
export const BlockNumberBigIntSchema = z.bigint().nonnegative("Block number must be non-negative");

/**
 * Zod schema for block number or tag.
 *
 * @example
 * ```typescript
 * BlockNumberSchema.parse('latest'); // 'latest'
 * BlockNumberSchema.parse(100n);     // 100n
 * ```
 */
export const BlockNumberSchema = z.union([BlockTagSchema, BlockNumberBigIntSchema]);

/**
 * Input type for functions that accept block identifiers.
 * Also accepts number for convenience (converted to bigint).
 */
export type BlockNumberLike = BlockNumber | number;

/**
 * Normalizes a block number input to the format expected by JSON-RPC.
 *
 * @param block - Block number, tag, or number
 * @returns Hex string for bigint, or the tag string
 *
 * @example
 * ```typescript
 * normalizeBlockNumber('latest');  // 'latest'
 * normalizeBlockNumber(100n);      // '0x64'
 * normalizeBlockNumber(100);       // '0x64'
 * ```
 */
export function normalizeBlockNumber(block: BlockNumberLike): string {
  if (typeof block === "string") {
    return block; // Block tag
  }
  const value = typeof block === "number" ? BigInt(block) : block;
  return `0x${value.toString(16)}`;
}
