/**
 * @module errors
 * @description Unified error handling for pod SDK
 *
 * All pod SDK errors use the `POD_XXXX` code format:
 * - 1xxx: Network errors
 * - 2xxx: Funding errors
 * - 3xxx: Execution errors
 * - 4xxx: Wallet errors
 * - 5xxx: Auction errors
 * - 6xxx: Orderbook errors
 *
 * @example
 * ```typescript
 * import { PodError, PodNetworkError, POD_ERRORS } from '@podnetwork/core';
 *
 * try {
 *   await client.tx.sendTransaction(tx, wallet);
 * } catch (err) {
 *   const podError = PodError.from(err);
 *
 *   console.log(podError.code);        // "POD_2001"
 *   console.log(podError.message);     // "Insufficient funds"
 *   console.log(podError.suggestion);  // "Request tokens from the faucet..."
 *   console.log(podError.isRetryable); // false
 *
 *   // Type-specific handling
 *   if (podError instanceof PodNetworkError) {
 *     console.log(podError.url);
 *   }
 *
 *   // Code-based handling
 *   if (podError.code === POD_ERRORS.INSUFFICIENT_FUNDS) {
 *     // Show faucet link
 *   }
 * }
 * ```
 */

// Error codes and metadata
export {
  POD_ERRORS,
  ERROR_CODE_METADATA,
  getErrorMetadata,
  isRetryableCode,
  getSuggestion,
  getCategory,
} from "./codes.js";
export type {
  PodErrorCode,
  PodErrorCategory,
  PodErrorSeverity,
  ErrorCodeMetadata,
} from "./codes.js";

// Base error class
export { PodError, PodUnknownError } from "./pod-error.js";
export type { PodErrorJson, PodErrorOptions } from "./pod-error.js";

// Specialized error classes
export { PodNetworkError } from "./network.js";
export type { PodNetworkErrorCode } from "./network.js";

export { PodFundingError } from "./funding.js";
export type { PodFundingErrorCode } from "./funding.js";

export { PodExecutionError } from "./execution.js";
export type { PodExecutionErrorCode } from "./execution.js";

export { PodWalletError } from "./wallet.js";
export type { PodWalletErrorCode } from "./wallet.js";

// Error normalizer
export { normalizeError } from "./normalizer.js";
