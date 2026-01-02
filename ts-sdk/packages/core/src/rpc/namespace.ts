/**
 * @module rpc/namespace
 * @description RPC namespace for blockchain query operations
 */

import { LoggerCategory } from "../logging/index.js";
import type { AddressLike } from "../types/address.js";
import { AddressSchema } from "../types/address.js";
import type { Hash, HashLike } from "../types/hash.js";
import { HashSchema } from "../types/hash.js";
import type { Bytes } from "../types/bytes.js";
import { BytesSchema } from "../types/bytes.js";
import type { BlockNumberLike } from "../types/block-number.js";
import { normalizeBlockNumber } from "../types/block-number.js";
import { parseBigInt, toHex } from "../types/bigint.js";
import type { Block } from "../schemas/block.js";
import { BlockOrNullSchema } from "../schemas/block.js";
import type { TransactionRequest } from "../schemas/transaction.js";
import { TransactionRequestSchema } from "../schemas/transaction.js";
import type { TransactionReceipt } from "../schemas/receipt.js";
import { TransactionReceiptOrNullSchema } from "../schemas/receipt.js";
import type { Committee } from "../schemas/committee.js";
import { CommitteeSchema } from "../schemas/committee.js";
import type { VoteBatch } from "../schemas/vote-batch.js";
import { VoteBatchArraySchema } from "../schemas/vote-batch.js";
import { JsonRpcClient, type RpcTransportConfig } from "./client.js";

/**
 * RpcNamespace provides methods for querying Pod blockchain state.
 *
 * Access via `client.rpc`:
 * - getBalance: Get account balance
 * - getBlockNumber: Get latest block number
 * - getBlockByNumber: Get block by number or tag
 * - getTransactionReceipt: Get transaction receipt with Pod metadata
 * - getTransactionCount: Get account nonce
 * - call: Execute read-only contract call
 * - estimateGas: Estimate gas for a transaction
 * - getGasPrice: Get current gas price
 * - getChainId: Get chain ID
 * - getCommittee: Get validator committee
 * - getVoteBatches: Get vote batches from validators
 *
 * @example
 * ```typescript
 * const client = PodClient.dev();
 *
 * // Get balance
 * const balance = await client.rpc.getBalance(address);
 * console.log(`Balance: ${formatPod(balance)} POD`);
 *
 * // Get latest block number
 * const blockNumber = await client.rpc.getBlockNumber();
 *
 * // Get transaction receipt with pod attestations
 * const receipt = await client.rpc.getTransactionReceipt(txHash);
 * if (receipt?.podMetadata.signatureCount > 0) {
 *   console.log('Transaction attested by validators!');
 * }
 * ```
 */
export class RpcNamespace extends JsonRpcClient {
  constructor(config: RpcTransportConfig) {
    super(config, LoggerCategory.RPC);
  }

  /**
   * Builds an RPC-compatible transaction object.
   * @internal
   */
  private buildRpcTransactionObject(tx: TransactionRequest): {
    to?: string;
    data?: string;
    value?: string;
    gas?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    nonce?: string;
  } {
    const result: {
      to?: string;
      data?: string;
      value?: string;
      gas?: string;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
      nonce?: string;
    } = {};

    if (tx.to !== undefined) result.to = tx.to;
    if (tx.data !== undefined) result.data = tx.data;
    if (tx.value !== undefined) result.value = toHex(tx.value);
    if (tx.gas !== undefined) result.gas = toHex(tx.gas);
    if (tx.maxFeePerGas !== undefined) result.maxFeePerGas = toHex(tx.maxFeePerGas);
    if (tx.maxPriorityFeePerGas !== undefined) {
      result.maxPriorityFeePerGas = toHex(tx.maxPriorityFeePerGas);
    }
    if (tx.nonce !== undefined) result.nonce = toHex(tx.nonce);

    return result;
  }

  // ==========================================================================
  // Public RPC Methods
  // ==========================================================================

  /**
   * Gets the balance of an address in wei.
   *
   * @param address - The address to query
   * @param block - Block number or tag (default: 'latest')
   * @returns Balance in wei
   *
   * @example
   * ```typescript
   * const balance = await client.rpc.getBalance(address);
   * console.log(`Balance: ${formatPod(balance)} POD`);
   * ```
   */
  async getBalance(address: AddressLike, block: BlockNumberLike = "latest"): Promise<bigint> {
    const normalizedAddress = AddressSchema.parse(address);
    const normalizedBlock = normalizeBlockNumber(block);

    const result = await this.request<string>("eth_getBalance", [
      normalizedAddress,
      normalizedBlock,
    ]);

    return parseBigInt(result);
  }

