/**
 * @module schemas/block
 * @description Zod schema for Block RPC responses
 */

import { z } from "zod";
import { AddressSchema, AddressBrand, type Address } from "../types/address.js";
import { HashSchema, HashBrand, type Hash } from "../types/hash.js";
import { BytesSchema, type Bytes } from "../types/bytes.js";
import { RpcBigIntSchema, RpcBigIntOptionalSchema } from "./primitives.js";

// Re-export brand symbols for TypeScript declaration compatibility
export { AddressBrand, HashBrand };

/**
 * Transaction included in a block (full object form).
 */
export interface BlockTransaction {
  readonly hash: Hash;
  readonly from: Address;
  readonly to: Address | undefined;
  readonly value: bigint;
  readonly input: Bytes;
  readonly nonce: bigint;
  readonly gas: bigint;
  readonly gasPrice?: bigint | undefined;
  readonly maxFeePerGas?: bigint | undefined;
  readonly maxPriorityFeePerGas?: bigint | undefined;
  readonly blockNumber?: bigint | undefined;
  readonly blockHash?: Hash | undefined;
  readonly transactionIndex?: bigint | undefined;
}

/**
 * Transaction as included in block (minimal form - just hash).
 * @internal
 */
const BlockTransactionHashSchema = HashSchema;

/**
 * Full transaction object as included in block when fullTransactions=true.
 * This is a simplified inline version - the full TransactionSchema is defined separately.
 * @internal
 */
const BlockTransactionObjectSchema = z
  .object({
    hash: HashSchema,
    from: AddressSchema,
    to: z.union([AddressSchema, z.null()]),
    value: RpcBigIntSchema,
    input: BytesSchema,
    nonce: RpcBigIntSchema,
    gas: RpcBigIntSchema,
    gasPrice: RpcBigIntOptionalSchema.optional(),
    maxFeePerGas: RpcBigIntOptionalSchema.optional(),
    maxPriorityFeePerGas: RpcBigIntOptionalSchema.optional(),
    blockNumber: RpcBigIntOptionalSchema.optional(),
    blockHash: HashSchema.optional(),
    transactionIndex: RpcBigIntOptionalSchema.optional(),
  })
  .transform(
    (v): BlockTransaction => ({
      hash: v.hash,
      from: v.from,
      to: v.to ?? undefined,
      value: v.value,
      input: v.input,
      nonce: v.nonce,
      gas: v.gas,
      gasPrice: v.gasPrice,
      maxFeePerGas: v.maxFeePerGas,
      maxPriorityFeePerGas: v.maxPriorityFeePerGas,
      blockNumber: v.blockNumber,
      blockHash: v.blockHash,
      transactionIndex: v.transactionIndex,
    })
  );

/**
 * Block transaction field can be array of hashes or full transaction objects.
 * @internal
 */
const BlockTransactionsSchema = z.union([
  z.array(BlockTransactionHashSchema),
  z.array(BlockTransactionObjectSchema),
]);

/**
 * A Pod network block.
 *
 * Note: Pod does not have blocks in the traditional sense.
 * These fields exist for Ethereum compatibility but may not
 * have meaningful values (e.g., number is always 0).
 *
 * @example
 * ```typescript
 * const block = await client.rpc.getBlockByNumber('latest');
 * if (block) {
 *   console.log(`Block hash: ${block.hash}`);
 *   console.log(`Transactions: ${block.transactions.length}`);
 * }
 * ```
 */
export interface Block {
  /** Block number (always 0 in Pod) */
  readonly number: bigint;
  /** Block hash */
  readonly hash: Hash;
  /** Parent block hash */
  readonly parentHash: Hash;
  /** Block timestamp (validator's local timestamp) */
  readonly timestamp: bigint;
  /** Transactions in this block (hashes or full objects) */
  readonly transactions: readonly Hash[] | readonly BlockTransaction[];
  /** Base fee per gas (EIP-1559) */
  readonly baseFeePerGas?: bigint | undefined;
  /** Gas limit for this block */
  readonly gasLimit: bigint;
  /** Gas used by transactions in this block */
  readonly gasUsed: bigint;
  /** Block miner/producer address */
  readonly miner?: Address | undefined;
  /** Extra data field */
  readonly extraData?: Bytes | undefined;
}

/**
 * Zod schema for validating Block RPC responses.
 *
 * Handles the variable transaction format (hashes or full objects)
 * and normalizes all fields to their proper types.
 *
 * @example
 * ```typescript
 * const result = BlockSchema.safeParse(rpcResponse);
 * if (result.success) {
 *   const block: Block = result.data;
 * }
 * ```
 */
export const BlockSchema: z.ZodType<Block, z.ZodTypeDef, unknown> = z
  .object({
    number: RpcBigIntSchema,
    hash: HashSchema,
    parentHash: HashSchema,
    timestamp: RpcBigIntSchema,
    transactions: BlockTransactionsSchema,
    baseFeePerGas: RpcBigIntOptionalSchema.optional(),
    gasLimit: RpcBigIntSchema,
    gasUsed: RpcBigIntSchema,
    miner: AddressSchema.optional(),
    extraData: BytesSchema.optional(),
  })
  .transform(
    (v): Block => ({
      number: v.number,
      hash: v.hash,
      parentHash: v.parentHash,
      timestamp: v.timestamp,
      transactions: v.transactions,
      baseFeePerGas: v.baseFeePerGas,
      gasLimit: v.gasLimit,
      gasUsed: v.gasUsed,
      miner: v.miner,
      extraData: v.extraData,
    })
  );

/**
 * Type for nullable Block (used when block not found).
 */
export type BlockOrNull = Block | null;

/**
 * Schema for Block that may be null (block not found).
 */
export const BlockOrNullSchema: z.ZodType<BlockOrNull, z.ZodTypeDef, unknown> = z.union([
  BlockSchema,
  z.null(),
]);
