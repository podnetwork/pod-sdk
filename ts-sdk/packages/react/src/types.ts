/**
 * @module types
 * @description Type definitions for @podnetwork/react
 */

import type {
  Address,
  AnySigner,
  Signer,
  BroadcastingSigner,
  Hash,
  Transaction,
  TransactionReceipt,
  TransactionRequest,
  Validator,
  Committee,
  PodError,
} from "@podnetwork/core";
import type { EIP1193Provider } from "@podnetwork/wallet-browser";
import type { OrderBook, OrderLevel } from "@podnetwork/orderbook";
import type { AuctionStatus } from "@podnetwork/auction";
import type { AuctionBidInfo } from "@podnetwork/ws";
import type { BidEvent } from "@podnetwork/ws";

// ============================================================================
// Retry Configuration
// ============================================================================

/**
 * Configuration for automatic retry behavior.
 * @category Types
 */
export interface RetryConfig {
  /** Maximum number of retry attempts. Set to 0 to disable. Default: 5 */
  readonly maxRetries?: number;
  /** Initial delay before first retry in ms. Default: 1000 */
  readonly baseDelay?: number;
  /** Maximum delay between retries in ms. Default: 32000 */
  readonly maxDelay?: number;
  /** Multiplier for exponential backoff. Default: 2 */
  readonly backoffFactor?: number;
  /** Random variance factor (0-1). Default: 0.1 */
  readonly jitter?: number;
}

/**
 * Current retry state exposed by hooks.
 * @category Types
 */
export interface RetryState {
  /** Current retry attempt number (0 = initial attempt) */
  readonly attempt: number;
  /** When the next retry will occur, or null if not retrying */
  readonly nextRetryAt: Date | null;
  /** Whether a retry is currently scheduled */
  readonly isRetrying: boolean;
}

/**
 * Default retry configuration used by all hooks.
 */
export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 32000,
  backoffFactor: 2,
  jitter: 0.1,
} as const;

// ============================================================================
// Common Hook Return Patterns
// ============================================================================

/**
 * Base return type for data-fetching hooks.
 * @category Types
 */
export interface DataHookResult<T> {
  /** The fetched data, or null if loading/error */
  readonly data: T | null;
  /** Whether the initial fetch is in progress */
  readonly isLoading: boolean;
  /** Whether a refresh is in progress (after initial load) */
  readonly isRefreshing: boolean;
  /** Error from the most recent fetch attempt */
  readonly error: PodError | null;
  /** Current retry state */
  readonly retry: RetryState;
  /** Manually trigger a refresh */
  readonly refresh: () => void;
}

/**
 * Base return type for subscription hooks with real-time updates.
 * @category Types
 */
export interface SubscriptionHookResult<T> extends DataHookResult<T> {
  /** Connection state for the subscription */
  readonly connectionState: "connecting" | "connected" | "disconnected" | "error";
  /** Timestamp of the last received update */
  readonly lastUpdate: Date | null;
}

// ============================================================================
// Component Base Props
// ============================================================================

/**
 * Base props for all components supporting asChild.
 * @category Components
 */
export interface AsChildProps {
  /** Render as child element instead of default element */
  readonly asChild?: boolean;
}

/**
 * Base props for all components.
 * @category Components
 */
export interface BaseComponentProps extends AsChildProps {
  /** Custom class name */
  className?: string;
}

/**
 * Truncation mode for hash/address display.
 * @category Components
 */
export type TruncateMode = "start" | "middle" | "end" | "none";

// ============================================================================
// Wallet Types (existing)
// ============================================================================

/**
 * Wallet connection status.
 */
export type WalletStatus = "disconnected" | "connecting" | "connected" | "error";

/**
 * Wallet type identifier.
 */
export type WalletType = "local" | "browser";

/**
 * Options for connecting a wallet.
 */
export type ConnectOptions =
  | { type: "browser"; provider?: EIP1193Provider }
  | { type: "privateKey"; privateKey: string }
  | { type: "mnemonic"; phrase: string; index?: number }
  | { type: "generate" };

/**
 * Internal wallet state.
 */
export interface WalletState {
  status: WalletStatus;
  signer: AnySigner | null;
  address: Address | null;
  walletType: WalletType | null;
  error: PodError | null;
}

/**
 * Return type of the useWallet hook.
 */
export interface UseWalletReturn {
  // State
  status: WalletStatus;
  signer: AnySigner | null;
  address: Address | null;
  walletType: WalletType | null;
  error: PodError | null;

  // Computed
  isConnected: boolean;
  isBrowserWallet: boolean;
  isLocalWallet: boolean;

  // Actions
  connect: (options: ConnectOptions) => Promise<void>;
  disconnect: () => void;

  // Utilities
  generateWallet: () => Promise<void>;
  isBrowserAvailable: () => boolean;
}

/**
 * Context value for wallet provider.
 */
export interface WalletContextValue {
  state: WalletState;
  dispatch: React.Dispatch<WalletAction>;
}

/**
 * Actions for wallet state reducer.
 */
export type WalletAction =
  | { type: "CONNECT_START"; walletType: WalletType }
  | { type: "CONNECT_SUCCESS"; signer: AnySigner; address: Address; walletType: WalletType }
  | { type: "CONNECT_ERROR"; error: PodError }
  | { type: "DISCONNECT" };

// ============================================================================
// Network Presets
// ============================================================================

/**
 * Network preset options for provider configuration.
 * @category Providers
 */
export type NetworkPreset = "dev" | "local" | "chronosDev";

// ============================================================================
// Validator Types (re-exported from @podnetwork/core)
// ============================================================================

// Validator and Committee types are re-exported from @podnetwork/core
// See the re-exports section at the bottom of this file

// ============================================================================
// Attestation Types
// ============================================================================

/**
 * Attestation data structure.
 * @category Types
 */
export interface Attestation {
  /** Validator address */
  readonly validator: Address;
  /** Signature bytes */
  readonly signature: string;
  /** Timestamp offset in milliseconds */
  readonly timeOffset: number;
  /** Block number */
  readonly blockNumber: bigint;
}

// Re-exports for convenience
export type {
  Address,
  AnySigner,
  Signer,
  BroadcastingSigner,
  EIP1193Provider,
  Hash,
  Transaction,
  TransactionReceipt,
  TransactionRequest,
  OrderBook,
  OrderLevel,
  AuctionStatus,
  AuctionBidInfo,
  BidEvent,
  Validator,
  Committee,
  PodError,
};
