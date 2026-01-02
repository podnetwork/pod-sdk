/**
 * @module wallet
 * @description Local private key wallet implementation
 */

import { Wallet as EthersWallet, type HDNodeWallet, getBytes, hexlify, Transaction } from "ethers";
import {
  type Address,
  type TransactionRequest,
  type Signer,
  type SignedTransaction,
  type Signature,
  PodWalletError,
  toAddress,
} from "@podnetwork/core";
import type { Mnemonic } from "./mnemonic.js";
import { warnBrowserPrivateKey } from "./browser-warning.js";

/**
 * Local private key wallet for signing transactions and messages.
 *
 * The Wallet class implements the {@link Signer} interface and provides
 * full control over a private key for transaction signing.
 *
 * **Security Warning**: Private keys are stored in memory. For browser
 * applications, consider using {@link BrowserWalletSigner} with MetaMask
 * or similar browser extension wallets instead.
 *
 * @example
 * ```typescript
 * // Generate a new random wallet
 * const wallet = Wallet.generate();
 * console.log(`Address: ${wallet.address}`);
 *
 * // Import from private key
 * const imported = Wallet.fromPrivateKey('0x...');
 *
 * // Import from mnemonic
 * const mnemonic = Mnemonic.generate();
 * const hdWallet = Wallet.fromMnemonic(mnemonic, 0);
 *
 * // Sign and send transaction
 * const pending = await client.tx.sendTransaction({
 *   to: '0x...',
 *   value: parsePod('1.0'),
 * }, wallet);
 * ```
 */
export class Wallet implements Signer {
  /** The underlying ethers.js Wallet instance */
  private readonly _wallet: EthersWallet | HDNodeWallet;

  /** Cached checksummed address */
  private readonly _address: Address;

