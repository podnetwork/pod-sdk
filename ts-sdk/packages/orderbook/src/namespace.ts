/**
 * @module orderbook/namespace
 * @description Orderbook namespace for CLOB trading operations
 */

import {
  LoggerCategory,
  JsonRpcClient,
  DEFAULTS,
  type RpcTransportConfig,
  type Hash,
} from "@podnetwork/core";
import type { OrderBookBid } from "./bid.js";

/**
 * Signer interface for signing transactions.
 *
 * This is a minimal interface compatible with wallet implementations.
 */
export interface OrderbookSigner {
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
 * Pending orderbook transaction for tracking bid submission.
 */
export class PendingOrderbookTransaction {
  /** Transaction hash */
  readonly txHash: Hash;

  /**
   * Creates a new pending orderbook transaction.
   */
  constructor(txHash: Hash) {
    this.txHash = txHash;
  }
}

/**
 * CLOB precompile contract constants.
 * @internal
 */
const CLOB_PRECOMPILE = {
  address: "0x000000000000000000000000000000000000C10B" as const,
  // Function selectors
  // submitBid(uint8 side, uint256 volume, uint256 price, bytes32 clob_id, uint128 start_ts, uint128 ttl)
  submitBid: "0x9ff9eac5" as const,
};

/**
 * OrderbookNamespace provides methods for CLOB trading operations.
 *
 * Access via `client.orderbook`:
 * - submitBid: Submit a bid order to the CLOB
 *
 * Note: Orderbook state is only available via WebSocket subscription.
 * Use `client.ws.subscribeOrderbook()` for real-time orderbook updates.
 *
 * @example
 * ```typescript
 * const client = PodClient.dev();
 *
 * // Submit a bid
 * const bid = OrderBookBid.builder()
 *   .side('buy')
 *   .price(parsePod('1.5'))
 *   .volume(parsePod('10'))
 *   .orderbookId(orderbookId)
 *   .build();
 *
 * const pending = await client.orderbook.submitBid(bid, wallet);
 * console.log(`Bid placed: ${pending.txHash}`);
 * ```
 */
export class OrderbookNamespace extends JsonRpcClient {
  private readonly txSender: TransactionSender;

  /**
   * Creates a new OrderbookNamespace.
   *
   * @param config - Transport configuration
   * @param txSender - Transaction sender for submitting signed transactions
   */
  constructor(config: RpcTransportConfig, txSender: TransactionSender) {
    super(config, LoggerCategory.ORDERBOOK);
    this.txSender = txSender;
  }

  // ==========================================================================
  // Public Orderbook Methods
  // ==========================================================================

  /**
   * Submits a bid order to the CLOB.
   *
   * @param bid - The bid to submit
   * @param signer - Signer for the transaction
   * @returns Pending transaction for tracking
   *
   * @example
   * ```typescript
   * const bid = OrderBookBid.builder()
   *   .side('buy')
   *   .price(parsePod('1.5'))
   *   .volume(parsePod('10'))
   *   .orderbookId(orderbookId)
   *   .ttlSeconds(3600)
   *   .build();
   *
   * const pending = await client.orderbook.submitBid(bid, wallet);
   * console.log(`Bid submitted: ${pending.txHash}`);
   * ```
   */
  async submitBid(
    bid: OrderBookBid,
    signer: OrderbookSigner
  ): Promise<PendingOrderbookTransaction> {
    this.logger.info("Submitting orderbook bid", {
      orderbookId: bid.orderbookId,
      side: bid.side,
      price: bid.price.toString(),
      volume: bid.volume.toString(),
    });

    // Encode the submitBid call
    const calldata = this.encodeSubmitBid(bid);

    // Get signer address and prepare transaction
    const from = await signer.getAddress();
    const nonce = await this.txSender.getTransactionCount(from);
    const maxFeePerGas = await this.txSender.getGasPrice();
    const chainId = await this.txSender.getChainId();

    // Estimate gas
    let gas: bigint;
    try {
      gas = await this.txSender.estimateGas({
        to: CLOB_PRECOMPILE.address,
        data: calldata,
        value: 0n,
      });
      // Apply gas estimation buffer
      gas = (gas * BigInt(this.txSender.gasEstimationBuffer)) / 100n;
    } catch (_error) {
      // Default gas for orderbook operations
      gas = DEFAULTS.DEFAULT_FALLBACK_GAS_LIMIT;
      this.logger.warn("Gas estimation failed, using default", { gas: gas.toString() });
    }

    // Sign transaction
    const signedTx = await signer.signTransaction(
      {
        to: CLOB_PRECOMPILE.address,
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

    this.logger.info("Orderbook bid submitted", { txHash });

    return new PendingOrderbookTransaction(txHash);
  }

  // ==========================================================================
  // Encoding Helpers
  // ==========================================================================

  /**
   * Encodes a submitBid call.
   * @internal
   */
  private encodeSubmitBid(bid: OrderBookBid): string {
    // Function selector (4 bytes) + encoded params
    // submitBid(uint8 side, uint256 volume, uint256 price, bytes32 clob_id, uint128 start_ts, uint128 ttl)
    const selector = CLOB_PRECOMPILE.submitBid;

    // Encode side as uint8 (0 = buy, 1 = sell)
    const sideValue = bid.side === "buy" ? 0n : 1n;

    // Encode each parameter as 32-byte padded hex in the correct order
    const params = [
      sideValue.toString(16).padStart(64, "0"), // uint8 side
      bid.volume.toString(16).padStart(64, "0"), // uint256 volume
      bid.price.toString(16).padStart(64, "0"), // uint256 price
      bid.orderbookId.slice(2).padStart(64, "0"), // bytes32 clob_id
      bid.startTs.toString(16).padStart(64, "0"), // uint128 start_ts
      bid.ttl.toString(16).padStart(64, "0"), // uint128 ttl
    ];

    return selector + params.join("");
  }
}
