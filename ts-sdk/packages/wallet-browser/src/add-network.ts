/**
 * @module add-network
 * @description Utilities for adding pod network to browser wallets (MetaMask, etc.)
 */

import {
  DEV_RPC_URL,
  DEV_WS_URL,
  DEV_EXPLORER_URL,
  CHRONOS_DEV_CHAIN_ID,
  CHRONOS_DEV_RPC_URL,
  CHRONOS_DEV_WS_URL,
  CHRONOS_DEV_EXPLORER_URL,
  isBrowser,
} from "@podnetwork/core";

import type { EIP1193Provider } from "./types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for a Pod network that can be added to a browser wallet.
 *
 * This follows the EIP-3085 specification for `wallet_addEthereumChain`.
 *
 * @example
 * ```typescript
 * const myNetwork: PodNetworkConfig = {
 *   chainId: 1293n,
 *   chainName: 'devnet',
 *   rpcUrl: 'https://rpc.v1.dev.pod.network',
 *   nativeCurrency: { name: 'POD', symbol: 'POD', decimals: 18 },
 * };
 * ```
 */
export interface PodNetworkConfig {
  /** The chain ID as a bigint */
  readonly chainId: bigint;
  /** Human-readable name for the network */
  readonly chainName: string;
  /** Primary RPC endpoint URL */
  readonly rpcUrl: string;
  /** WebSocket endpoint URL (optional) */
  readonly wsUrl?: string;
  /** Native currency configuration */
  readonly nativeCurrency: {
    /** Currency name (e.g., "POD") */
    readonly name: string;
    /** Currency symbol (e.g., "POD") */
    readonly symbol: string;
    /** Decimal places (typically 18) */
    readonly decimals: number;
  };
  /** Block explorer URL (optional) */
  readonly blockExplorerUrl?: string;
}

/**
 * Result of adding or switching to a network.
 */
export interface AddNetworkResult {
  /** Whether the operation was successful */
  readonly success: boolean;
  /** Whether the network was newly added (vs already present) */
  readonly wasAdded: boolean;
  /** Whether a network switch occurred */
  readonly wasSwitched: boolean;
  /** Error message if the operation failed */
  readonly error?: string;
}

// =============================================================================
// Network Presets
// =============================================================================

/**
 * devnet configuration for browser wallets.
 *
 * Use this preset with `addPodNetworkToWallet()` to add devnet
 * to MetaMask or other compatible wallets.
 *
 * @example
 * ```typescript
 * import { addPodNetworkToWallet, POD_DEV_NETWORK } from '@podnetwork/wallet-browser';
 *
 * await addPodNetworkToWallet(POD_DEV_NETWORK);
 * ```
 */
export const POD_DEV_NETWORK: PodNetworkConfig = {
  chainId: 1293n, // devnet uses same chain ID
  chainName: "devnet",
  rpcUrl: DEV_RPC_URL,
  wsUrl: DEV_WS_URL,
  nativeCurrency: {
    name: "POD",
    symbol: "POD",
    decimals: 18,
  },
  blockExplorerUrl: DEV_EXPLORER_URL,
} as const;

/**
 * Chronos devnet configuration for browser wallets.
 *
 * Chronos devnet is the most up-to-date version of pod,
 * featuring CLOB/auction functionality.
 *
 * @example
 * ```typescript
 * import { addPodNetworkToWallet, POD_CHRONOS_DEV_NETWORK } from '@podnetwork/wallet-browser';
 *
 * await addPodNetworkToWallet(POD_CHRONOS_DEV_NETWORK);
 * ```
 */
export const POD_CHRONOS_DEV_NETWORK: PodNetworkConfig = {
  chainId: CHRONOS_DEV_CHAIN_ID,
  chainName: "Chronos devnet",
  rpcUrl: CHRONOS_DEV_RPC_URL,
  wsUrl: CHRONOS_DEV_WS_URL,
  nativeCurrency: {
    name: "Wrapped Ether",
    symbol: "WETH",
    decimals: 18,
  },
  blockExplorerUrl: CHRONOS_DEV_EXPLORER_URL,
} as const;

// =============================================================================
// Functions
// =============================================================================

