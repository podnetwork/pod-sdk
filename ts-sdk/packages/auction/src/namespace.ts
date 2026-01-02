/**
 * @module auction/namespace
 * @description Auction namespace for optimistic auction operations
 */

import {
  LoggerCategory,
  PRECOMPILES,
  DEFAULTS,
  JsonRpcClient,
  type RpcTransportConfig,
  type Hash,
} from "@podnetwork/core";
import type { AuctionBid } from "./bid.js";
import { PodAuctionError } from "./auction-error.js";

// Re-export error types
export { PodAuctionError, type PodAuctionErrorCode } from "./auction-error.js";

/**
 * Signer interface for signing transactions.
 *
 * This is a minimal interface compatible with wallet implementations.
 */
export interface AuctionSigner {
  /**
   * Gets the signer's address.
   */
  getAddress(): Promise<`0x${string}`>;

  /**
   * Signs a transaction and returns the signed transaction hex.
   */
  signTransaction(
    tx: {
      to?: `0x${string}` | undefined;
      value: bigint;
      data?: string | undefined;
      gas: bigint;
      maxFeePerGas: bigint;
      maxPriorityFeePerGas: bigint;
      nonce: bigint;
    },
    chainId: bigint
  ): Promise<string>;
}

/**
 * Transaction sender interface for submitting signed transactions.
 * @internal
 */
export interface TransactionSender {
  sendRawTransaction(signedTx: string): Promise<Hash>;
  getTransactionCount(address: `0x${string}`): Promise<bigint>;
  estimateGas(tx: { to?: `0x${string}`; data?: string; value?: bigint }): Promise<bigint>;
  getGasPrice(): Promise<bigint>;
  getChainId(): Promise<bigint>;
  readonly gasEstimationBuffer: number;
}

/**
 * Maximum safe timeout value for setTimeout (2^31 - 1 ms ≈ 24.8 days).
 * Used to chunk long waits in waitForDeadline.
 * @internal
 */
const MAX_SAFE_TIMEOUT = 2_147_483_647;

/**
 * Options for waitForDeadline behavior.
 */
export interface WaitForDeadlineOptions {
  /**
   * Use Past Perfection Time (PPT) for deadline waiting.
   *
   * When true, waits for the network's PPT to reach the deadline by calling
   * `pod_waitPastPerfectTime`. This provides stronger timing guarantees as all
   * nodes will agree on when the deadline has passed.
   *
   * When false (default), uses local time which is faster but may have small
   * timing discrepancies between nodes.
   *
   * @default false
   */
  usePPT?: boolean;

  /**
   * Polling interval for local time waiting (ignored when usePPT is true).
   * @default 1000
   */
  pollIntervalMs?: number;

  /**
   * Maximum wait time in milliseconds (ignored when usePPT is true).
   * @default 3600000 (1 hour)
   */
  timeoutMs?: number;
}

/**
 * Pending auction transaction for tracking bid submissions.
 */
export class PendingAuctionTransaction {
  /** Transaction hash */
  readonly txHash: Hash;

  /**
   * Creates a new pending auction transaction.
   */
  constructor(txHash: Hash) {
    this.txHash = txHash;
  }
}

/**
 * AuctionNamespace provides methods for optimistic auction operations.
 *
 * Access via `client.auction`:
 * - submitBid: Submit an auction bid
 * - waitForDeadline: Wait for a deadline to pass
 *
 * Note: Auction state is only available via WebSocket subscription.
 * Use `client.ws.subscribeAuction()` for real-time auction updates.
 *
 * @example
 * ```typescript
 * const client = PodClient.dev();
 *
 * // Submit a bid
 * const bid = AuctionBid.builder()
 *   .amount(parsePod('1.5'))
 *   .deadlineMinutes(30)
 *   .build();
 *
 * const pending = await client.auction.submitBid(auctionId, bid, wallet);
 * console.log(`Bid submitted: ${pending.txHash}`);
 *
 * // Wait for deadline
 * await client.auction.waitForDeadline(bid.deadline);
 * ```
 */
export class AuctionNamespace extends JsonRpcClient {
  private readonly txSender: TransactionSender;

