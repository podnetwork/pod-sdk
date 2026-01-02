/**
 * @module types/signer
 * @description Abstract signer interface for wallet implementations
 */

import type { Address } from "./address.js";
import type { Hash } from "./hash.js";
import type { TransactionRequest } from "../schemas/transaction.js";

/**
 * A signed transaction ready for broadcast.
 *
 * This is the RLP-encoded signed transaction as a hex string.
 */
export type SignedTransaction = `0x${string}`;

/**
 * A signature as a hex string.
 */
export type Signature = `0x${string}`;

/**
 * Base interface for all signer types.
 *
 * This interface defines the common capabilities shared by all signers:
 * - Address retrieval
 * - Message signing
 *
 * Use {@link Signer} for wallets that can sign transactions locally (e.g., private key wallets),
 * or {@link BroadcastingSigner} for wallets that broadcast directly (e.g., browser wallets).
 */
export interface SignerBase {
  /**
   * Get the signer's address.
   *
   * @returns The address associated with this signer
   *
   * @example
   * ```typescript
   * const address = await signer.getAddress();
   * console.log(`Signer address: ${address}`);
   * ```
   */
  getAddress(): Promise<Address>;

  /**
   * Sign an arbitrary message.
   *
   * Implements EIP-191 personal_sign. The message is prefixed with
   * "\x19Ethereum Signed Message:\n" + message length before hashing.
   *
   * @param message - The message to sign (string or raw bytes)
   * @returns The signature as a hex string (65 bytes: r + s + v)
   *
   * @example
   * ```typescript
   * const signature = await signer.signMessage('Hello, Pod!');
   * // signature is 0x + 130 hex chars (65 bytes)
   * ```
   */
  signMessage(message: string | Uint8Array): Promise<Signature>;
}

/**
 * Signer interface for wallets that can sign transactions locally.
 *
 * This interface is for wallets that have access to the private key and can
 * sign transactions without broadcasting them. The SDK will then broadcast
 * the signed transaction via `eth_sendRawTransaction`.
 *
 * Implementations include:
 * - `Wallet` for private key management
 *
 * For browser wallets (MetaMask, etc.) that can only broadcast transactions
 * directly, use {@link BroadcastingSigner} instead.
 *
 * @example
 * ```typescript
 * // Using a Signer with PodClient
 * async function sendWithSigner(client: PodClient, signer: Signer) {
 *   const tx: TransactionRequest = {
 *     to: '0x742d35Cc6634C0532925a3b844Bc9e7595f8e6a2',
 *     value: parsePod('1.0'),
 *   };
 *
 *   const pending = await client.tx.sendTransaction(tx, signer);
 *   const receipt = await pending.waitForReceipt();
 * }
 * ```
 */
export interface Signer extends SignerBase {
  /**
   * Sign a transaction request.
   *
   * The transaction will be populated with chain ID, nonce, gas, etc.
   * before signing if those fields are not provided.
   *
   * @param tx - The transaction request to sign
   * @param chainId - The chain ID for EIP-155 replay protection
   * @returns The signed transaction as an RLP-encoded hex string
   *
   * @example
   * ```typescript
   * const signedTx = await signer.signTransaction({
   *   to: '0x742d35Cc6634C0532925a3b844Bc9e7595f8e6a2',
   *   value: parsePod('1.0'),
   *   nonce: 0n,
   *   gas: 21000n,
   *   maxFeePerGas: parseGwei('10'),
   *   maxPriorityFeePerGas: parseGwei('1'),
   * }, 1293n);
   *
   * // signedTx can be broadcast via eth_sendRawTransaction
   * ```
   */
  signTransaction(tx: TransactionRequest, chainId: bigint): Promise<SignedTransaction>;
}

/**
 * A signer that can broadcast transactions directly.
 *
 * Browser wallet signers (MetaMask, etc.) implement this interface
 * to use `eth_sendTransaction` instead of signing locally and then
 * broadcasting via `eth_sendRawTransaction`. This allows the wallet
 * to handle gas estimation and nonce management.
 *
 * **Note:** This interface extends {@link SignerBase}, not {@link Signer}.
 * Browser wallets cannot sign transactions without broadcasting them
 * (they don't support `eth_signTransaction`), so `signTransaction` is
 * not available on this interface.
 *
 * @example
 * ```typescript
 * function sendWithSigner(client: PodClient, signer: AnySigner) {
 *   if (isBroadcastingSigner(signer)) {
 *     // Wallet will handle gas estimation and nonce
 *     return signer.sendTransaction(tx, chainId);
 *   } else {
 *     // SDK fills transaction and signs locally
 *     return client.tx.sendTransaction(tx, signer);
 *   }
 * }
 * ```
 */
export interface BroadcastingSigner extends SignerBase {
  /**
   * Marker to identify broadcasting signers.
   */
  readonly canBroadcast: true;

  /**
   * Send a transaction directly via the wallet.
   *
   * The wallet will handle gas estimation, nonce management,
   * and broadcasting. The SDK does not need to fill or sign
   * the transaction.
   *
   * @param tx - The transaction request to send
   * @param chainId - The expected chain ID (for validation)
   * @returns The transaction hash
   *
   * @example
   * ```typescript
   * const txHash = await signer.sendTransaction({
   *   to: '0x742d35Cc6634C0532925a3b844Bc9e7595f8e6a2',
   *   value: parsePod('1.0'),
   * }, 1293n);
   * ```
   */
  sendTransaction(tx: TransactionRequest, chainId: bigint): Promise<Hash>;
}

/**
 * Union type for any signer that can be used with the SDK.
 *
 * Use this type when accepting either a local signer ({@link Signer})
 * or a broadcasting signer ({@link BroadcastingSigner}).
 *
 * @example
 * ```typescript
 * async function sendWithAnySigner(client: PodClient, signer: AnySigner) {
 *   const pending = await client.tx.sendTransaction(tx, signer);
 *   return pending.waitForReceipt();
 * }
 * ```
 */
export type AnySigner = Signer | BroadcastingSigner;

/**
 * Type guard to check if a signer can broadcast transactions directly.
 *
 * Use this to detect browser wallet signers that should use
 * `eth_sendTransaction` instead of signing locally.
 *
 * @param signer - The signer to check
 * @returns True if the signer implements BroadcastingSigner
 *
 * @example
 * ```typescript
 * if (isBroadcastingSigner(signer)) {
 *   // Use wallet's eth_sendTransaction
 *   const txHash = await signer.sendTransaction(tx, chainId);
 * } else {
 *   // Sign locally and broadcast via eth_sendRawTransaction
 *   const signedTx = await signer.signTransaction(filledTx, chainId);
 *   const txHash = await client.rpc.sendRawTransaction(signedTx);
 * }
 * ```
 */
export function isBroadcastingSigner(signer: AnySigner): signer is BroadcastingSigner {
  return "canBroadcast" in signer && signer.canBroadcast;
}