/**
 * Add a Pod network to the user's browser wallet.
 *
 * This function implements EIP-3085 (`wallet_addEthereumChain`) to add
 * a new network to wallets like MetaMask. If the network is already
 * present, it will switch to that network instead.
 *
 * **User Interaction**: The user will see a popup in their wallet asking
 * them to approve adding the network. If they reject, the function returns
 * `{ success: false }`.
 *
 * @param config - Network configuration (defaults to POD_DEV_NETWORK)
 * @param provider - EIP-1193 provider (defaults to window.ethereum)
 * @returns Result indicating success/failure and what actions were taken
 *
 * @example
 * ```typescript
 * import { addPodNetworkToWallet, POD_DEV_NETWORK } from '@podnetwork/wallet-browser';
 *
 * // Add the default dev network
 * const result = await addPodNetworkToWallet();
 * if (result.success) {
 *   console.log('Network added successfully!');
 * }
 *
 * // Or specify a network
 * await addPodNetworkToWallet(POD_CHRONOS_DEV_NETWORK);
 * ```
 */
export async function addPodNetworkToWallet(
  config: PodNetworkConfig = POD_DEV_NETWORK,
  provider?: EIP1193Provider
): Promise<AddNetworkResult> {
  const ethereum = provider ?? getEthereumProvider();

  if (ethereum == null) {
    return {
      success: false,
      wasAdded: false,
      wasSwitched: false,
      error: "No browser wallet detected. Please install MetaMask or a compatible wallet.",
    };
  }

  const chainIdHex = toChainIdHex(config.chainId);

  try {
    // First, try to switch to the chain (it might already be added)
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });

    return {
      success: true,
      wasAdded: false,
      wasSwitched: true,
    };
  } catch (switchError) {
    // Chain not found - need to add it (error code 4902)
    if (isChainNotFoundError(switchError)) {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [buildAddChainParams(config)],
        });

        return {
          success: true,
          wasAdded: true,
          wasSwitched: true,
        };
      } catch (addError) {
        if (isUserRejectionError(addError)) {
          return {
            success: false,
            wasAdded: false,
            wasSwitched: false,
            error: "User rejected the request to add the network.",
          };
        }

        return {
          success: false,
          wasAdded: false,
          wasSwitched: false,
          error: addError instanceof Error ? addError.message : "Failed to add network to wallet.",
        };
      }
    }

    // User rejected the switch
    if (isUserRejectionError(switchError)) {
      return {
        success: false,
        wasAdded: false,
        wasSwitched: false,
        error: "User rejected the request to switch networks.",
      };
    }

    return {
      success: false,
      wasAdded: false,
      wasSwitched: false,
      error:
        switchError instanceof Error ? switchError.message : "Failed to switch to Pod network.",
    };
  }
}

/**
 * Switch to a Pod network in the user's browser wallet.
 *
 * This function attempts to switch to the specified network. Unlike
 * `addPodNetworkToWallet()`, this function does NOT add the network
 * if it's not already present - it returns an error instead.
 *
 * Use this when you expect the network to already be configured,
 * or when you want more control over the add/switch flow.
 *
 * @param config - Network configuration (defaults to POD_DEV_NETWORK)
 * @param provider - EIP-1193 provider (defaults to window.ethereum)
 * @returns Result indicating success/failure
 *
 * @example
 * ```typescript
 * import { switchToPodNetwork, POD_DEV_NETWORK } from '@podnetwork/wallet-browser';
 *
 * const result = await switchToPodNetwork();
 * if (!result.success && result.error?.includes('not found')) {
 *   // Network not added yet - prompt user to add it
 *   await addPodNetworkToWallet();
 * }
 * ```
 */
