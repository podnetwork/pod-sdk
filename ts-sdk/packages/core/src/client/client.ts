/**
 * @module client/client
 * @description Main PodClient class for interacting with pod network
 */

import { getLogger, LoggerCategory } from "../logging/index.js";
import { DEV, LOCAL, CHRONOS_DEV, type NetworkPreset } from "../constants.js";
import { RpcNamespace } from "../rpc/namespace.js";
import { TxNamespace } from "../tx/namespace.js";
import { GasPriceManager } from "./gas-price.js";
import { resolveConfig, type PodClientConfig, type PodClientConfigInput } from "./config.js";
import type { Hash, Address, Bytes } from "../types/index.js";

const logger = getLogger(LoggerCategory.CORE);

/**
 * Transaction sender interface for namespace interop.
 *
 * This interface allows optional packages (orderbook, auction, etc.)
 * to send transactions without circular dependencies.
 */
export interface TransactionSender {
  /**
   * Sends a raw signed transaction.
   */
  sendRawTransaction(signedTx: string): Promise<Hash>;

  /**
   * Gets the transaction count (nonce) for an address.
   */
  getTransactionCount(address: `0x${string}`): Promise<bigint>;

  /**
   * Estimates gas for a transaction.
   */
  estimateGas(tx: { to?: `0x${string}`; data?: `0x${string}`; value?: bigint }): Promise<bigint>;

  /**
   * Gets the current gas price.
   */
  getGasPrice(): Promise<bigint>;

  /**
   * Gets the chain ID.
   */
  getChainId(): Promise<bigint>;

  /**
   * Executes a read-only call (eth_call).
   */
  call(tx: { to: `0x${string}`; data: string }): Promise<Bytes>;

  /**
   * Gas estimation buffer as percentage (e.g., 120 = 20% buffer).
   */
  readonly gasEstimationBuffer: number;
}

/**
 * PodClient is the main entry point for interacting with the Pod Network.
 *
 * It provides namespace-based access to different functionality:
 * - `rpc`: Blockchain query operations (getBalance, getBlock, etc.)
 * - `tx`: Transaction operations (sendTransaction, estimateGas)
 * - `orderbook`: CLOB trading operations
 * - `auction`: Optimistic auction operations
 * - `ws`: WebSocket subscriptions
 * - `faucet`: Testnet faucet operations
 *
 * @example
 * ```typescript
 * // Connect to dev network
 * const client = PodClient.dev();
 *
 * // Query blockchain state
 * const balance = await client.rpc.getBalance(address);
 *
 * // Custom configuration
 * const customClient = new PodClient({
 *   url: 'http://localhost:8545',
 *   timeout: 60000,
 *   gasPriceStrategy: { fixed: 1_000_000_000n },
 * });
 * ```
 */
export class PodClient {
  /**
   * Resolved client configuration.
   */
  readonly config: PodClientConfig;

  /**
   * RPC namespace for blockchain query operations.
   *
   * @example
   * ```typescript
   * const balance = await client.rpc.getBalance(address);
   * const block = await client.rpc.getBlockByNumber('latest');
   * const receipt = await client.rpc.getTransactionReceipt(txHash);
   * ```
   */
  readonly rpc: RpcNamespace;

  /**
   * Transaction namespace for sending and managing transactions.
   *
   * @example
   * ```typescript
   * // Send a transfer
   * const pending = await client.tx.sendTransaction(
   *   { to: recipientAddress, value: parsePod('1.0') },
   *   wallet
   * );
   *
   * // Wait for confirmation
   * const receipt = await pending.waitForReceipt();
   *
   * // Estimate gas
   * const gas = await client.tx.estimateGas({ to: address, data: calldata });
   * ```
   */
  readonly tx: TxNamespace;

  /**
   * Gas price manager for gas price caching and strategy.
   * @internal
   */
  private readonly gasPriceManager: GasPriceManager;

  /**
   * Cached chain ID (resolved lazily).
   * @internal
   */
  private resolvedChainId: bigint | undefined;

