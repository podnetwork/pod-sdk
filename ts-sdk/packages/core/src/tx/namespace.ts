/**
 * @module tx/namespace
 * @description Transaction namespace for sending and managing transactions
 */

import { getLogger, LoggerCategory } from "../logging/index.js";
import type { RpcNamespace } from "../rpc/namespace.js";
import type { AddressLike } from "../types/address.js";
import type { Address } from "../types/address.js";
import type { Hash } from "../types/hash.js";
import type { Bytes } from "../types/bytes.js";
import type { TransactionRequest } from "../schemas/transaction.js";
import { TransactionRequestSchema } from "../schemas/transaction.js";
import { PendingTransaction } from "./pending.js";
import type { AnySigner } from "../types/signer.js";
import { isBroadcastingSigner } from "../types/signer.js";

const logger = getLogger(LoggerCategory.TX);

/**
 * Transaction ready for signing.
 *
 * All required fields are present (nonce, gas, EIP-1559 gas fields, chainId).
 * pod requires EIP-1559 (Type 2) transactions - legacy transactions are rejected.
 */
export interface SignableTransaction {
  /** Recipient address */
  to?: Address | undefined;
  /** Value in wei */
  value: bigint;
  /** Transaction data */
  data?: Bytes | undefined;
  /** Gas limit */
  gas: bigint;
  /** Maximum fee per gas (EIP-1559) - required for pod */
  maxFeePerGas: bigint;
  /** Maximum priority fee per gas (EIP-1559) - required for pod */
  maxPriorityFeePerGas: bigint;
  /** Sender's nonce */
  nonce: bigint;
}

/**
 * TxNamespace provides methods for sending and managing transactions.
 *
 * Access via `client.tx`:
 * - sendTransaction: Sign and send a transaction
 * - sendRawTransaction: Send a pre-signed transaction
 * - estimateGas: Estimate gas for a transaction
 *
 * @example
 * ```typescript
 * const client = PodClient.dev();
 *
 * // Send a simple transfer
 * const pending = await client.tx.sendTransaction(
 *   {
 *     to: recipientAddress,
 *     value: parsePod('1.0'),
 *   },
 *   wallet
 * );
 *
 * // Wait for confirmation
 * const receipt = await pending.waitForReceipt();
 * console.log(`Transaction ${receipt.status ? 'succeeded' : 'reverted'}`);
 * ```
 */
export class TxNamespace {
  /**
   * RPC namespace for making calls.
   * @internal
   */
  private readonly rpc: RpcNamespace;

  /**
   * Gas price fetcher function.
   * @internal
   */
  private readonly getGasPrice: () => Promise<bigint>;

  /**
   * Chain ID fetcher function.
   * @internal
   */
  private readonly getChainId: () => Promise<bigint>;

  /**
   * Gas estimation buffer as percentage (e.g., 120 = 20% buffer).
   * @internal
   */
  private readonly gasEstimationBuffer: number;

  /**
   * Creates a new TxNamespace.
   *
   * @param rpc - RPC namespace for making calls
   * @param getGasPrice - Function to get gas price
   * @param getChainId - Function to get chain ID
   * @param gasEstimationBuffer - Gas estimation buffer as percentage (default: 120)
   */
  constructor(
    rpc: RpcNamespace,
    getGasPrice: () => Promise<bigint>,
    getChainId: () => Promise<bigint>,
    gasEstimationBuffer = 120
  ) {
    this.rpc = rpc;
    this.getGasPrice = getGasPrice;
    this.getChainId = getChainId;
    this.gasEstimationBuffer = gasEstimationBuffer;
  }

