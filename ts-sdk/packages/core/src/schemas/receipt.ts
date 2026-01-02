/**
 * @module schemas/receipt
 * @description Zod schema for TransactionReceipt with pod metadata
 */

import { z } from "zod";
import { AddressSchema, AddressBrand, type Address } from "../types/address.js";
import { HashSchema, HashBrand, type Hash } from "../types/hash.js";
import { LogSchema, type Log } from "./log.js";
import {
  AttestedTransactionSchema,
  ValidatorSignaturesSchema,
  type PodMetadata,
} from "./pod-metadata.js";
import { RpcBigIntSchema, RpcBigIntOptionalSchema } from "./primitives.js";

// Re-export brand symbols for TypeScript declaration compatibility
export { AddressBrand, HashBrand };

/**
 * Schema for status field - handles both numeric and boolean formats.
 * RPC may return "0x1"/"0x0" or true/false.
 */
const StatusSchema = z.union([z.boolean(), z.string(), z.number()]).transform((v): boolean => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  // Handle hex strings like "0x1" or "0x0"
  return v === "0x1" || v === "1";
});

/**
 * Transaction receipt with pod attestation metadata.
 *
 * Includes standard Ethereum receipt fields plus pod-specific
 * metadata containing validator attestations.
 *
 * @example
 * ```typescript
 * const receipt = await pending.waitForReceipt();
 *
 * if (receipt.status) {
 *   console.log(`Gas used: ${receipt.gasUsed}`);
 * }
 *
 * console.log(`Signatures: ${receipt.podMetadata.signatureCount}`);
 * ```
 */
export interface TransactionReceipt {
  /** Transaction hash */
  readonly transactionHash: Hash;
  /** Block number containing the transaction */
  readonly blockNumber: bigint | undefined;
  /** Block hash containing the transaction */
  readonly blockHash: Hash;
  /** Sender address */
  readonly from: Address;
  /** Recipient address (undefined for contract creation) */
  readonly to: Address | undefined;
  /** Gas used by this transaction */
  readonly gasUsed: bigint;
  /** Cumulative gas used in block up to this transaction */
  readonly cumulativeGasUsed: bigint;
  /** Transaction status (true = success, false = reverted) */
  readonly status: boolean;
  /** Contract address if this was a deployment */
  readonly contractAddress: Address | undefined;
  /** Event logs emitted during execution */
  readonly logs: readonly Log[];
  /** Effective gas price paid */
  readonly effectiveGasPrice: bigint;
  /** Transaction index within the block */
  readonly transactionIndex: bigint;
  /** pod-specific attestation metadata */
  readonly podMetadata: PodMetadata;
}

/**
 * Zod schema for validating TransactionReceipt RPC responses.
 *
 * The pod node returns attestation data at the top level:
 * - `attested_tx`: { hash, committee_epoch }
 * - `signatures`: { "0": "sig...", "1": "sig..." }
 *
 * These are transformed into the `podMetadata` field for a cleaner API.
 *
 * @example
 * ```typescript
 * const result = TransactionReceiptSchema.safeParse(rpcResponse);
 * if (result.success) {
 *   const receipt: TransactionReceipt = result.data;
 * }
 * ```
 */
export const TransactionReceiptSchema: z.ZodType<TransactionReceipt, z.ZodTypeDef, unknown> = z
  .object({
    transactionHash: HashSchema,
    blockNumber: RpcBigIntOptionalSchema,
    blockHash: HashSchema,
    from: AddressSchema,
    to: z.union([AddressSchema, z.null()]).transform((v): Address | undefined => v ?? undefined),
    gasUsed: RpcBigIntSchema,
    cumulativeGasUsed: RpcBigIntSchema,
    status: StatusSchema,
    contractAddress: z
      .union([AddressSchema, z.null()])
      .transform((v): Address | undefined => v ?? undefined),
    logs: z.array(LogSchema),
    effectiveGasPrice: RpcBigIntSchema,
    transactionIndex: RpcBigIntSchema,
    // pod-specific fields at top level
    attested_tx: AttestedTransactionSchema,
    signatures: ValidatorSignaturesSchema,
  })
  .transform(
    (v): TransactionReceipt => ({
      transactionHash: v.transactionHash,
      blockNumber: v.blockNumber,
      blockHash: v.blockHash,
      from: v.from,
      to: v.to,
      gasUsed: v.gasUsed,
      cumulativeGasUsed: v.cumulativeGasUsed,
      status: v.status,
      contractAddress: v.contractAddress,
      logs: v.logs,
      effectiveGasPrice: v.effectiveGasPrice,
      transactionIndex: v.transactionIndex,
      // Transform pod fields into podMetadata for cleaner API
      podMetadata: {
        attestedTx: v.attested_tx,
        signatures: v.signatures,
        signatureCount: Object.keys(v.signatures).length,
      },
    })
  );

/**
 * Type for nullable TransactionReceipt (used when receipt not found).
 */
export type TransactionReceiptOrNull = TransactionReceipt | null;

/**
 * Schema for TransactionReceipt that may be null (not found).
 */
export const TransactionReceiptOrNullSchema: z.ZodType<
  TransactionReceiptOrNull,
  z.ZodTypeDef,
  unknown
> = z.union([TransactionReceiptSchema, z.null()]);

/**
 * Helper class that wraps TransactionReceipt with convenience methods.
 *
 * @example
 * ```typescript
 * const receipt = await pending.waitForReceipt();
 * const wrapped = new TransactionReceiptHelper(receipt);
 *
 * console.log(`Success: ${wrapped.succeeded()}`);
 * console.log(`Total cost: ${wrapped.totalCost()} wei`);
 * ```
 */
export class TransactionReceiptHelper {
  constructor(private readonly receipt: TransactionReceipt) {}

  /**
   * Get the underlying receipt data.
   */
  get data(): TransactionReceipt {
    return this.receipt;
  }

  /**
   * Whether the transaction succeeded.
   */
  succeeded(): boolean {
    return this.receipt.status;
  }

  /**
   * Whether the transaction reverted.
   */
  failed(): boolean {
    return !this.receipt.status;
  }

  /**
   * Whether this was a contract deployment.
   */
  isDeployment(): boolean {
    return this.receipt.contractAddress !== undefined;
  }

  /**
   * Total cost of the transaction (gasUsed * effectiveGasPrice).
   */
  totalCost(): bigint {
    return this.receipt.gasUsed * this.receipt.effectiveGasPrice;
  }

  /**
   * Whether the transaction has been attested by at least one validator.
   */
  hasAttestations(): boolean {
    return this.receipt.podMetadata.signatureCount > 0;
  }

  /**
   * Number of validator signatures received.
   */
  signatureCount(): number {
    return this.receipt.podMetadata.signatureCount;
  }

  /**
   * Committee epoch when the transaction was attested.
   */
  committeeEpoch(): number {
    return this.receipt.podMetadata.attestedTx.committeeEpoch;
  }
}
