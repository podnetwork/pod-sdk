/**
 * @module schemas/vote-batch
 * @description Zod schema for VoteBatch RPC responses
 */

import { z } from "zod";
import type { Address } from "../types/address.js";
import type { Hash } from "../types/hash.js";

/**
 * A single vote from a validator.
 *
 * @example
 * ```typescript
 * const batches = await client.rpc.getVoteBatches(0n, 100n);
 * for (const batch of batches) {
 *   for (const vote of batch.votes) {
 *     console.log(`Vote from ${vote.txSigner} for epoch ${vote.epoch}`);
 *   }
 * }
 * ```
 */
export interface Vote {
  /** Address of the transaction signer */
  readonly txSigner: Address;
  /** Transaction nonce */
  readonly nonce: bigint;
  /** The hash being voted on (32-byte hash as hex string) */
  readonly hash: Hash;
  /** Epoch in which the vote was cast */
  readonly epoch: bigint;
}

/**
 * A batch of votes from a single validator.
 *
 * @example
 * ```typescript
 * const batches = await client.rpc.getVoteBatches(0n, 100n);
 * for (const batch of batches) {
 *   console.log(`Validator ${batch.validatorIndex} sequence ${batch.sequence}`);
 *   console.log(`Contains ${batch.votes.length} votes`);
 * }
 * ```
 */
export interface VoteBatch {
  /** List of votes in this batch */
  readonly votes: readonly Vote[];
  /** Index of the validator who created this batch */
  readonly validatorIndex: number;
  /** Sequence number of this batch */
  readonly sequence: bigint;
  /** Timestamp when this batch was created (in microseconds) */
  readonly timestamp: bigint;
  /** DER-encoded signature from the validator */
  readonly signature: string;
}

/**
 * Zod schema for Vote.
 * The node returns hash as raw bytes serialized to a hex array or string.
 * @internal
 */
const VoteSchema = z
  .object({
    tx_signer: z.string(),
    nonce: z.number(),
    hash: z.union([
      z.string(),
      z.array(z.number()).transform((bytes) => {
        // Convert byte array to hex string
        const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
        return `0x${hex}`;
      }),
    ]),
    epoch: z.number(),
  })
  .transform(
    (v): Vote => ({
      txSigner: v.tx_signer as Address,
      nonce: BigInt(v.nonce),
      hash: (typeof v.hash === "string" && !v.hash.startsWith("0x")
        ? `0x${v.hash}`
        : v.hash) as Hash,
      epoch: BigInt(v.epoch),
    })
  );

/**
 * Zod schema for VotesMetadata nested in VoteBatch.
 * @internal
 */
const VotesMetadataSchema = z.object({
  sequence: z.number(),
  ts: z.number(),
});

/**
 * Zod schema for validating VoteBatch RPC responses.
 *
 * The node returns metadata as a nested object with sequence and ts fields.
 *
 * @example
 * ```typescript
 * const result = VoteBatchSchema.safeParse(rpcResponse);
 * if (result.success) {
 *   const batch: VoteBatch = result.data;
 * }
 * ```
 */
export const VoteBatchSchema: z.ZodType<VoteBatch, z.ZodTypeDef, unknown> = z
  .object({
    votes: z.array(VoteSchema),
    metadata: VotesMetadataSchema,
    validator_index: z.number(),
    signature: z.string(),
  })
  .transform(
    (v): VoteBatch => ({
      votes: v.votes,
      validatorIndex: v.validator_index,
      sequence: BigInt(v.metadata.sequence),
      timestamp: BigInt(v.metadata.ts),
      signature: v.signature,
    })
  );

/**
 * Zod schema for an array of VoteBatch responses.
 */
export const VoteBatchArraySchema = z.array(VoteBatchSchema);
