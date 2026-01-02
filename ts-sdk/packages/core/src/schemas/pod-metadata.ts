/**
 * @module schemas/pod-metadata
 * @description Zod schemas for Pod-specific attestation metadata
 */

import { z } from "zod";
import { HashSchema, type Hash } from "../types/hash.js";

/**
 * Attested transaction info from pod node.
 *
 * Contains the transaction hash and committee epoch when it was attested.
 */
export interface AttestedTransaction {
  /** Transaction hash */
  readonly txHash: Hash;
  /** Committee epoch when the transaction was attested */
  readonly committeeEpoch: number;
}

/**
 * Zod schema for AttestedTransaction.
 *
 * The node returns:
 * - `hash`: The transaction hash
 * - `committee_epoch`: The epoch when attested
 */
export const AttestedTransactionSchema: z.ZodType<AttestedTransaction, z.ZodTypeDef, unknown> = z
  .object({
    hash: HashSchema,
    committee_epoch: z.number().int().nonnegative(),
  })
  .transform(
    (v): AttestedTransaction => ({
      txHash: v.hash,
      committeeEpoch: v.committee_epoch,
    })
  );

/**
 * Validator signatures indexed by validator ID.
 *
 * The keys are validator indices as strings, values are DER-encoded signatures.
 */
export type ValidatorSignatures = Record<string, string>;

/**
 * Zod schema for validator signatures object.
 */
export const ValidatorSignaturesSchema = z.record(z.string(), z.string());

/**
 * Pod-specific metadata included in transaction receipts.
 *
 * This metadata contains the attestation info and validator signatures
 * that confirm the transaction's finality in the pod network.
 *
 * @example
 * ```typescript
 * const receipt = await client.rpc.getTransactionReceipt(txHash);
 * if (receipt) {
 *   console.log(`Attested TX: ${receipt.podMetadata.attestedTx.txHash}`);
 *   console.log(`Committee Epoch: ${receipt.podMetadata.attestedTx.committeeEpoch}`);
 *   console.log(`Signatures: ${receipt.podMetadata.signatureCount}`);
 * }
 * ```
 */
export interface PodMetadata {
  /** Attested transaction info */
  readonly attestedTx: AttestedTransaction;
  /** Validator signatures keyed by validator index */
  readonly signatures: ValidatorSignatures;
  /** Number of validator signatures */
  readonly signatureCount: number;
}

/**
 * Zod schema for validating PodMetadata from the node's actual response format.
 *
 * The node returns:
 * - `attested_tx`: { hash, committee_epoch }
 * - `signatures`: { "0": "sig...", "1": "sig..." }
 */
export const PodMetadataSchema: z.ZodType<PodMetadata, z.ZodTypeDef, unknown> = z
  .object({
    attested_tx: AttestedTransactionSchema,
    signatures: ValidatorSignaturesSchema,
  })
  .transform(
    (v): PodMetadata => ({
      attestedTx: v.attested_tx,
      signatures: v.signatures,
      signatureCount: Object.keys(v.signatures).length,
    })
  );
