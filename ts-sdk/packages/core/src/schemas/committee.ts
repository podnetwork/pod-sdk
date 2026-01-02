/**
 * @module schemas/committee
 * @description Zod schema for Committee RPC responses
 */

import { z } from "zod";
import { keccak256 } from "../utils/crypto.js";
import type { Address } from "../types/address.js";

/**
 * A validator in the committee.
 *
 * @example
 * ```typescript
 * const committee = await client.rpc.getCommittee();
 * for (const validator of committee.validators) {
 *   console.log(`Validator ${validator.index}: ${validator.address}`);
 * }
 * ```
 */
export interface Validator {
  /** Uncompressed secp256k1 public key (130-char hex string) */
  readonly publicKey: string;
  /** Ethereum address derived from the public key */
  readonly address: Address;
  /** Position in the validators array (0-indexed) */
  readonly index: number;
}

/**
 * Committee snapshot containing validators and quorum information.
 *
 * @example
 * ```typescript
 * const committee = await client.rpc.getCommittee();
 * console.log(`Quorum size: ${committee.quorumSize}`);
 * console.log(`Total validators: ${committee.validators.length}`);
 * ```
 */
export interface Committee {
  /** List of validators in the committee */
  readonly validators: readonly Validator[];
  /** Total number of validators (n) */
  readonly validatorCount: number;
  /** Minimum signatures required for attestation (n - f) */
  readonly quorumSize: number;
  /** Low quorum size (n - 3f) */
  readonly lowQuorumSize: number;
  /** Solver quorum size (n - 2f) */
  readonly solverQuorumSize: number;
}

/**
 * Derives an Ethereum address from an uncompressed secp256k1 public key.
 *
 * Takes the keccak256 hash of the 64-byte public key (excluding the 04 prefix)
 * and returns the last 20 bytes as the address.
 *
 * @param publicKey - The uncompressed public key (130-char hex, with or without 04 prefix)
 * @returns The derived Ethereum address
 * @internal
 */
function deriveAddress(publicKey: string): Address {
  // Remove '04' prefix if present (uncompressed format marker)
  const pubKeyBytes = publicKey.startsWith("04") ? publicKey.slice(2) : publicKey;

  // keccak256 of the 64-byte public key, take last 20 bytes
  const hash = keccak256(`0x${pubKeyBytes}`);
  return `0x${hash.slice(-40)}` as Address;
}

/**
 * Zod schema for validating Committee RPC responses.
 *
 * Transforms the raw RPC response from the node into a normalized Committee object.
 * The node returns validators as [index, publicKey] tuples and uses n_minus_* naming.
 *
 * @example
 * ```typescript
 * const result = CommitteeSchema.safeParse(rpcResponse);
 * if (result.success) {
 *   const committee: Committee = result.data;
 * }
 * ```
 */
export const CommitteeSchema: z.ZodType<Committee, z.ZodTypeDef, unknown> = z
  .object({
    validators: z.array(z.tuple([z.number(), z.string()])),
    n: z.number(),
    n_minus_f: z.number(),
    n_minus_2f: z.number(),
    n_minus_3f: z.number(),
  })
  .transform(
    (v): Committee => ({
      validators: v.validators.map(([index, publicKey]) => ({
        publicKey,
        address: deriveAddress(publicKey),
        index,
      })),
      validatorCount: v.n,
      quorumSize: v.n_minus_f,
      solverQuorumSize: v.n_minus_2f,
      lowQuorumSize: v.n_minus_3f,
    })
  );
