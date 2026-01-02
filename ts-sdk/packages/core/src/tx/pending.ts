/**
 * @module tx/pending
 * @description PendingTransaction class for tracking submitted transactions
 */

import { getLogger, LoggerCategory } from "../logging/index.js";
import { PodExecutionError } from "../errors/execution.js";
import type { Hash } from "../types/hash.js";
import type { TransactionReceipt } from "../schemas/receipt.js";
import {
  type PollingConfig,
  DEFAULT_POLLING_CONFIG,
  DEFAULT_TIMEOUT,
  calculatePollingDelay,
  resolvePollingConfig,
} from "./polling.js";

const logger = getLogger(LoggerCategory.TX);

/**
 * Function type for fetching a transaction receipt.
 * @internal
 */
export type ReceiptFetcher = (hash: Hash) => Promise<TransactionReceipt | undefined>;

/**
 * Handle for tracking a submitted transaction.
 *
 * PendingTransaction provides methods to wait for confirmation or
 * check the current status without blocking. Uses exponential backoff
 * with jitter for efficient polling.
 *
 * @example
 * ```typescript
 * // Submit transaction and wait for receipt
 * const pending = await client.tx.sendTransaction(request, wallet);
 * const receipt = await pending.waitForReceipt();
 *
 * // With custom timeout
 * const receipt = await pending
 *   .withTimeout(60_000)
 *   .waitForReceipt();
 *
 * // Check without blocking
 * const maybeReceipt = await pending.tryGetReceipt();
 * if (maybeReceipt) {
 *   console.log('Transaction confirmed!');
 * }
 * ```
 */
export class PendingTransaction {
  /**
   * The transaction hash.
   */
  readonly txHash: Hash;

  /**
   * Receipt fetcher function.
   * @internal
   */
  private readonly fetchReceipt: ReceiptFetcher;

  /**
   * Timeout in milliseconds.
   * @internal
   */
  private timeout: number = DEFAULT_TIMEOUT;

  /**
   * Polling configuration.
   * @internal
   */
  private pollingConfig: PollingConfig = DEFAULT_POLLING_CONFIG;

  /**
   * Whether we should wait for Pod confirmation.
   * @internal
   */
  private waitForConfirmation = true;

  /**
   * Creates a new PendingTransaction.
   *
   * @param txHash - The transaction hash
   * @param fetchReceipt - Function to fetch the receipt
   *
   * @example
   * ```typescript
   * const pending = new PendingTransaction(
   *   txHash,
   *   (hash) => client.rpc.getTransactionReceipt(hash)
   * );
   * ```
   */
  constructor(txHash: Hash, fetchReceipt: ReceiptFetcher) {
    this.txHash = txHash;
    this.fetchReceipt = fetchReceipt;

    logger.info("PendingTransaction created", { txHash });
  }

  /**
   * Creates a new PendingTransaction with a custom timeout.
   *
   * @param ms - Timeout in milliseconds
   * @returns New PendingTransaction with updated timeout
   *
   * @example
   * ```typescript
   * const receipt = await pending
   *   .withTimeout(60_000)
   *   .waitForReceipt();
   * ```
   */
  withTimeout(ms: number): PendingTransaction {
    if (ms <= 0) {
      throw new Error("Timeout must be positive");
    }

    const newPending = new PendingTransaction(this.txHash, this.fetchReceipt);
    newPending.timeout = ms;
    newPending.pollingConfig = this.pollingConfig;
    newPending.waitForConfirmation = this.waitForConfirmation;
    return newPending;
  }

  /**
   * Creates a new PendingTransaction with custom polling configuration.
   *
   * @param config - Partial polling configuration
   * @returns New PendingTransaction with updated config
   *
   * @example
   * ```typescript
   * const receipt = await pending
   *   .withPollingConfig({ maxAttempts: 20 })
   *   .waitForReceipt();
   * ```
   */
  withPollingConfig(config: Partial<PollingConfig>): PendingTransaction {
    const newPending = new PendingTransaction(this.txHash, this.fetchReceipt);
    newPending.timeout = this.timeout;
    newPending.pollingConfig = resolvePollingConfig(config);
    newPending.waitForConfirmation = this.waitForConfirmation;
    return newPending;
  }