  /**
   * Creates a new PodClient instance.
   *
   * @param config - Client configuration or NetworkPreset
   *
   * @example
   * ```typescript
   * // From network preset
   * const client = new PodClient(TESTNET);
   *
   * // From custom config
   * const client = new PodClient({
   *   url: 'http://localhost:8545',
   *   timeout: 60000,
   * });
   * ```
   */
  constructor(config: PodClientConfigInput | NetworkPreset) {
    // Handle NetworkPreset input
    // NetworkPreset has only network fields (url, wsUrl, chainId, faucetUrl, explorerUrl)
    // PodClientConfigInput has client-specific fields (timeout, maxRetries, gasPriceStrategy, etc.)
    let inputConfig: PodClientConfigInput;

    const isNetworkPreset =
      "url" in config &&
      !("timeout" in config) &&
      !("maxRetries" in config) &&
      !("gasPriceStrategy" in config);

    if (isNetworkPreset) {
      // It's a NetworkPreset - extract relevant fields
      const preset = config as NetworkPreset;
      inputConfig = {
        url: preset.url,
      };
      // Only add optional fields if defined (for exactOptionalPropertyTypes)
      if (preset.wsUrl !== undefined) {
        inputConfig.wsUrl = preset.wsUrl;
      }
      if (preset.chainId !== undefined) {
        inputConfig.chainId = preset.chainId;
      }
    } else {
      inputConfig = config;
    }

    this.config = resolveConfig(inputConfig);

    logger.info("PodClient initialized", {
      url: this.config.url,
      chainId: this.config.chainId?.toString(),
      gasPriceStrategy:
        typeof this.config.gasPriceStrategy === "object"
          ? `fixed:${String(this.config.gasPriceStrategy.fixed)}`
          : this.config.gasPriceStrategy,
    });

    // Initialize RPC namespace
    this.rpc = new RpcNamespace({
      url: this.config.url,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    });

    // Initialize gas price manager
    this.gasPriceManager = new GasPriceManager({
      strategy: this.config.gasPriceStrategy,
      defaultGasPrice: this.config.defaultGasPrice,
      cacheTtl: this.config.gasPriceCacheTtl,
      fetcher: async () => this.rpc.getGasPrice(),
    });

    // Store pre-configured chain ID
    this.resolvedChainId = this.config.chainId;

    // Initialize TX namespace
    this.tx = new TxNamespace(
      this.rpc,
      async () => this.getGasPrice(),
      async () => this.getChainId(),
      this.config.gasEstimationBuffer
    );
  }

  /**
   * Creates a PodClient connected to devnet.
   *
   * This is the recommended starting point for development and testing.
   * Chain ID is auto-detected from the network.
   *
   * @returns PodClient configured for devnet
   *
   * @example
   * ```typescript
   * const client = PodClient.dev();
   * const balance = await client.rpc.getBalance(address);
   * ```
   */
  static dev(): PodClient {
    return new PodClient(DEV);
  }

  /**
   * Creates a PodClient connected to a local Pod node.
   *
   * Use this for local development with a locally running Pod node.
   *
   * @returns PodClient configured for local node
   *
   * @example
   * ```typescript
   * const client = PodClient.local();
   * const balance = await client.rpc.getBalance(address);
   * ```
   */
  static local(): PodClient {
    return new PodClient(LOCAL);
  }

  /**
   * Creates a PodClient connected to Chronos devnet (CLOB).
   *
   * This is the most up-to-date version of the pod node.
   * Use this for testing auction/CLOB functionality.
   *
   * @returns PodClient configured for Chronos devnet
   *
   * @example
   * ```typescript
   * const client = PodClient.chronosDev();
   * const balance = await client.rpc.getBalance(address);
   * ```
   */
  static chronosDev(): PodClient {
    return new PodClient(CHRONOS_DEV);
  }

  /**
   * Creates a PodClient connected to the Pod testnet.
   *
   * @remarks
   * This method is reserved for the upcoming Pod testnet. Currently throws an error
   * as the testnet is not yet available. Use {@link dev} or {@link chronosDev} for development.
   *
   * @throws Error - testnet is not yet available
   *
   * @example
   * ```typescript
   * // Currently throws - use PodClient.dev() instead
   * const client = PodClient.testnet();
   * ```
   */
  static testnet(): PodClient {
    throw new Error(
      "pod testnet is not yet available. Use PodClient.dev() or PodClient.chronosDev() instead. " +
        "Check https://pod.network for testnet launch announcements."
    );
  }

