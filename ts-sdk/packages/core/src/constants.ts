/**
 * @module constants
 * @description Network presets and constants for pod network SDK
 */

import type { Address } from "./types/address.js";

/**
 * Network preset configuration.
 */
export interface NetworkPreset {
  /** RPC endpoint URL */
  readonly url: string;
  /** WebSocket endpoint URL (optional, required for subscriptions) */
  readonly wsUrl?: string;
  /** Chain ID (optional, auto-detected if not provided) */
  readonly chainId?: bigint;
  /** Faucet URL (dev networks only) */
  readonly faucetUrl?: string;
  /** Block explorer URL */
  readonly explorerUrl?: string;
}

// =============================================================================
// devnet (Recommended for getting started)
// =============================================================================

/**
 * devnet RPC URL.
 */
export const DEV_RPC_URL = "https://rpc.v1.dev.pod.network";

/**
 * devnet WebSocket URL.
 */
export const DEV_WS_URL = "wss://rpc.v1.dev.pod.network";

/**
 * devnet block explorer URL.
 */
export const DEV_EXPLORER_URL = "https://explorer.v1.pod.network";

/**
 * devnet configuration.
 *
 * This is the recommended starting point for development and testing.
 * Chain ID is auto-detected from the network.
 *
 * @example
 * ```typescript
 * import { PodClient, DEV } from '@podnetwork/core';
 *
 * const client = PodClient.dev();
 * // or
 * const client = new PodClient(DEV);
 * ```
 */
export const DEV: NetworkPreset = {
  url: DEV_RPC_URL,
  wsUrl: DEV_WS_URL,
  explorerUrl: DEV_EXPLORER_URL,
  // chainId auto-detected from network
} as const;

// =============================================================================
// Local Network (For local development)
// =============================================================================

/**
 * Local pod node chain ID.
 */
export const LOCAL_CHAIN_ID = 1293n;

/**
 * Local pod node RPC URL.
 */
export const LOCAL_RPC_URL = "http://127.0.0.1:10600";

/**
 * Local pod node WebSocket URL.
 */
export const LOCAL_WS_URL = "ws://127.0.0.1:9002";

/**
 * Pod local network configuration.
 *
 * Use this for local development with a locally running pod node.
 *
 * @example
 * ```typescript
 * import { PodClient, LOCAL } from '@podnetwork/core';
 *
 * const client = PodClient.local();
 * // or
 * const client = new PodClient(LOCAL);
 * ```
 */
export const LOCAL: NetworkPreset = {
  url: LOCAL_RPC_URL,
  wsUrl: LOCAL_WS_URL,
  chainId: LOCAL_CHAIN_ID,
} as const;

// =============================================================================
// Chronos devnet (CLOB - Most up-to-date)
// =============================================================================

/**
 * Chronos devnet (CLOB) chain ID.
 */
export const CHRONOS_DEV_CHAIN_ID = 1293n;

/**
 * Chronos devnet (CLOB) RPC URL.
 */
export const CHRONOS_DEV_RPC_URL = "https://clob.pod.network:10602";

/**
 * Chronos devnet (CLOB) WebSocket URL.
 */
export const CHRONOS_DEV_WS_URL = "wss://clob.pod.network:9002";

/**
 * Chronos devnet (CLOB) block explorer URL.
 */
export const CHRONOS_DEV_EXPLORER_URL = "https://explorer.v1.pod.network";

/**
 * Chronos devnet (CLOB) faucet URL.
 */
export const CHRONOS_DEV_FAUCET_URL = "https://clobfaucet.pod.network";

/**
 * Chronos devnet (CLOB) configuration.
 *
 * This is the most up-to-date version of the pod node.
 * Use this for testing auction/CLOB functionality.
 *
 * @example
 * ```typescript
 * import { PodClient, CHRONOS_DEV } from '@podnetwork/core';
 *
 * const client = PodClient.chronosDev();
 * // or
 * const client = new PodClient(CHRONOS_DEV);
 * ```
 */
