/**
 * @module faucet/schemas/response
 * @description Zod schema for FaucetResponse
 */

import { z } from "zod";
import { HashSchema, type Hash } from "@podnetwork/core";

/**
 * Result of a faucet fund request.
 *
 * The faucet returns transaction hashes for each token funded.
 * By default, funding includes both native POD and USDT tokens.
 *
 * @example
 * ```typescript
 * const response: FaucetResponseData = {
 *   txHashes: [
 *     '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
 *     '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
 *   ],
 * };
 * ```
 */
export interface FaucetResponseData {
  /** Transaction hashes of the faucet transfers (native POD and ERC20 tokens) */
  readonly txHashes: readonly Hash[];
}

/**
 * Zod schema for validating FaucetResponse data from the REST API.
 *
 * The faucet API returns a response with tx_hashes array on success.
 *
 * @example
 * ```typescript
 * const result = FaucetResponseDataSchema.safeParse(responseData);
 * if (result.success) {
 *   const response: FaucetResponseData = result.data;
 *   console.log(`Funded with ${response.txHashes.length} transactions`);
 * }
 * ```
 */
export const FaucetResponseDataSchema: z.ZodType<FaucetResponseData, z.ZodTypeDef, unknown> = z
  .object({
    tx_hashes: z.array(HashSchema),
  })
  .transform(
    (v): FaucetResponseData => ({
      txHashes: v.tx_hashes,
    })
  );
