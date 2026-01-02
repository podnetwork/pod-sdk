/**
 * @module pod-sdk
 * @description The official Pod Network SDK for TypeScript
 *
 * This is the main entry point that re-exports all SDK functionality.
 * For tree-shaking, consider importing from specific submodules:
 *
 * @example
 * ```typescript
 * // Import everything
 * import * as PodSdk from "pod-sdk";
 *
 * // Import specific modules for tree-shaking
 * import { ... } from "pod-sdk/core";
 * import { ... } from "pod-sdk/wallet";
 * ```
 */

export * from "@podnetwork/core";

// Re-export wallet without duplicating types from core
export {
  VERSION as WALLET_VERSION,
  Mnemonic,
  DEFAULT_DERIVATION_PATH,
  Wallet,
  BrowserWalletSigner,
  saveKeystore,
  loadKeystore,
  isValidKeystore,
  getKeystoreAddress,
  warnBrowserPrivateKey,
} from "@podnetwork/wallet";
export type {
  MnemonicWordCount,
  EIP1193Provider,
  BrowserWalletConnectOptions,
  KeystoreV3,
  KeystoreOptions,
} from "@podnetwork/wallet";

// Re-export ws without duplicating types from core
export {
  VERSION as WS_VERSION,
  WsNamespace,
  createWsNamespace,
  createWsNamespaceFromConfig,
  WebSocketConnection,
  ReconnectionManager,
  calculateDelay,
  shouldReconnect,
  resolveBackoffPolicy,
  waitForReconnect,
  isNeverReconnect,
  isExponentialBackoff,
  DEFAULT_RECONNECT_POLICY,
  DEFAULT_SUBSCRIPTION_OPTIONS,
  DEFAULT_WS_CONFIG,
  OrderBookUpdateSchema,
  OrderBookUpdateHelper,
  SideSchema,
  BidEventSchema,
  AuctionBidEventSchema,
  AuctionBidEventHelper,
} from "@podnetwork/ws";
export type {
  CreateWsNamespaceConfig,
  ConnectionEvent,
  ConnectionEventCallback,
  ResolvedBackoffPolicy,
  SubscriptionOptions,
  ReconnectPolicy,
  NeverReconnectPolicy,
  ExponentialBackoffPolicy,
  WsConfig,
  OrderbookSubscriptionOptions,
  BidSubscriptionOptions,
  AuctionBidSubscriptionOptions,
  ConnectionState,
  WebSocketChannel,
  WsSubscriptionParams,
  SubscriptionState,
  OrderLevelUpdate,
  OrderBookUpdate,
  Side,
  CLOBBidInfo,
  BidEvent,
  AuctionBidInfo,
  AuctionBidEvent,
} from "@podnetwork/ws";
export * from "@podnetwork/orderbook";
export * from "@podnetwork/auction";
export * from "@podnetwork/faucet";

// Re-export contracts without duplicating types from core
export {
  AbiParameterSchema,
  AbiFunctionSchema,
  AbiEventSchema,
  AbiErrorSchema,
  AbiConstructorSchema,
  AbiFallbackSchema,
  AbiReceiveSchema,
  AbiItemSchema,
  AbiSchema,
  FoundryArtifactSchema,
  HardhatArtifactSchema,
  BuildArtifactSchema,
  detectArtifactFormat,
  parseArtifact,
  safeParseArtifact,
  getSolidityTypeDescription,
  isValueType,
  isDynamicType,
  CONTRACT_ERRORS,
  ContractError,
  InvalidArtifactError,
  InvalidAbiError,
  ContractNotFoundError,
  DuplicateContractError,
  ContractCallRevertedError,
  ContractRevertError,
  MethodNotFoundError,
  InvalidArgumentsError,
  FoundryNotInstalledError,
  CompilationFailedError,
  TypedContract,
  PendingContractTransaction,
  ContractsNamespace,
} from "@podnetwork/contracts";
export type {
  AbiParameterParsed,
  AbiItemParsed,
  AbiFunctionParsed,
  AbiEventParsed,
  AbiErrorParsed,
  AbiConstructorParsed,
  AbiParsed,
  FoundryArtifact,
  HardhatArtifact,
  BuildArtifact,
  ArtifactFormat,
  Abi,
  AbiConstructor as AbiConstructorType,
  AbiError as AbiErrorType,
  AbiEvent as AbiEventType,
  AbiFallback,
  AbiFunction as AbiFunctionType,
  AbiParameter as AbiParameterType,
  AbiReceive,
  AbiStateMutability,
  AbiType,
  ExtractAbiError,
  ExtractAbiErrorNames,
  ExtractAbiErrors,
  ExtractAbiEvent,
  ExtractAbiEventNames,
  ExtractAbiEvents,
  ExtractAbiFunction,
  ExtractAbiFunctionNames,
  ExtractAbiFunctions,
  FunctionInputs,
  FunctionOutputs,
  FunctionReturnType,
  EventArgs,
  ErrorArgs,
  IsReadFunction,
  IsWriteFunction,
  ReadFunctions,
  WriteFunctions,
  TypedEventCallback,
  ContractEventListener,
  TypedContractError,
  ContractErrorCode,
  ContractErrorOptions,
  ContractAddress,
  TransactionSender,
  ContractSigner,
  CallOptions,
  TypedContractReadMethods,
  TypedContractWriteMethods,
  DecodedContractEvent,
  ContractEventFilter,
  ContractLog,
} from "@podnetwork/contracts";

export const VERSION = "0.1.0" as const;
