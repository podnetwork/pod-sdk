/**
 * @module schemas/transaction
 * @description Zod schema for Transaction RPC responses and requests
 */

import { z } from "zod";
import { AddressSchema, AddressBrand, type Address } from "../types/address.js";
import { HashSchema, HashBrand, type Hash } from "../types/hash.js";
import { BytesSchema, type Bytes } from "../types/bytes.js";
import { RpcBigIntSchema, RpcBigIntOptionalSchema } from "./primitives.js";

// Re-export brand symbols for TypeScript declaration compatibility
export { AddressBrand, HashBrand };

/**
 * A confirmed transaction on the Pod network.
 *
 * @example
 * ```typescript
 * const tx = await client.rpc.getTransaction(txHash);
 * if (tx) {
 *   console.log(`From: ${tx.from}`);
 *   console.log(`Value: ${formatPod(tx.value)} POD`);
 * }
 * ```
 */
export interface Transaction {
  /** Transaction hash */
  readonly hash: Hash;
  /** Sender address */
  readonly from: Address;
  /** Recipient address (undefined for contract creation) */
  readonly to: Address | undefined;
  /** Value transferred in wei */
  readonly value: bigint;
  /** Transaction input data (calldata) */
  readonly input: Bytes;
  /** Sender's nonce at time of transaction */
  readonly nonce: bigint;
  /** Gas limit */
  readonly gas: bigint;
  /** Legacy gas price (mutually exclusive with EIP-1559 fields) */
  readonly gasPrice?: bigint | undefined;
  /** EIP-1559 max fee per gas */
  readonly maxFeePerGas?: bigint | undefined;
  /** EIP-1559 max priority fee per gas */
  readonly maxPriorityFeePerGas?: bigint | undefined;
  /** Block number containing this transaction */
  readonly blockNumber?: bigint | undefined;
  /** Block hash containing this transaction */
  readonly blockHash?: Hash | undefined;
  /** Transaction index within the block */
  readonly transactionIndex?: bigint | undefined;
}

/**
 * Zod schema for validating Transaction RPC responses.
 *
 * @example
 * ```typescript
 * const result = TransactionSchema.safeParse(rpcResponse);
 * if (result.success) {
 *   const tx: Transaction = result.data;
 * }
 * ```
 */
export const TransactionSchema: z.ZodType<Transaction, z.ZodTypeDef, unknown> = z
  .object({
    hash: HashSchema,
    from: AddressSchema,
    to: z.union([AddressSchema, z.null()]).transform((v): Address | undefined => v ?? undefined),
    value: RpcBigIntSchema,
    input: BytesSchema,
    nonce: RpcBigIntSchema,
    gas: RpcBigIntSchema,
    gasPrice: RpcBigIntOptionalSchema.optional(),
    maxFeePerGas: RpcBigIntOptionalSchema.optional(),
    maxPriorityFeePerGas: RpcBigIntOptionalSchema.optional(),
    blockNumber: RpcBigIntOptionalSchema.optional(),
    blockHash: HashSchema.optional()
      .nullable()
      .transform((v) => v ?? undefined),
    transactionIndex: RpcBigIntOptionalSchema.optional(),
  })
  .transform(
    (v): Transaction => ({
      hash: v.hash,
      from: v.from,
      to: v.to,
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
 * Type for nullable Transaction (used when tx not found).
 */
export type TransactionOrNull = Transaction | null;

/**
 * Schema for Transaction that may be null (not found).
 */
export const TransactionOrNullSchema: z.ZodType<TransactionOrNull, z.ZodTypeDef, unknown> = z.union(
  [TransactionSchema, z.null()]
);

/**
 * Parameters for sending a transaction.
 *
 * @example
 * ```typescript
 * const request: TransactionRequest = {
 *   to: '0x742d35Cc6634C0532925a3b844Bc9e7595f8e6a2',
 *   value: parsePod('1.0'),
 * };
 *
 * const pending = await client.tx.sendTransaction(request, wallet);
 * ```
 */
export interface TransactionRequest {
  /** Recipient address (undefined for contract creation) */
  to?: Address | undefined;
  /** Value to send in wei */
  value?: bigint | undefined;
  /** Transaction data (calldata) */
  data?: Bytes | undefined;
  /** Gas limit */
  gas?: bigint | undefined;
  /** EIP-1559 max fee per gas */
  maxFeePerGas?: bigint | undefined;
  /** EIP-1559 max priority fee per gas */
  maxPriorityFeePerGas?: bigint | undefined;
  /** Nonce (auto-filled if not provided) */
  nonce?: bigint | undefined;
}

/**
 * Zod schema for validating TransactionRequest input.
 *
 * This schema is more lenient than TransactionSchema since
 * many fields are optional and will be auto-filled.
 */
export const TransactionRequestSchema = z.object({
  to: AddressSchema.optional(),
  value: z.bigint().nonnegative().optional(),
  data: BytesSchema.optional(),
  gas: z.bigint().positive().optional(),
  maxFeePerGas: z.bigint().positive().optional(),
  maxPriorityFeePerGas: z.bigint().positive().optional(),
  nonce: z.bigint().nonnegative().optional(),
});
