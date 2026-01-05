/**
 * @module @podnetwork/react
 * @description React hooks and headless components for pod SDK
 *
 * This package provides React-specific integration for the pod SDK.
 * It follows the headless pattern - providing logic and state management
 * without UI components, allowing full styling control.
 *
 * @example
 * ```tsx
 * import { PodProvider, useWallet, Hash } from '@podnetwork/react';
 *
 * function App() {
 *   return (
 *     <PodProvider network="dev">
 *       <WalletButton />
 *     </PodProvider>
 *   );
 * }
 *
 * function WalletButton() {
 *   const { status, address, isConnected, connect, disconnect } = useWallet();
 *
 *   if (isConnected && address) {
 *     return (
 *       <div>
 *         <Hash.Root value={address} truncate="middle" chars={6}>
 *           <Hash.Truncated className="font-mono" />
 *           <Hash.Copy />
 *         </Hash.Root>
 *         <button onClick={disconnect}>Disconnect</button>
 *       </div>
 *     );
 *   }
 *
 *   return (
 *     <button onClick={() => connect({ type: "browser" })}>
 *       Connect Wallet
 *     </button>
 *   );
 * }
 * ```
 */

export const VERSION = "0.1.0-dev.6" as const;

// Providers
export {
  WalletProvider,
  WalletContext,
  INITIAL_STATE,
  ClientProvider,
  ClientProviderError,
  useClient,
  useClientContext,
  PodProvider,
  PodProviderError,
  usePod,
} from "./providers/index.js";
export type {
  WalletProviderProps,
  ClientProviderProps,
  ClientContextValue,
  PodProviderProps,
  PodContextValue,
} from "./providers/index.js";

// Hooks
export {
  useWallet,
  WalletProviderError,
  useBalance,
  useTransaction,
  useOrderbook,
  useGasPrice,
  useEstimateGas,
  useChainId,
  useCommittee,
  useFinalizationStatus,
  useFaucet,
  useBids,
  useAuction,
  useNetworkValidation,
  useWalletAccounts,
  WalletAccountsProvider,
  WalletAccountsProviderError,
} from "./hooks/index.js";
export type {
  UseBalanceOptions,
  UseBalanceResult,
  UseTransactionOptions,
  UseTransactionResult,
  TransactionStatus,
  UseOrderbookOptions,
  UseOrderbookResult,
  ConnectionState,
  UseGasPriceOptions,
  UseGasPriceResult,
  UseEstimateGasOptions,
  UseEstimateGasResult,
  UseChainIdOptions,
  UseChainIdResult,
  UseCommitteeOptions,
  UseCommitteeResult,
  UseFinalizationStatusOptions,
  UseFinalizationStatusResult,
  FinalizationStage,
  UseFaucetOptions,
  UseFaucetResult,
  FaucetStatus,
  UseBidsOptions,
  UseBidsResult,
  BidConnectionState,
  UseAuctionOptions,
  UseAuctionResult,
  UseNetworkValidationOptions,
  UseNetworkValidationResult,
  WalletAccountsProviderProps,
  UseWalletAccountsResult,
} from "./hooks/index.js";