export const CHRONOS_DEV: NetworkPreset = {
  url: CHRONOS_DEV_RPC_URL,
  wsUrl: CHRONOS_DEV_WS_URL,
  chainId: CHRONOS_DEV_CHAIN_ID,
  faucetUrl: CHRONOS_DEV_FAUCET_URL,
  explorerUrl: CHRONOS_DEV_EXPLORER_URL,
} as const;

// =============================================================================
// Testnet (Not Yet Available)
// =============================================================================

/**
 * pod testnet configuration.
 *
 * @remarks
 * This constant is reserved for the upcoming pod testnet. Currently throws an error
 * when accessed as the testnet is not yet available. Use {@link DEV} or {@link CHRONOS_DEV} for development.
 *
 * @throws Error when accessed - testnet is not yet available
 */
export const TESTNET: NetworkPreset = Object.freeze({
  get url(): string {
    throw new Error(
      "pod testnet is not yet available. Use DEV or CHRONOS_DEV instead. " +
        "Check https://pod.network for testnet launch announcements."
    );
  },
  get wsUrl(): string {
    throw new Error(
      "pod testnet is not yet available. Use DEV or CHRONOS_DEV instead. " +
        "Check https://pod.network for testnet launch announcements."
    );
  },
  get chainId(): bigint {
    throw new Error(
      "pod testnet is not yet available. Use DEV or CHRONOS_DEV instead. " +
        "Check https://pod.network for testnet launch announcements."
    );
  },
}) as NetworkPreset;

// =============================================================================
// Mainnet (Not Yet Available)
// =============================================================================

/**
 * pod mainnet configuration.
 *
 * @remarks
 * This constant is reserved for the upcoming pod mainnet. Currently throws an error
 * when accessed as the mainnet is not yet available. Use {@link DEV} or {@link CHRONOS_DEV} for development.
 *
 * @throws Error when accessed - mainnet is not yet available
 */
export const MAINNET: NetworkPreset = Object.freeze({
  get url(): string {
    throw new Error(
      "pod mainnet is not yet available. Use DEV or CHRONOS_DEV instead. " +
        "Check https://pod.network for mainnet launch announcements."
    );
  },
  get wsUrl(): string {
    throw new Error(
      "pod mainnet is not yet available. Use DEV or CHRONOS_DEV instead. " +
        "Check https://pod.network for mainnet launch announcements."
    );
  },
  get chainId(): bigint {
    throw new Error(
      "pod mainnet is not yet available. Use DEV or CHRONOS_DEV instead. " +
        "Check https://pod.network for mainnet launch announcements."
    );
  },
}) as NetworkPreset;

/**
 * Precompile contract addresses.
 */
export const PRECOMPILES = {
  /**
   * Optimistic auction precompile address.
   */
  OPTIMISTIC_AUCTION: "0xf6D39FB8492dC21293043f5E39F566D4A4ce2206" as Address,
} as const;

/**
 * Token decimals for POD (same as ETH).
 */
export const POD_DECIMALS = 18;

/**
 * One POD in wei.
 */
export const ONE_POD = 10n ** 18n;

/**
 * One Gwei in wei.
 */
export const ONE_GWEI = 10n ** 9n;

/**
 * Default configuration values.
 */
export const DEFAULTS = {
  /** Request timeout in milliseconds */
  TIMEOUT: 30_000,
  /** Maximum retry attempts */
  MAX_RETRIES: 3,
  /** Gas price cache TTL in milliseconds (~1 block time on pod) */
  GAS_PRICE_CACHE_TTL: 12_000,
  /** Maximum concurrent WebSocket subscriptions */
  MAX_SUBSCRIPTIONS: 10,
  /** Default gas price in wei (used as fallback) - 100 Gwei */
  DEFAULT_GAS_PRICE: 100_000_000_000n, // 100 Gwei (matches Rust SDK)
  /** Gas estimation buffer as percentage (120 = 20% buffer) */
  GAS_ESTIMATION_BUFFER: 120,
  /** Default fallback gas limit when estimation fails */
  DEFAULT_FALLBACK_GAS_LIMIT: 200_000n,
} as const;
