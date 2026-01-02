/**
 * @module schemas/log
 * @description Zod schema for Log (event) RPC responses
 */

import { z } from "zod";
import { AddressSchema, AddressBrand, type Address } from "../types/address.js";
import { HashSchema, HashBrand, type Hash } from "../types/hash.js";
import { BytesSchema, type Bytes } from "../types/bytes.js";
import { RpcBigIntSchema, RpcBigIntOptionalSchema } from "./primitives.js";

// Re-export brand symbols for TypeScript declaration compatibility
export { AddressBrand, HashBrand };

/**
 * Event log emitted during transaction execution.
 *
 * @example
 * ```typescript
 * const receipt = await client.rpc.getTransactionReceipt(txHash);
 * if (receipt) {
 *   for (const log of receipt.logs) {
 *     console.log(`Event from ${log.address}`);
 *     console.log(`Topics: ${log.topics.length}`);
 *   }
 * }
 * ```
 */
export interface Log {
  /** Contract address that emitted the event */
  readonly address: Address;
  /** Event topics (signature + indexed parameters) */
  readonly topics: readonly Hash[];
  /** Non-indexed event parameters (ABI-encoded) */
  readonly data: Bytes;
  /** Block number containing the transaction */
  readonly blockNumber: bigint | undefined;
  /** Block hash containing the transaction */
  readonly blockHash: Hash;
  /** Transaction hash that emitted this log */
  readonly transactionHash: Hash;
  /** Index of this log within the block */
  readonly logIndex: bigint;
  /** Transaction index within the block */
  readonly transactionIndex: bigint;
  /** Whether this log was removed due to chain reorg (always false in Pod) */
  readonly removed: boolean;
}

/**
 * Zod schema for validating Log RPC responses.
 *
 * @example
 * ```typescript
 * const result = LogSchema.safeParse(rpcResponse);
 * if (result.success) {
 *   const log: Log = result.data;
 * }
 * ```
 */
export const LogSchema: z.ZodType<Log, z.ZodTypeDef, unknown> = z
  .object({
    address: AddressSchema,
    topics: z.array(HashSchema),
    data: BytesSchema,
    blockNumber: RpcBigIntOptionalSchema,
    blockHash: HashSchema,
    transactionHash: HashSchema,
    logIndex: RpcBigIntSchema,
    transactionIndex: RpcBigIntSchema,
    removed: z.boolean(),
  })
  .transform(
    (v): Log => ({
      address: v.address,
      topics: v.topics,
      data: v.data,
      blockNumber: v.blockNumber,
      blockHash: v.blockHash,
      transactionHash: v.transactionHash,
      logIndex: v.logIndex,
      transactionIndex: v.transactionIndex,
      removed: v.removed,
    })
  );

/**
 * Filter for querying logs.
 *
 * @example
 * ```typescript
 * const filter: LogFilter = {
 *   address: contractAddress,
 *   topics: [eventSignature],
 *   fromBlock: 0n,
 *   toBlock: 'latest',
 * };
 * ```
 */
export interface LogFilter {
  /** Filter by contract address */
  address?: Address | readonly Address[];
  /** Filter by topics (null for wildcard) */
  topics?: readonly (Hash | readonly Hash[] | null)[];
  /** Start block (inclusive) */
  fromBlock?: bigint | "latest" | "earliest" | "pending";
  /** End block (inclusive) */
  toBlock?: bigint | "latest" | "earliest" | "pending";
  /** Block hash to filter (mutually exclusive with fromBlock/toBlock) */
  blockHash?: Hash;
}

/**
 * Zod schema for log filter input validation.
 */
export const LogFilterSchema = z.object({
  address: z.union([AddressSchema, z.array(AddressSchema)]).optional(),
  topics: z.array(z.union([HashSchema, z.array(HashSchema), z.null()])).optional(),
  fromBlock: z
    .union([
      z.bigint().nonnegative(),
      z.literal("latest"),
      z.literal("earliest"),
      z.literal("pending"),
    ])
    .optional(),
  toBlock: z
    .union([
      z.bigint().nonnegative(),
      z.literal("latest"),
      z.literal("earliest"),
      z.literal("pending"),
    ])
    .optional(),
  blockHash: HashSchema.optional(),
});