  /**
   * Creates a new AuctionNamespace.
   *
   * @param config - Transport configuration
   * @param txSender - Transaction sender for submitting signed transactions
   */
  constructor(config: RpcTransportConfig, txSender: TransactionSender) {
    super(config, LoggerCategory.AUCTION);
    this.txSender = txSender;
  }

  // ==========================================================================
  // Public Auction Methods
  // ==========================================================================

  /**
   * Submits a bid to an auction.
   *
   * The bid amount (value) is encoded as a parameter in the contract call,
   * not sent as the transaction's msg.value.
   *
   * @param auctionId - The auction identifier (must be non-negative)
   * @param bid - The bid to submit
   * @param signer - Signer for the transaction
   * @returns Pending transaction for tracking
   * @throws {Error} If auctionId is negative
   *
   * @example
   * ```typescript
   * const bid = AuctionBid.builder()
   *   .amount(parsePod('1.5'))
   *   .deadlineMinutes(30)
   *   .build();
   *
   * const pending = await client.auction.submitBid(auctionId, bid, wallet);
   * console.log(`Bid submitted: ${pending.txHash}`);
   * ```
   */
  async submitBid(
    auctionId: bigint,
    bid: AuctionBid,
    signer: AuctionSigner
  ): Promise<PendingAuctionTransaction> {
    // Validate auctionId is non-negative
    if (auctionId < 0n) {
      throw new Error(`Invalid auctionId: ${String(auctionId)}. Auction ID must be non-negative.`);
    }

    this.logger.info("Submitting auction bid", {
      auctionId: auctionId.toString(),
      amount: bid.amount.toString(),
      deadline: bid.deadline.toString(),
    });

    // Encode the submitBid call (value is encoded in calldata, not msg.value)
    const calldata = this.encodeSubmitBid(auctionId, bid);

    // Get signer address and prepare transaction
    const from = await signer.getAddress();
    const nonce = await this.txSender.getTransactionCount(from);
    const maxFeePerGas = await this.txSender.getGasPrice();
    const chainId = await this.txSender.getChainId();

    // Estimate gas (value is 0 since amount is in calldata)
    let gas: bigint;
    try {
      gas = await this.txSender.estimateGas({
        to: PRECOMPILES.OPTIMISTIC_AUCTION,
        data: calldata,
        value: 0n,
      });
      // Apply gas estimation buffer
      gas = (gas * BigInt(this.txSender.gasEstimationBuffer)) / 100n;
    } catch (_error) {
      // Default gas for auction operations
      gas = DEFAULTS.DEFAULT_FALLBACK_GAS_LIMIT;
      this.logger.warn("Gas estimation failed, using default", { gas: gas.toString() });
    }

    // Sign transaction (value is 0 since amount is encoded in calldata)
    const signedTx = await signer.signTransaction(
      {
        to: PRECOMPILES.OPTIMISTIC_AUCTION,
        value: 0n,
        data: calldata,
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas: 0n,
        nonce,
      },
      chainId
    );

    // Send transaction
    const txHash = await this.txSender.sendRawTransaction(signedTx);

    this.logger.info("Auction bid submitted", { txHash });

    return new PendingAuctionTransaction(txHash);
  }