export async function switchToPodNetwork(
  config: PodNetworkConfig = POD_DEV_NETWORK,
  provider?: EIP1193Provider
): Promise<AddNetworkResult> {
  const ethereum = provider ?? getEthereumProvider();

  if (ethereum == null) {
    return {
      success: false,
      wasAdded: false,
      wasSwitched: false,
      error: "No browser wallet detected. Please install MetaMask or a compatible wallet.",
    };
  }

  const chainIdHex = toChainIdHex(config.chainId);

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });

    return {
      success: true,
      wasAdded: false,
      wasSwitched: true,
    };
  } catch (error) {
    if (isChainNotFoundError(error)) {
      return {
        success: false,
        wasAdded: false,
        wasSwitched: false,
        error: `pod network (chain ID ${config.chainId.toString()}) not found in wallet. Use addPodNetworkToWallet() to add it first.`,
      };
    }

    if (isUserRejectionError(error)) {
      return {
        success: false,
        wasAdded: false,
        wasSwitched: false,
        error: "User rejected the request to switch networks.",
      };
    }

    return {
      success: false,
      wasAdded: false,
      wasSwitched: false,
      error: error instanceof Error ? error.message : "Failed to switch to Pod network.",
    };
  }
}

/**
 * Check if a browser wallet is available.
 *
 * @returns True if window.ethereum or a custom provider is available
 */
export function isBrowserWalletAvailable(provider?: EIP1193Provider): boolean {
  if (provider != null) {
    return typeof provider.request === "function";
  }

  if (!isBrowser()) {
    return false;
  }

  const ethereum = getEthereumProvider();
  return ethereum != null && typeof ethereum.request === "function";
}

/**
 * Get the current chain ID from the browser wallet.
 *
 * @param provider - EIP-1193 provider (defaults to window.ethereum)
 * @returns The current chain ID, or null if unavailable
 */
export async function getCurrentChainId(provider?: EIP1193Provider): Promise<bigint | null> {
  const ethereum = provider ?? getEthereumProvider();

  if (ethereum == null) {
    return null;
  }

  try {
    const chainIdHex = (await ethereum.request({
      method: "eth_chainId",
      params: [],
    })) as string;

    return BigInt(chainIdHex);
  } catch {
    return null;
  }
}

/**
 * Check if the wallet is currently connected to a Pod network.
 *
 * @param config - Network configuration to check against
 * @param provider - EIP-1193 provider (defaults to window.ethereum)
 * @returns True if connected to the specified Pod network
 */
export async function isConnectedToPodNetwork(
  config: PodNetworkConfig = POD_DEV_NETWORK,
  provider?: EIP1193Provider
): Promise<boolean> {
  const currentChainId = await getCurrentChainId(provider);
  return currentChainId === config.chainId;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the Ethereum provider from the window object.
 */
function getEthereumProvider(): EIP1193Provider | undefined {
  if (!isBrowser()) {
    return undefined;
  }

  const win = globalThis as typeof globalThis & {
    ethereum?: EIP1193Provider;
  };

  return win.ethereum;
}

/**
 * Convert a bigint chain ID to hex string format.
 */
function toChainIdHex(chainId: bigint): `0x${string}` {
  return `0x${chainId.toString(16)}`;
}

/**
 * Build EIP-3085 addEthereumChain parameters from our config.
 */
function buildAddChainParams(config: PodNetworkConfig): {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
} {
  const params: {
    chainId: string;
    chainName: string;
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
    rpcUrls: string[];
    blockExplorerUrls?: string[];
  } = {
    chainId: toChainIdHex(config.chainId),
    chainName: config.chainName,
    nativeCurrency: {
      name: config.nativeCurrency.name,
      symbol: config.nativeCurrency.symbol,
      decimals: config.nativeCurrency.decimals,
    },
    rpcUrls: [config.rpcUrl],
  };

  if (config.blockExplorerUrl != null) {
    params.blockExplorerUrls = [config.blockExplorerUrl];
  }

  return params;
}

/**
 * Check if an error indicates the chain was not found (EIP-3085 error code 4902).
 */
function isChainNotFoundError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const err = error as { code?: number };
  return err.code === 4902;
}

/**
 * Check if an error is a user rejection error (EIP-1193 error code 4001).
 */
function isUserRejectionError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const err = error as { code?: number; message?: string };

  if (err.code === 4001) {
    return true;
  }

  if (
    typeof err.message === "string" &&
    (err.message.toLowerCase().includes("user rejected") ||
      err.message.toLowerCase().includes("user denied"))
  ) {
    return true;
  }

  return false;
}