  /**
   * Creates a new PendingTransaction that returns receipt without waiting
   * for Pod confirmation (just receipt presence).
   *
   * @returns New PendingTransaction that doesn't wait for confirmation
   *
   * @example
   * ```typescript
   * // Return receipt as soon as it exists, even if not confirmed
   * const receipt = await pending
   *   .withoutConfirmation()
   *   .waitForReceipt();
   * ```
   */
  withoutConfirmation(): PendingTransaction {
    const newPending = new PendingTransaction(this.txHash, this.fetchReceipt);
    newPending.timeout = this.timeout;
    newPending.pollingConfig = this.pollingConfig;
    newPending.waitForConfirmation = false;
    return newPending;
  }

  /**
   * Blocks until the transaction is confirmed or times out.
   *
   * Uses exponential backoff with jitter to poll for the receipt.
   * By default, waits for pod attestation (at least one validator signature).
   *
   * @returns Promise resolving to the transaction receipt
   * @throws {TransactionError} If timeout or max attempts exceeded
   *
   * @example
   * ```typescript
   * try {
   *   const receipt = await pending.waitForReceipt();
   *   console.log(`Transaction ${receipt.status ? 'succeeded' : 'reverted'}`);
   * } catch (error) {
   *   if (error instanceof TransactionError) {
   *     if (error.code === 'CONFIRMATION_TIMEOUT') {
   *       console.log('Transaction not confirmed in time');
   *     }
   *   }
   * }
   * ```
   */
  async waitForReceipt(): Promise<TransactionReceipt> {
    const startTime = Date.now();
    let attempt = 0;

    logger.info("Waiting for receipt", {
      txHash: this.txHash,
      timeout: this.timeout,
      maxAttempts: this.pollingConfig.maxAttempts,
      waitForConfirmation: this.waitForConfirmation,
    });

    while (attempt < this.pollingConfig.maxAttempts) {
      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > this.timeout) {
        logger.warn("Confirmation timeout", {
          txHash: this.txHash,
          elapsed,
          timeout: this.timeout,
          attempts: attempt,
        });
        throw PodExecutionError.confirmationTimeout(this.txHash, this.timeout, attempt);
      }

      // Try to get receipt
      const receipt = await this.tryGetReceipt();

      if (receipt !== undefined) {
        // If we need confirmation, check for attestations
        const hasAttestations = receipt.podMetadata.signatureCount > 0;
        if (this.waitForConfirmation && !hasAttestations) {
          logger.debug("Receipt found but not attested, continuing polling", {
            txHash: this.txHash,
            attempt,
            signatureCount: receipt.podMetadata.signatureCount,
          });
        } else {
          // Receipt found (and attested if required)
          logger.info("Receipt confirmed", {
            txHash: this.txHash,
            status: receipt.status,
            gasUsed: receipt.gasUsed.toString(),
            signatureCount: receipt.podMetadata.signatureCount,
            attempts: attempt,
            elapsed,
          });
          return receipt;
        }
      } else {
        logger.debug("No receipt yet", {
          txHash: this.txHash,
          attempt,
        });
      }

      // Calculate delay with jitter
      const delay = calculatePollingDelay(attempt, this.pollingConfig);

      // Sleep before next attempt
      await this.sleep(delay);
      attempt++;
    }

    // Max attempts exceeded
    logger.warn("Polling timeout", {
      txHash: this.txHash,
      attempts: attempt,
    });
    throw PodExecutionError.pollingTimeout(this.txHash, this.pollingConfig.maxAttempts);
  }

  /**
   * Attempts to get the receipt without blocking.
   *
   * Returns undefined if the receipt is not yet available.
   * Does not check for Pod confirmation.
   *
   * @returns Promise resolving to receipt or undefined
   *
   * @example
   * ```typescript
   * const receipt = await pending.tryGetReceipt();
   * if (receipt) {
   *   console.log(`Found receipt with status: ${receipt.status}`);
   * } else {
   *   console.log('Receipt not available yet');
   * }
   * ```
   */
  async tryGetReceipt(): Promise<TransactionReceipt | undefined> {
    return this.fetchReceipt(this.txHash);
  }

  /**
   * Gets the current timeout in milliseconds.
   */
  getTimeout(): number {
    return this.timeout;
  }

  /**
   * Gets the current polling configuration.
   */
  getPollingConfig(): Readonly<PollingConfig> {
    return this.pollingConfig;
  }

  /**
   * Sleep helper.
   * @internal
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