  /**
   * Sends a transaction signed by the provided signer.
   *
   * This method:
   * 1. Fills in missing fields (nonce, gas, gasPrice)
   * 2. Signs the transaction with the signer
   * 3. Sends the signed transaction to the network
   * 4. Returns a PendingTransaction for tracking
   *
   * @param request - Transaction request
   * @param signer - Signer to sign the transaction
   * @returns PendingTransaction for tracking confirmation
   *
   * @example
   * ```typescript
   * // Simple transfer
   * const pending = await client.tx.sendTransaction(
   *   {
   *     to: recipientAddress,
   *     value: parsePod('1.0'),
   *   },
   *   wallet
   * );
   *
   * // With custom gas
   * const pending = await client.tx.sendTransaction(
   *   {
   *     to: contractAddress,
   *     data: calldata,
   *     gas: 100_000n,
   *     gasPrice: parseGwei('10'),
   *   },
   *   wallet
   * );
   *
   * // Wait for confirmation
   * const receipt = await pending.waitForReceipt();
   * ```
   */
  async sendTransaction(
    request: TransactionRequest,
    signer: AnySigner
  ): Promise<PendingTransaction> {
    // Validate request
    const validated = TransactionRequestSchema.parse(request);

    // Get signer address
    const from = await signer.getAddress();

    logger.info("Preparing transaction", {
      from,
      to: validated.to,
      value: validated.value?.toString(),
    });

    // Get chain ID
    const chainId = await this.getChainId();

    // Check if signer can broadcast directly (e.g., browser wallet)
    // Broadcasting signers handle gas estimation and nonce management themselves
    if (isBroadcastingSigner(signer)) {
      logger.debug("Using broadcasting signer (eth_sendTransaction)", { from });

      // Browser wallets handle gas/nonce, so we send the minimal request
      const txHash = await signer.sendTransaction(validated, chainId);

      logger.info("Transaction sent via broadcasting signer", { txHash });

      return new PendingTransaction(txHash, async (hash: Hash) =>
        this.rpc.getTransactionReceipt(hash)
      );
    }

    // Standard flow: fill transaction, sign locally, broadcast via sendRawTransaction
    const filledTx = await this.fillTransaction(validated, from);

    logger.debug("Transaction filled", {
      nonce: filledTx.nonce.toString(),
      gas: filledTx.gas.toString(),
      maxFeePerGas: filledTx.maxFeePerGas.toString(),
      maxPriorityFeePerGas: filledTx.maxPriorityFeePerGas.toString(),
      chainId: chainId.toString(),
    });

    // Sign the transaction
    const signedTx = await signer.signTransaction(filledTx, chainId);

    logger.debug("Transaction signed", {
      signedTxLength: signedTx.length,
    });

    // Send the signed transaction
    return this.sendRawTransaction(signedTx);
  }

  /**
   * Sends a raw signed transaction to the network.
   *
   * @param signedTx - Signed transaction as hex string
   * @returns PendingTransaction for tracking confirmation
   *
   * @example
   * ```typescript
   * // Send a pre-signed transaction
   * const pending = await client.tx.sendRawTransaction(signedTxHex);
   * const receipt = await pending.waitForReceipt();
   * ```
   */
  async sendRawTransaction(signedTx: string): Promise<PendingTransaction> {
    logger.info("Sending raw transaction");

    // Send via RPC
    const txHash = await this.rpc.sendRawTransaction(signedTx);

    logger.info("Transaction sent", { txHash });

    // Return pending transaction for tracking
    return new PendingTransaction(txHash, async (hash: Hash) =>
      this.rpc.getTransactionReceipt(hash)
    );
  }

  /**
   * Estimates the gas required for a transaction.
   *
   * @param request - Transaction request
   * @returns Estimated gas amount
   *
   * @example
   * ```typescript
   * const gas = await client.tx.estimateGas({
   *   to: recipientAddress,
   *   value: parsePod('1.0'),
   * });
   * console.log(`Estimated gas: ${gas}`);
   * ```
   */
  async estimateGas(request: TransactionRequest): Promise<bigint> {
    const validated = TransactionRequestSchema.parse(request);
    return this.rpc.estimateGas(validated);
  }

  /**
   * Gets the transaction count (nonce) for an address.
   *
   * @param address - The address to query
   * @returns Current nonce
   */
  async getTransactionCount(address: AddressLike): Promise<bigint> {
    return this.rpc.getTransactionCount(address);
  }

  /**
   * Fills in missing transaction fields.
   *
   * @internal
   * @param tx - Partial transaction request
   * @param from - Sender address
   * @returns Complete transaction ready for signing
   */
  private async fillTransaction(
    tx: TransactionRequest,
    from: Address
  ): Promise<SignableTransaction> {
    // Get nonce if not provided
    const nonce = tx.nonce ?? (await this.rpc.getTransactionCount(from));

    // Estimate gas if not provided
    let gas = tx.gas;
    if (gas === undefined) {
      gas = await this.estimateGas(tx);
      // Apply gas estimation buffer (e.g., 120 = 20% buffer)
      gas = (gas * BigInt(this.gasEstimationBuffer)) / 100n;
    }

    // Get EIP-1559 gas fields.
    // pod REQUIRES EIP-1559 (Type 2) transactions - legacy transactions are rejected.
    // While pod doesn't use EIP-1559's dynamic fee economics (baseFeePerGas is always 0),
    // it requires the EIP-1559 transaction format with maxFeePerGas and maxPriorityFeePerGas.
    // Default values are 1 wei for both fields, matching the Rust SDK behavior.
    const maxFeePerGas = tx.maxFeePerGas ?? (await this.getGasPrice());

    // maxPriorityFeePerGas defaults to same as maxFeePerGas if not provided
    // On pod, this is typically 0 or 1 wei since there's no priority fee mechanism
    const maxPriorityFeePerGas = tx.maxPriorityFeePerGas ?? 0n;

    return {
      to: tx.to,
      value: tx.value ?? 0n,
      data: tx.data,
      gas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce,
    };
  }
}