  /**
   * Private constructor - use static factory methods instead.
   */
  private constructor(wallet: EthersWallet | HDNodeWallet) {
    this._wallet = wallet;
    this._address = toAddress(wallet.address);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Factory Methods
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Generate a new random wallet.
   *
   * Uses cryptographically secure random number generation.
   *
   * **Browser Warning**: A security warning will be shown in browser
   * environments. Consider using {@link BrowserWalletSigner} for production.
   *
   * @returns A new Wallet instance
   *
   * @example
   * ```typescript
   * const wallet = Wallet.generate();
   * console.log(`New wallet: ${wallet.address}`);
   *
   * // Save the private key securely!
   * const key = wallet.privateKeyHex();
   * ```
   */
  static generate(): Wallet {
    warnBrowserPrivateKey();

    const ethersWallet = EthersWallet.createRandom();
    return new Wallet(ethersWallet);
  }

  /**
   * Create a wallet from a private key hex string.
   *
   * **Browser Warning**: A security warning will be shown in browser
   * environments. Consider using {@link BrowserWalletSigner} for production.
   *
   * @param privateKey - The private key as a 0x-prefixed hex string (64 hex chars)
   * @returns A Wallet instance
   * @throws {WalletError} If the private key is invalid
   *
   * @example
   * ```typescript
   * const wallet = Wallet.fromPrivateKey(
   *   '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
   * );
   * ```
   */
  static fromPrivateKey(privateKey: string): Wallet {
    warnBrowserPrivateKey();

    try {
      // Normalize the key
      const normalized = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;

      // Validate length (0x + 64 hex chars = 66)
      if (normalized.length !== 66) {
        throw PodWalletError.invalidKey(
          `Expected 64 hex characters, got ${String(normalized.length - 2)}`
        );
      }

      // Validate hex
      if (!/^0x[a-fA-F0-9]{64}$/i.test(normalized)) {
        throw PodWalletError.invalidKey("Invalid hex characters");
      }

      const ethersWallet = new EthersWallet(normalized);
      return new Wallet(ethersWallet);
    } catch (error) {
      if (error instanceof PodWalletError) {
        throw error;
      }
      throw PodWalletError.invalidKey(
        error instanceof Error ? error.message : "Invalid private key format"
      );
    }
  }

  /**
   * Create a wallet from raw private key bytes.
   *
   * **Browser Warning**: A security warning will be shown in browser
   * environments. Consider using {@link BrowserWalletSigner} for production.
   *
   * @param bytes - The private key as 32 bytes
   * @returns A Wallet instance
   * @throws {WalletError} If the bytes are not exactly 32 bytes
   *
   * @example
   * ```typescript
   * const keyBytes = new Uint8Array(32);
   * crypto.getRandomValues(keyBytes);
   * const wallet = Wallet.fromBytes(keyBytes);
   * ```
   */
  static fromBytes(bytes: Uint8Array): Wallet {
    warnBrowserPrivateKey();

    if (bytes.length !== 32) {
      throw PodWalletError.invalidKey(`Expected 32 bytes, got ${String(bytes.length)}`);
    }

    try {
      const hex = hexlify(bytes);
      const ethersWallet = new EthersWallet(hex);
      return new Wallet(ethersWallet);
    } catch (error) {
      throw PodWalletError.invalidKey(
        error instanceof Error ? error.message : "Invalid private key bytes"
      );
    }
  }

  /**
   * Create a wallet from a mnemonic phrase.
   *
   * Derives the wallet at the given index using the BIP-44 derivation path:
   * `m/44'/60'/0'/0/{index}`
   *
   * **Browser Warning**: A security warning will be shown in browser
   * environments. Consider using {@link BrowserWalletSigner} for production.
   *
   * @param mnemonic - The mnemonic phrase
   * @param index - The address index (default: 0)
   * @returns A Wallet instance
   * @throws {WalletError} If derivation fails
   *
   * @example
   * ```typescript
   * const mnemonic = Mnemonic.fromPhrase('abandon abandon abandon ...');
   *
   * // First account (index 0)
   * const wallet0 = Wallet.fromMnemonic(mnemonic);
   *
   * // Second account (index 1)
   * const wallet1 = Wallet.fromMnemonic(mnemonic, 1);
   * ```
   */
  static fromMnemonic(mnemonic: Mnemonic, index = 0): Wallet {
    warnBrowserPrivateKey();

    // Derive the HD wallet at the given index
    const hdWallet = mnemonic.deriveWallet(index);

    // Create wallet from the derived private key
    const ethersWallet = new EthersWallet(hdWallet.privateKey);
    return new Wallet(ethersWallet);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Properties
  // ─────────────────────────────────────────────────────────────────────

  /**
   * The wallet's address.
   *
   * This is the checksummed (EIP-55) Ethereum address derived from the
   * public key.
   *
   * @example
   * ```typescript
   * const wallet = Wallet.generate();
   * console.log(wallet.address); // '0x742d35Cc6634C0532925a3b844Bc9e7595f8e6a2'
   * ```
   */
  get address(): Address {
    return this._address;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Signer Interface
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Get the wallet's address.
   *
   * @returns The checksummed address
   */
  async getAddress(): Promise<Address> {
    return Promise.resolve(this._address);
  }

  /**
   * Sign a transaction request.
   *
   * @param tx - The transaction request
   * @param chainId - The chain ID for replay protection
   * @returns The signed transaction as an RLP-encoded hex string
   * @throws {WalletError} If signing fails
   *
   * @example
   * ```typescript
   * const signedTx = await wallet.signTransaction({
   *   to: '0x742d35Cc6634C0532925a3b844Bc9e7595f8e6a2',
   *   value: parsePod('1.0'),
   *   nonce: 0n,
   *   gas: 21000n,
   *   maxFeePerGas: parseGwei('10'),
   *   maxPriorityFeePerGas: parseGwei('1'),
   * }, 1293n);
   * ```
   */
  async signTransaction(tx: TransactionRequest, chainId: bigint): Promise<SignedTransaction> {
    try {
      // Build ethers Transaction object
      // pod REQUIRES EIP-1559 (Type 2) transactions - legacy transactions are rejected.
      // Always create Type 2 transactions with maxFeePerGas and maxPriorityFeePerGas.
      const transaction = Transaction.from({
        type: 2, // Always EIP-1559 for pod
        to: tx.to ?? null,
        value: tx.value ?? 0n,
        data: tx.data ?? "0x",
        gasLimit: tx.gas ?? null,
        // EIP-1559 fields - required for pod
        maxFeePerGas: tx.maxFeePerGas ?? null,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas ?? 0n,
        nonce: tx.nonce !== undefined ? Number(tx.nonce) : null,
        chainId,
      });

      // Sign the transaction
      const signature = this._wallet.signingKey.sign(transaction.unsignedHash);
      transaction.signature = signature;

      // Return serialized signed transaction
      return await Promise.resolve(transaction.serialized as SignedTransaction);
    } catch (error) {
      throw PodWalletError.signingFailed(
        error instanceof Error ? error.message : "Transaction signing failed",
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Sign an arbitrary message.
   *
   * Implements EIP-191 personal_sign.
   *
   * @param message - The message to sign
   * @returns The signature as a hex string
   * @throws {WalletError} If signing fails
   *
   * @example
   * ```typescript
   * const signature = await wallet.signMessage('Hello, Pod!');
   * ```
   */
  async signMessage(message: string | Uint8Array): Promise<Signature> {
    try {
      const signature = await this._wallet.signMessage(message);
      return signature as Signature;
    } catch (error) {
      throw PodWalletError.signingFailed(
        error instanceof Error ? error.message : "Message signing failed",
        error instanceof Error ? error : undefined
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Private Key Export
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Export the private key as a hex string.
   *
   * **Security Warning**: Handle with extreme care. Never log or transmit
   * this value insecurely. Anyone with access to this key can control the
   * wallet and all its assets.
   *
   * @returns The private key as a 0x-prefixed hex string
   *
   * @example
   * ```typescript
   * // Export for backup (store securely!)
   * const privateKey = wallet.privateKeyHex();
   *
   * // Later, restore the wallet
   * const restored = Wallet.fromPrivateKey(privateKey);
   * ```
   */
  privateKeyHex(): `0x${string}` {
    return this._wallet.privateKey as `0x${string}`;
  }

  /**
   * Export the private key as raw bytes.
   *
   * **Security Warning**: Handle with extreme care. See {@link privateKeyHex}
   * for security considerations.
   *
   * @returns The private key as a 32-byte Uint8Array
   *
   * @example
   * ```typescript
   * const keyBytes = wallet.privateKeyBytes();
   * // keyBytes is a 32-byte Uint8Array
   * ```
   */
  privateKeyBytes(): Uint8Array {
    return getBytes(this._wallet.privateKey);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Get the underlying ethers.js Wallet for advanced usage.
   *
   * @returns The ethers.js Wallet instance
   * @internal
   */
  toEthers(): EthersWallet | HDNodeWallet {
    return this._wallet;
  }
}