// Components
export {
  Hash,
  HashRoot,
  HashTruncated,
  HashFull,
  HashCopy,
  Address,
  AddressRoot,
  AddressTruncated,
  AddressCopy,
  TokenAmount,
  TokenAmountRoot,
  TokenAmountValue,
  TokenAmountSymbol,
  Timestamp,
  TimestampRoot,
  TimestampRelative,
  TimestampAbsolute,
  Transaction,
  TransactionRoot,
  TransactionHash,
  TransactionStatusComponent,
  TransactionReceiptComponent,
  TransactionValue,
  TransactionFrom,
  TransactionTo,
  TransactionGasUsed,
  TransactionBlockNumber,
  useTransactionContext,
  Orderbook,
  OrderbookRoot,
  OrderbookBids,
  OrderbookAsks,
  OrderbookSpread,
  OrderbookBestBid,
  OrderbookBestAsk,
  OrderbookDepth,
  useOrderbookContext,
  Committee,
  CommitteeRoot,
  CommitteeValidators,
  CommitteeQuorumSize,
  CommitteeTotalValidators,
  useCommitteeContext,
  Attestation,
  AttestationRoot,
  AttestationTimestamp,
  AttestationSignature,
  AttestationValidator,
  AttestationBlockNumber,
  AttestationList,
  AttestationListRoot,
  AttestationListItem,
  AttestationListCount,
  useAttestationContext,
  useAttestationListContext,
  FinalizationStatus,
  FinalizationStatusRoot,
  FinalizationStatusProgress,
  FinalizationStatusPercentage,
  FinalizationStatusBadge,
  FinalizationStatusAttestationCount,
  FinalizationStatusElapsedTime,
  useFinalizationStatusContext,
  TransactionList,
  TransactionListRoot,
  TransactionListItem,
  TransactionListCount,
  TransactionListEmpty,
  TransactionListLoading,
  useTransactionListContext,
  RequestDuration,
  RequestDurationRoot,
  RequestDurationValue,
  RequestDurationBreakdown,
  useRequestDurationContext,
  AddNetworkButton,
  AddNetworkButtonRoot,
  AddNetworkButtonTrigger,
  AddNetworkButtonStatus,
  useAddNetworkButtonContext,
  Avatar,
  AvatarRoot,
  AvatarImage,
  AvatarFallback,
  useAvatarContext,
  POD_AVATAR_COLORS,
  QrCode,
  QrCodeRoot,
  QrCodeImage,
  QrCodeLogo,
  useQrCodeContext,
  NetworkStatus,
  NetworkStatusRoot,
  NetworkStatusBadge,
  NetworkStatusName,
  NetworkStatusChainId,
  NetworkStatusSwitchButton,
  useNetworkStatusContext,
  AccountSwitcher,
  AccountSwitcherRoot,
  AccountSwitcherList,
  AccountSwitcherItem,
  AccountSwitcherActiveIndicator,
  AccountSwitcherManageButton,
  useAccountSwitcherContext,
  useAccountItemContext,
} from "./components/index.js";
export type {
  HashContextValue,
  HashRootProps,
  HashTruncatedProps,
  HashFullProps,
  HashCopyProps,
  CopyState,
  AddressContextValue,
  AddressRootProps,
  AddressTruncatedProps,
  AddressCopyProps,
  TokenAmountRootProps,
  TokenAmountValueProps,
  TokenAmountSymbolProps,
  TimestampRootProps,
  TimestampRelativeProps,
  TimestampAbsoluteProps,
  TransactionContextValue,
  TransactionRootProps,
  TransactionHashProps,
  TransactionStatusProps,
  TransactionReceiptProps,
  TransactionValueProps,
  TransactionFromProps,
  TransactionToProps,
  TransactionGasUsedProps,
  TransactionBlockNumberProps,
  OrderbookContextValue,
  OrderbookRootProps,
  OrderbookBidsProps,
  OrderbookAsksProps,
  OrderbookSpreadProps,
  OrderbookBestBidProps,
  OrderbookBestAskProps,
  OrderbookDepthProps,
  CommitteeContextValue,
  CommitteeRootProps,
  CommitteeValidatorsProps,
  CommitteeQuorumSizeProps,
  CommitteeTotalValidatorsProps,
  AttestationContextValue,
  AttestationRootProps,
  AttestationTimestampProps,
  AttestationSignatureProps,
  AttestationValidatorProps,
  AttestationBlockNumberProps,
  AttestationListContextValue,
  AttestationListRootProps,
  AttestationListItemProps,
  AttestationListCountProps,
  FinalizationStatusContextValue,
  FinalizationStatusRootProps,
  FinalizationStatusProgressProps,
  FinalizationStatusPercentageProps,
  FinalizationStatusBadgeProps,
  FinalizationStatusAttestationCountProps,
  FinalizationStatusElapsedTimeProps,
  TransactionListContextValue,
  TransactionListRootProps,
  TransactionListItemProps,
  TransactionListCountProps,
  TransactionListEmptyProps,
  TransactionListLoadingProps,
  RequestDurationContextValue,
  RequestDurationRootProps,
  RequestDurationValueProps,
  RequestDurationBreakdownProps,
  AddNetworkButtonContextValue,
  AddNetworkStatus,
  AddNetworkButtonRootProps,
  AddNetworkButtonTriggerProps,
  AddNetworkButtonStatusProps,
  AvatarContextValue,
  AvatarVariant,
  AvatarRootProps,
  AvatarImageProps,
  AvatarFallbackProps,
  QrCodeContextValue,
  ErrorCorrectionLevel,
  QrCodeRootProps,
  QrCodeImageProps,
  QrCodeLogoProps,
  NetworkStatusContextValue,
  NetworkStatusRootProps,
  NetworkStatusBadgeProps,
  NetworkStatusNameProps,
  NetworkStatusChainIdProps,
  NetworkStatusSwitchButtonProps,
  AccountSwitcherContextValue,
  AccountSwitcherRootProps,
  AccountSwitcherListProps,
  AccountSwitcherItemProps,
  AccountSwitcherActiveIndicatorProps,
  AccountSwitcherManageButtonProps,
} from "./components/index.js";

// Utilities
export {
  truncateHash,
  isValidHash,
  isValidAddress,
  isValidTxHash,
  copyToClipboard,
  isClipboardAvailable,
  isSSR,
  isWebSocketAvailable,
  browserOnly,
  formatTokenAmount,
  parseTokenAmount,
  formatTimestamp,
  relativeTime,
  formatDuration,
} from "./utils/index.js";
export type {
  TruncateHashOptions,
  FormatTokenAmountOptions,
  FormatTimestampOptions,
  FormatDurationOptions,
} from "./utils/index.js";

// Types
export type {
  // Error and retry types
  PodError,
  RetryConfig,
  RetryState,
  DataHookResult,
  SubscriptionHookResult,
  // Component types
  AsChildProps,
  BaseComponentProps,
  TruncateMode,
  // Wallet types
  WalletStatus,
  WalletType,
  ConnectOptions,
  WalletState,
  UseWalletReturn,
  // Network types
  NetworkPreset,
  // Domain types
  Validator,
  Committee as CommitteeType,
  Attestation as AttestationType,
  // Re-exported core types
  Address as AddressType,
  AnySigner,
  Signer,
  BroadcastingSigner,
  Hash as HashType,
  Transaction as TransactionType,
  TransactionReceipt,
  TransactionRequest,
  OrderBook,
  OrderLevel,
  AuctionStatus,
  AuctionBidInfo,
  BidEvent,
  EIP1193Provider,
} from "./types.js";

export { DEFAULT_RETRY_CONFIG } from "./types.js";

// Re-export useful functions from core
export { isBroadcastingSigner, PodClient } from "@podnetwork/core";

// Re-export network configs from wallet-browser for AddNetworkButton
export {
  POD_DEV_NETWORK,
  POD_CHRONOS_DEV_NETWORK,
  addPodNetworkToWallet,
  switchToPodNetwork,
  isBrowserWalletAvailable,
  getCurrentChainId,
  isConnectedToPodNetwork,
} from "@podnetwork/wallet-browser";
export type { PodNetworkConfig, AddNetworkResult } from "@podnetwork/wallet-browser";