  /**
   * Gets the latest block number.
   *
   * @returns Latest block number
   *
   * @example
   * ```typescript
   * const blockNumber = await client.rpc.getBlockNumber();
   * console.log(`Latest block: ${blockNumber}`);
   * ```
   */
  async getBlockNumber(): Promise<bigint> {
    const result = await this.request<string>("eth_blockNumber", []);
    return parseBigInt(result);
  }

  /**
   * Gets a block by number or tag.
   *
   * @param block - Block number or tag ('latest', 'earliest', 'pending', 'safe', 'finalized')
   * @param fullTransactions - Include full transaction objects (default: false)
   * @returns Block or undefined if not found
   *
   * @example
   * ```typescript
   * const latest = await client.rpc.getBlockByNumber('latest');
   * const block100 = await client.rpc.getBlockByNumber(100n);
   * ```
   */
  async getBlockByNumber(
    block: BlockNumberLike = "latest",
    fullTransactions = false
  ): Promise<Block | undefined> {
    const normalizedBlock = normalizeBlockNumber(block);

    const result = await this.request<unknown>("eth_getBlockByNumber", [
      normalizedBlock,
      fullTransactions,
    ]);

    const parsed = BlockOrNullSchema.parse(result);
    return parsed ?? undefined;
  }

  /**
   * Gets a transaction receipt with Pod attestation metadata.
   *
   * @param hash - Transaction hash
   * @returns Receipt with Pod metadata or undefined if not found
   *
   * @example
   * ```typescript
   * const receipt = await client.rpc.getTransactionReceipt(txHash);
   * if (receipt) {
   *   console.log(`Status: ${receipt.status ? 'success' : 'reverted'}`);
   *   console.log(`Signatures: ${receipt.podMetadata.signatureCount}`);
   *   console.log(`Committee epoch: ${receipt.podMetadata.attestedTx.committeeEpoch}`);
   * }
   * ```
   */
  async getTransactionReceipt(hash: HashLike): Promise<TransactionReceipt | undefined> {
    const normalizedHash = HashSchema.parse(hash);

    const result = await this.request<unknown>("eth_getTransactionReceipt", [normalizedHash]);

    const parsed = TransactionReceiptOrNullSchema.parse(result);
    return parsed ?? undefined;
  }

  /**
   * Gets the transaction count (nonce) for an address.
   *
   * @param address - The address to query
   * @param block - Block number or tag (default: 'latest')
   * @returns Transaction count
   *
   * @example
   * ```typescript
   * const nonce = await client.rpc.getTransactionCount(address);
   * console.log(`Next nonce: ${nonce}`);
   * ```
   */
  async getTransactionCount(
    address: AddressLike,
    block: BlockNumberLike = "latest"
  ): Promise<bigint> {
    const normalizedAddress = AddressSchema.parse(address);
    const normalizedBlock = normalizeBlockNumber(block);

    const result = await this.request<string>("eth_getTransactionCount", [
      normalizedAddress,
      normalizedBlock,
    ]);

    return parseBigInt(result);
  }

  /**
   * Executes a read-only contract call.
   *
   * @param tx - Transaction request (must include 'to' for contract address)
   * @param block - Block number or tag (default: 'latest')
   * @returns Hex-encoded return data
   *
   * @example
   * ```typescript
   * const result = await client.rpc.call({
   *   to: contractAddress,
   *   data: encodedFunctionCall,
   * });
   * ```
   */
  async call(tx: TransactionRequest, block: BlockNumberLike = "latest"): Promise<Bytes> {
    const validatedTx = TransactionRequestSchema.parse(tx);
    const normalizedBlock = normalizeBlockNumber(block);

    const rpcTx = this.buildRpcTransactionObject(validatedTx);
    const result = await this.request<string>("eth_call", [rpcTx, normalizedBlock]);

    return BytesSchema.parse(result);
  }

  /**
   * Gets the current gas price.
   *
   * @returns Gas price in wei
   *
   * @example
   * ```typescript
   * const gasPrice = await client.rpc.getGasPrice();
   * console.log(`Gas price: ${formatGwei(gasPrice)} Gwei`);
   * ```
   */
  async getGasPrice(): Promise<bigint> {
    const result = await this.request<string>("eth_gasPrice", []);
    return parseBigInt(result);
  }

