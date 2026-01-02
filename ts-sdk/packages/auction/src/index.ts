/**
 * @module @podnetwork/auction
 * @description Auction client for Pod Network SDK - optimistic auction participation
 */

export const VERSION = "0.1.0" as const;

// Schemas
export {
  type AuctionBidData,
  AuctionBidDataSchema,
  type AuctionStatusData,
  AuctionStatusDataSchema,
  AuctionStatusDataOrNullSchema,
} from "./schemas/index.js";

// Core classes
export { AuctionBid, AuctionBidBuilder, DEFAULT_DEADLINE_OFFSET } from "./bid.js";

export { AuctionStatus, DEFAULT_OUTBID_PERCENT } from "./status.js";

// Error types
export { PodAuctionError, type PodAuctionErrorCode } from "./auction-error.js";

// Namespace
export {
  AuctionNamespace,
  PendingAuctionTransaction,
  type AuctionSigner,
  type WaitForDeadlineOptions,
} from "./namespace.js";

// Re-export transport config from core for convenience
export type { RpcTransportConfig as AuctionTransportConfig } from "@podnetwork/core";

// Factory function to create AuctionNamespace from PodClient-compatible config
import { AuctionNamespace, type TransactionSender } from "./namespace.js";

/**
 * Configuration for creating an AuctionNamespace from a PodClient.
 */
export interface CreateAuctionNamespaceConfig {
  /** RPC endpoint URL */
  url: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum retry attempts */
  maxRetries: number;
}

/**
 * Creates an AuctionNamespace instance.
 *
 * This is the recommended way to create an AuctionNamespace when using
 * the auction package standalone or integrating with PodClient.
 *
 * @param config - Transport configuration
 * @param txSender - Transaction sender (from client.getTransactionSender())
 * @returns New AuctionNamespace instance
 *
 * @example
 * ```typescript
 * import { PodClient } from '@podnetwork/core';
 * import { createAuctionNamespace, AuctionBid } from '@podnetwork/auction';
 *
 * const client = PodClient.dev();
 * const auction = createAuctionNamespace(
 *   {
 *     url: client.url,
 *     timeout: client.config.timeout,
 *     maxRetries: client.config.maxRetries,
 *   },
 *   client.getTransactionSender()
 * );
 *
 * // Submit a bid and wait for deadline
 * const bid = AuctionBid.builder().amount(1000000n).deadlineMinutes(5).build();
 * const pending = await auction.submitBid(auctionId, bid, signer);
 * console.log(`Bid submitted: ${pending.txHash}`);
 * await auction.waitForDeadline(bid.deadline);
 * ```
 */
export function createAuctionNamespace(
  config: CreateAuctionNamespaceConfig,
  txSender: TransactionSender
): AuctionNamespace {
  return new AuctionNamespace(config, txSender);
}
