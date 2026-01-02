/**
 * @module browser-signer
 * @description EIP-1193 browser wallet integration for MetaMask and similar wallets
 */

import {
  type Address,
  type Hash,
  type TransactionRequest,
  type Signature,
  type BroadcastingSigner,
  PodWalletError,
  toAddress,
  toHash,
  isBrowser,
} from "@podnetwork/core";

import type { EIP1193Provider, BrowserWalletConnectOptions } from "./types.js";
import { bytesToHex } from "./utils.js";

/**
 * Browser wallet signer using EIP-1193.
 *
 * This signer delegates all signing operations to a browser wallet like
 * MetaMask. The private key never leaves the wallet extension, providing
 * better security for browser applications.
 *
 * **Requirements**:
 * - Must be used in a browser environment
 * - User must have a compatible wallet extension installed (MetaMask, etc.)
 * - User must approve the connection and signing requests
 *
 * @example
 * ```typescript
 * import { BrowserWalletSigner } from '@podnetwork/wallet-browser';
 *
 * // Check if browser wallet is available
 * if (BrowserWalletSigner.isAvailable()) {
 *   // Connect to the wallet
 *   const signer = await BrowserWalletSigner.connect();
 *   console.log(`Connected: ${await signer.getAddress()}`);
 *
 *   // Use with PodClient
 *   const pending = await client.tx.sendTransaction({
 *     to: '0x...',
 *     value: parsePod('1.0'),
 *   }, signer);
 * }
 * ```
 */
export class BrowserWalletSigner implements BroadcastingSigner {
  /** The EIP-1193 provider */
  private readonly provider: EIP1193Provider;

  /** The connected account address */
  private readonly _address: Address;

  /** Cached provider chain ID to avoid repeated RPC calls */
  private cachedProviderChainId: bigint | undefined;

  /** Handler for chainChanged events, stored for cleanup */
  private chainChangedHandler: (() => void) | undefined;

  /**
   * Marker indicating this signer can broadcast transactions directly.
   *
   * When true, the SDK can use `eth_sendTransaction` instead of
   * signing locally and then broadcasting via `eth_sendRawTransaction`.
   */
  readonly canBroadcast = true as const;

