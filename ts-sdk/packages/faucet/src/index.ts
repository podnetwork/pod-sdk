/**
 * @module @podnetwork/faucet
 * @description Faucet client for pod network SDK - testnet token requests
 *
 * This package provides functionality to request testnet tokens from
 * the pod network faucet.
 *
 * @example
 * ```typescript
 * import { createFaucetNamespace } from '@podnetwork/faucet';
 *
 * // Create faucet client
 * const faucet = createFaucetNamespace({
 *   url: 'https://faucet.testnet.pod.network',
 *   timeout: 30000,
 *   maxRetries: 3,
 * });
 *
 * // Request testnet tokens (funds native POD and USDT)
 * const response = await faucet.fund(address);
 * console.log(`Funded with ${response.txHashes.length} transactions`);
 * ```
 */

export const VERSION = "0.1.0" as const;

// Schemas
export { type FaucetResponseData, FaucetResponseDataSchema } from "./schemas/index.js";

// Namespace
export { FaucetNamespace, type FaucetResponse, type FaucetConfig } from "./namespace.js";

// Re-export from core for convenience
export { PodFundingError, type PodFundingErrorCode } from "@podnetwork/core";

// Factory function
import { FaucetNamespace, type FaucetConfig } from "./namespace.js";

/**
 * Creates a FaucetNamespace instance.
 *
 * This is the recommended way to create a FaucetNamespace when using
 * the faucet package standalone or integrating with PodClient.
 *
 * @param config - Faucet configuration
 * @returns New FaucetNamespace instance
 *
 * @example
 * ```typescript
 * import { createFaucetNamespace } from '@podnetwork/faucet';
 *
 * const faucet = createFaucetNamespace({
 *   url: 'https://faucet.testnet.pod.network',
 *   timeout: 30000,
 *   maxRetries: 3,
 * });
 *
 * // Request testnet tokens
 * const response = await faucet.fund(address);
 * for (const txHash of response.txHashes) {
 *   console.log(`  ${txHash}`);
 * }
 * ```
 */
export function createFaucetNamespace(config: FaucetConfig): FaucetNamespace {
  return new FaucetNamespace(config);
}