  /**
   * Creates a PodClient connected to the Pod mainnet.
   *
   * @remarks
   * This method is reserved for the upcoming Pod mainnet. Currently throws an error
   * as the mainnet is not yet available. Use {@link dev} or {@link chronosDev} for development.
   *
   * @throws Error - mainnet is not yet available
   *
   * @example
   * ```typescript
   * // Currently throws - use PodClient.dev() instead
   * const client = PodClient.mainnet();
   * ```
   */
  static mainnet(): PodClient {
    throw new Error(
      "pod mainnet is not yet available. Use PodClient.dev() or PodClient.chronosDev() instead. " +
        "Check https://pod.network for mainnet launch announcements."
    );
  }

  /**
   * Gets the RPC endpoint URL.
   */
  get url(): string {
    return this.config.url;
  }

  /**
   * Gets the WebSocket endpoint URL.
   */
  get wsUrl(): string | undefined {
    return this.config.wsUrl;
  }

  /**
   * Gets the chain ID, resolving from the network if not configured.
   *
   * @returns Promise resolving to the chain ID
   *
   * @example
   * ```typescript
   * const chainId = await client.getChainId();
   * console.log(`Connected to chain ${chainId}`);
   * ```
   */
  async getChainId(): Promise<bigint> {
    if (this.resolvedChainId === undefined) {
      this.resolvedChainId = await this.rpc.getChainId();
      logger.debug("Chain ID resolved", { chainId: this.resolvedChainId.toString() });
    }
    return this.resolvedChainId;
  }

  /**
   * Gets the current gas price using the configured strategy.
   *
   * This method respects the configured gas price strategy:
   * - 'auto': Cache gas price with TTL, fetch on miss, fallback to default
   * - 'always_fetch': Always fetch fresh gas price
   * - { fixed: bigint }: Use a fixed gas price
   *
   * @returns Promise resolving to gas price in wei
   *
   * @example
   * ```typescript
   * const gasPrice = await client.getGasPrice();
   * console.log(`Gas price: ${formatGwei(gasPrice)} Gwei`);
   * ```
   */
  async getGasPrice(): Promise<bigint> {
    return this.gasPriceManager.getGasPrice();
  }

  /**
   * Clears the gas price cache.
   *
   * Useful when you want to force a fresh fetch on the next call.
   *
   * @example
   * ```typescript
   * client.clearGasPriceCache();
   * const freshPrice = await client.getGasPrice();
   * ```
   */
  clearGasPriceCache(): void {
    this.gasPriceManager.clearCache();
  }

  /**
   * Gets a TransactionSender interface for use by optional packages.
   *
   * This allows packages like @podnetwork/orderbook to send transactions
   * without circular dependencies on PodClient.
   *
   * @returns TransactionSender interface
   *
   * @example
   * ```typescript
   * // In orderbook package
   * const sender = client.getTransactionSender();
   * const namespace = new OrderbookNamespace(config, sender);
   * ```
   */
  getTransactionSender(): TransactionSender {
    return {
      sendRawTransaction: async (signedTx: string) => this.rpc.sendRawTransaction(signedTx),
      getTransactionCount: async (address: `0x${string}`) => this.rpc.getTransactionCount(address),
      estimateGas: async (tx: { to?: `0x${string}`; data?: `0x${string}`; value?: bigint }) =>
        this.rpc.estimateGas({
          to: tx.to as Address | undefined,
          data: tx.data,
          value: tx.value,
        }),
      getGasPrice: async () => this.getGasPrice(),
      getChainId: async () => this.getChainId(),
      call: async (tx: { to: `0x${string}`; data: string }) =>
        this.rpc.call({
          to: tx.to as Address,
          data: tx.data as Bytes,
        }),
      gasEstimationBuffer: this.config.gasEstimationBuffer,
    };
  }
}