  /**
   * Waits until a deadline time has passed.
   *
   * This matches the Rust SDK's `wait_for_auction_end` behavior which simply
   * waits until the specified deadline time has passed.
   *
   * Supports two modes:
   * - **Local time** (default): Uses local system time polling. Faster but may
   *   have small timing discrepancies between nodes.
   * - **PPT mode** (`usePPT: true`): Uses the network's Past Perfection Time.
   *   Provides stronger timing guarantees as all nodes agree on when the
   *   deadline has passed. Recommended for production auction scenarios.
   *
   * @param deadline - The deadline timestamp in microseconds since epoch
   * @param options - Wait options (usePPT, pollIntervalMs, timeoutMs)
   * @throws {PodAuctionError} If timeout is exceeded (local mode only)
   *
   * @example
   * ```typescript
   * // Wait using local time (default)
   * await client.auction.waitForDeadline(bid.deadline);
   *
   * // Wait using PPT for stronger timing guarantees
   * await client.auction.waitForDeadline(bid.deadline, { usePPT: true });
   * ```
   */
  async waitForDeadline(deadline: bigint, options?: WaitForDeadlineOptions): Promise<void> {
    const usePPT = options?.usePPT ?? false;
    const pollIntervalMs = options?.pollIntervalMs ?? 1000;
    const timeoutMs = options?.timeoutMs ?? 3600000;

    this.logger.info("Waiting for deadline to pass", {
      deadline: deadline.toString(),
      usePPT,
      pollIntervalMs: usePPT ? undefined : pollIntervalMs,
      timeoutMs: usePPT ? undefined : timeoutMs,
    });

    // Use PPT-based waiting if requested
    if (usePPT) {
      await this.waitPastPerfectTime(deadline);
      this.logger.info("PPT reached deadline", { deadline: deadline.toString() });
      return;
    }

    // Local time-based waiting
    const startTime = Date.now();

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- intentional infinite loop until deadline passes
    while (true) {
      // Get current time in microseconds
      const nowMicroseconds = BigInt(Date.now()) * 1000n;

      if (nowMicroseconds >= deadline) {
        this.logger.info("Deadline passed", {
          deadline: deadline.toString(),
          now: nowMicroseconds.toString(),
        });
        return;
      }

      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeoutMs) {
        // Include deadline in timeout error
        throw PodAuctionError.timeout(deadline);
      }

      // Calculate optimal sleep time - don't wait longer than time remaining
      // Cap to MAX_SAFE_TIMEOUT to avoid setTimeout overflow
      const remainingMicros = deadline - nowMicroseconds;
      const remainingMs =
        remainingMicros > BigInt(MAX_SAFE_TIMEOUT * 1000)
          ? MAX_SAFE_TIMEOUT
          : Number(remainingMicros / 1000n);
      const sleepTime = Math.min(pollIntervalMs, remainingMs + 100, MAX_SAFE_TIMEOUT);

      this.logger.debug("Deadline not yet passed, waiting", {
        deadline: deadline.toString(),
        remaining: remainingMs,
        sleepTime,
      });

      await this.sleep(sleepTime);
    }
  }

  /**
   * Waits for the network's Past Perfection Time to reach the target timestamp.
   *
   * @param targetTimestamp - Target timestamp in microseconds
   * @internal
   */
  private async waitPastPerfectTime(targetTimestamp: bigint): Promise<void> {
    await this.request<null>("pod_waitPastPerfectTime", [Number(targetTimestamp)]);
  }

  // ==========================================================================
  // Encoding Helpers
  // ==========================================================================

  /**
   * Encodes a submitBid call for the optimistic auction contract.
   *
   * Function signature: submitBid(uint256 auction_id, uint128 deadline, uint256 value, bytes data)
   * @internal
   */
  private encodeSubmitBid(auctionId: bigint, bid: AuctionBid): string {
    // Function selector for submitBid(uint256,uint128,uint256,bytes)
    // keccak256("submitBid(uint256,uint128,uint256,bytes)")[:4] = 0x9ff9eac5
    const selector = "0x9ff9eac5";

    // Encode parameters (all padded to 32 bytes per ABI spec)
    // auction_id: uint256 (32 bytes)
    // deadline: uint128 (32 bytes, left-padded)
    // value: uint256 (32 bytes)
    // data: bytes (dynamic - offset + length + padded data)
    const auctionIdHex = auctionId.toString(16).padStart(64, "0");
    const deadlineHex = bid.deadline.toString(16).padStart(64, "0");
    const valueHex = bid.amount.toString(16).padStart(64, "0");

    // Offset to data (4 * 32 = 128 bytes = 0x80)
    const dataOffset = "0000000000000000000000000000000000000000000000000000000000000080";

    // Data encoding
    const dataBytes = bid.data.slice(2); // Remove 0x prefix
    const dataLength = (dataBytes.length / 2).toString(16).padStart(64, "0");
    const dataPadded = dataBytes.padEnd(Math.ceil(dataBytes.length / 64) * 64, "0");

    return selector + auctionIdHex + deadlineHex + valueHex + dataOffset + dataLength + dataPadded;
  }
}