  /**
   * Private constructor - use static factory methods instead.
   */
  private constructor(provider: EIP1193Provider, address: Address) {
    this.provider = provider;
    this._address = address;

    // Setup chain change listener if provider supports events
    if (provider.on !== undefined) {
      this.chainChangedHandler = () => {
        this.cachedProviderChainId = undefined;
      };
      provider.on("chainChanged", this.chainChangedHandler);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Static Methods
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Check if a browser wallet is available.
   *
   * This checks for the presence of `window.ethereum` or a custom provider.
   *
   * @param options - Optional custom provider
   * @returns True if a wallet is available
   *
   * @example
   * ```typescript
   * if (BrowserWalletSigner.isAvailable()) {
   *   const signer = await BrowserWalletSigner.connect();
   * } else {
   *   console.log('Please install MetaMask');
   * }
   * ```
   */
  static isAvailable(options?: { provider?: EIP1193Provider }): boolean {
    if (options?.provider != null) {
      return typeof options.provider.request === "function";
    }

    if (!isBrowser()) {
      return false;
    }

    const ethereum = getEthereumProvider();
    return ethereum !== undefined && typeof ethereum.request === "function";
  }

  /**
   * Connect to a browser wallet.
   *
   * This will prompt the user to approve the connection if not already
   * connected. The user must approve the request in their wallet extension.
   *
   * @param options - Connection options
   * @returns A connected BrowserWalletSigner
   * @throws {WalletError} If no wallet is available or user rejects connection
   *
   * @example
   * ```typescript
   * try {
   *   const signer = await BrowserWalletSigner.connect();
   *   console.log(`Connected: ${await signer.getAddress()}`);
   * } catch (error) {
   *   if (error instanceof WalletError) {
   *     if (error.code === 'NOT_CONNECTED') {
   *       console.log('User rejected connection');
   *     }
   *   }
   * }
   * ```
   */
  static async connect(options?: BrowserWalletConnectOptions): Promise<BrowserWalletSigner> {
    const provider = options?.provider ?? getEthereumProvider();
    const accountIndex = options?.accountIndex ?? 0;

    if (provider == null) {
      throw PodWalletError.notConnected();
    }

    try {
      // Request account access - this prompts the user
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (accounts.length === 0) {
        throw PodWalletError.notConnected();
      }

      if (accountIndex >= accounts.length) {
        throw PodWalletError.notConnected();
      }

      // Safe to access since we validated bounds above
      const account = accounts[accountIndex];
      if (account === undefined) {
        throw PodWalletError.notConnected();
      }
      const address = toAddress(account);
      return new BrowserWalletSigner(provider, address);
    } catch (error) {
      // Handle user rejection (EIP-1193 error code 4001)
      if (isUserRejectionError(error)) {
        throw PodWalletError.userRejected();
      }

      // Handle already connected but no accounts
      if (error instanceof PodWalletError) {
        throw error;
      }

      throw PodWalletError.notConnected();
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Properties
  // ─────────────────────────────────────────────────────────────────────

  /**
   * The connected account address.
   *
   * @example
   * ```typescript
   * const signer = await BrowserWalletSigner.connect();
   * console.log(signer.address); // '0x742d35Cc...'
   * ```
   */
  get address(): Address {
    return this._address;
  }

  /**
   * The EIP-1193 provider.
   *
   * Can be used for advanced operations not covered by the Signer interface.
   *
   * @example
   * ```typescript
   * const chainId = await signer.eip1193Provider.request({
   *   method: 'eth_chainId'
   * });
   * ```
   */
  get eip1193Provider(): EIP1193Provider {
    return this.provider;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Disconnect from the browser wallet and clean up resources.
   *
   * This removes the chain change event listener and clears cached data.
   * Call this when the signer is no longer needed to prevent memory leaks.
   *
   * @example
   * ```typescript
   * const signer = await BrowserWalletSigner.connect();
   * // ... use signer ...
   * signer.disconnect(); // Clean up when done
   * ```
   */
  disconnect(): void {
    if (this.chainChangedHandler !== undefined && this.provider.removeListener !== undefined) {
      this.provider.removeListener("chainChanged", this.chainChangedHandler);
      this.chainChangedHandler = undefined;
    }
    this.cachedProviderChainId = undefined;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Signer Interface
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Get the connected account address.
   *
   * @returns The checksummed address
   */
  async getAddress(): Promise<Address> {
    return Promise.resolve(this._address);
  }

  /**
   * Sign an arbitrary message using the browser wallet.
   *
   * This will prompt the user to approve the message signing in their wallet.
   * Implements EIP-191 personal_sign.
   *
   * @param message - The message to sign (string or raw bytes)
   * @returns The signature as a hex string
   * @throws {WalletError} If user rejects or signing fails
   *
   * @example
   * ```typescript
   * const signature = await signer.signMessage('Hello, Pod!');
   * ```
   */
  async signMessage(message: string | Uint8Array): Promise<Signature> {
    try {
      // Convert message to hex if it's bytes - use bytesToHex instead of Buffer
      const messageHex = message instanceof Uint8Array ? bytesToHex(message) : message;

      // Use personal_sign for EIP-191 compatibility
      const signature = (await this.provider.request({
        method: "personal_sign",
        params: [messageHex, this._address],
      })) as string;

      return signature as Signature;
    } catch (error) {
      if (isUserRejectionError(error)) {
        throw PodWalletError.userRejected();
      }

      throw PodWalletError.signingFailed(
        error instanceof Error ? error.message : "Message signing failed",
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Send a transaction directly via the browser wallet.
   *
   * This uses `eth_sendTransaction` which allows the wallet to handle
   * gas estimation and nonce management. The user will see a cleaner
   * transaction confirmation dialog compared to `eth_signTransaction`.
   *
   * **Chain ID Validation**: Before sending, this method validates that
   * the wallet is connected to the expected chain. If there's a mismatch,
   * a `CHAIN_MISMATCH` error is thrown with instructions to switch networks.
   *
   * @param tx - The transaction request
   * @param chainId - The expected chain ID (for validation)
   * @returns The transaction hash
   * @throws {WalletError} If user rejects, chain mismatch, or transaction fails
   *
   * @example
   * ```typescript
   * const txHash = await signer.sendTransaction({
   *   to: '0x742d35Cc...',
   *   value: parsePod('1.0'),
   * }, 1293n);
   * ```
   */
  async sendTransaction(tx: TransactionRequest, chainId: bigint): Promise<Hash> {
    try {
      // Validate chain ID before sending
      const providerChainId = await this.getProviderChainId();
      if (providerChainId !== chainId) {
        throw PodWalletError.chainMismatch(chainId, providerChainId);
      }

      // Build the transaction object for eth_sendTransaction
      // Only include fields that are actually set - let wallet handle gas/nonce
      const txParams: {
        from: string;
        to?: string;
        value?: string;
        data?: string;
        gas?: string;
        maxFeePerGas?: string;
        maxPriorityFeePerGas?: string;
        nonce?: string;
      } = {
        from: this._address,
      };

      // Only include optional fields if provided
      if (tx.to !== undefined) {
        txParams.to = tx.to;
      }
      if (tx.value !== undefined) {
        txParams.value = toHexBigInt(tx.value);
      }
      if (tx.data !== undefined) {
        txParams.data = tx.data;
      }
      // Let wallet handle gas estimation unless explicitly provided
      if (tx.gas !== undefined) {
        txParams.gas = toHexBigInt(tx.gas);
      }
      if (tx.maxFeePerGas !== undefined) {
        txParams.maxFeePerGas = toHexBigInt(tx.maxFeePerGas);
      }
      if (tx.maxPriorityFeePerGas !== undefined) {
        txParams.maxPriorityFeePerGas = toHexBigInt(tx.maxPriorityFeePerGas);
      }
      // Let wallet handle nonce unless explicitly provided
      if (tx.nonce !== undefined) {
        txParams.nonce = toHexBigInt(tx.nonce);
      }

      // Send transaction via wallet - wallet handles signing and broadcasting
      const txHash = (await this.provider.request({
        method: "eth_sendTransaction",
        params: [txParams],
      })) as string;

      return toHash(txHash);
    } catch (error) {
      // Re-throw PodWalletError as-is (includes CHAIN_MISMATCH)
      if (error instanceof PodWalletError) {
        throw error;
      }

      if (isUserRejectionError(error)) {
        throw PodWalletError.userRejected();
      }

      throw PodWalletError.signingFailed(
        error instanceof Error ? error.message : "Transaction failed",
        error instanceof Error ? error : undefined
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Get the provider's chain ID with caching.
   *
   * The chain ID is cached after the first fetch and invalidated
   * when the chainChanged event fires.
   */
  private async getProviderChainId(): Promise<bigint> {
    if (this.cachedProviderChainId === undefined) {
      const chainIdHex = (await this.provider.request({
        method: "eth_chainId",
        params: [],
      })) as string;
      this.cachedProviderChainId = BigInt(chainIdHex);
    }
    return this.cachedProviderChainId;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────

/**
 * Get the Ethereum provider from the window object.
 */
function getEthereumProvider(): EIP1193Provider | undefined {
  if (!isBrowser()) {
    return undefined;
  }

  // Access window.ethereum safely
  const win = globalThis as typeof globalThis & {
    ethereum?: EIP1193Provider;
  };

  return win.ethereum;
}

/**
 * Check if an error is a user rejection error (EIP-1193 code 4001).
 */
function isUserRejectionError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const err = error as { code?: number; message?: string };

  // EIP-1193 user rejected request
  if (err.code === 4001) {
    return true;
  }

  // Some wallets use different codes or just a message
  if (
    typeof err.message === "string" &&
    (err.message.toLowerCase().includes("user rejected") ||
      err.message.toLowerCase().includes("user denied"))
  ) {
    return true;
  }

  return false;
}

/**
 * Convert a bigint to a hex string.
 */
function toHexBigInt(value: bigint): `0x${string}` {
  return `0x${value.toString(16)}`;
}