  /**
   * Gets the chain ID.
   *
   * @returns Chain ID
   *
   * @example
   * ```typescript
   * const chainId = await client.rpc.getChainId();
   * console.log(`Chain ID: ${chainId}`);
   * ```
   */
  async getChainId(): Promise<bigint> {
    const result = await this.request<string>("eth_chainId", []);
    return parseBigInt(result);
  }

  /**
   * Estimates the gas required for a transaction.
   *
   * @param tx - Transaction request
   * @returns Estimated gas amount
   *
   * @example
   * ```typescript
   * const gas = await client.rpc.estimateGas({
   *   to: recipient,
   *   value: parsePod('1.0'),
   * });
   * ```
   */
  async estimateGas(tx: TransactionRequest): Promise<bigint> {
    const validatedTx = TransactionRequestSchema.parse(tx);
    const rpcTx = this.buildRpcTransactionObject(validatedTx);
    const result = await this.request<string>("eth_estimateGas", [rpcTx]);
    // Node may return hex without 0x prefix, handle both cases
    const hexValue = result.startsWith("0x") ? result : `0x${result}`;
    return parseBigInt(hexValue);
  }

  /**
   * Sends a raw signed transaction.
   *
   * @param signedTx - Signed transaction hex string
   * @returns Transaction hash
   *
   * @example
   * ```typescript
   * const txHash = await client.rpc.sendRawTransaction(signedTxHex);
   * ```
   */
  async sendRawTransaction(signedTx: string): Promise<Hash> {
    const result = await this.request<string>("eth_sendRawTransaction", [signedTx]);
    return HashSchema.parse(result);
  }

  /**
   * Gets the current committee snapshot.
   *
   * Returns the committee of validators responsible for attesting transactions,
   * including their public keys, derived Ethereum addresses, and quorum sizes.
   *
   * @returns Committee with validators and quorum information
   *
   * @example
   * ```typescript
   * const committee = await client.rpc.getCommittee();
   * console.log(`Quorum size: ${committee.quorumSize}`);
   * console.log(`Total validators: ${committee.validators.length}`);
   *
   * for (const validator of committee.validators) {
   *   console.log(`Validator ${validator.index}: ${validator.address}`);
   * }
   * ```
   */
  async getCommittee(): Promise<Committee> {
    const result = await this.request<unknown>("pod_getCommittee", []);
    return CommitteeSchema.parse(result);
  }

  /**
   * Gets vote batches from validators within a sequence range.
   *
   * Returns vote batches from validators, useful for syncing vote history
   * and verifying validator attestations.
   *
   * @param fromSequence - Starting sequence number (inclusive)
   * @param toSequence - Ending sequence number (inclusive)
   * @returns Array of vote batches
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
  async getVoteBatches(fromSequence: bigint, toSequence: bigint): Promise<VoteBatch[]> {
    const result = await this.request<unknown>("pod_getVoteBatches", [
      Number(fromSequence),
      Number(toSequence),
    ]);
    return VoteBatchArraySchema.parse(result);
  }

  /**
   * Waits for the network's Past Perfection Time (PPT) to reach the target timestamp.
   *
   * PPT is a quorum-based monotonic timestamp that advances as validators
   * report their local times. This method blocks until PPT >= targetTimestamp.
   *
   * PPT provides stronger timing guarantees than local time for auction deadlines
   * and other time-sensitive operations, ensuring all nodes agree on when a
   * deadline has passed.
   *
   * @param targetTimestamp - Target timestamp in microseconds
   * @throws If the target is more than 500ms in the future
   *
   * @example
   * ```typescript
   * import { nowMicros, millisToMicros } from '@podnetwork/core';
   *
   * // Wait for 100ms from now using network time
   * const deadline = nowMicros() + millisToMicros(100);
   * await client.rpc.waitPastPerfectTime(deadline);
   * console.log('PPT has reached the deadline');
   * ```
   *
   * @example
   * ```typescript
   * // Use with auction deadlines
   * const auctionDeadline = auction.deadline;
   * await client.rpc.waitPastPerfectTime(auctionDeadline);
   * // Now safe to submit solution - all nodes agree deadline has passed
   * ```
   */
  async waitPastPerfectTime(targetTimestamp: bigint): Promise<void> {
    await this.request<null>("pod_waitPastPerfectTime", [Number(targetTimestamp)]);
  }
}
