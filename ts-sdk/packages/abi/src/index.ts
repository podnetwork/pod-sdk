/**
 * @podnetwork/abi - ABI utilities for Pod Network
 *
 * A tree-shakeable TypeScript package for encoding, decoding, and managing
 * smart contract interfaces on Pod Network.
 *
 * For optimal bundle size, import from specific subpaths:
 * - @podnetwork/abi/decode - Event and error decoding
 * - @podnetwork/abi/encode - Function call encoding
 * - @podnetwork/abi/parse - Human-readable ABI parsing
 * - @podnetwork/abi/utils - Signature computation and ABI utilities
 * - @podnetwork/abi/registry - Address-based ABI management
 * - @podnetwork/abi/lookup - ABI discovery (requires @shazow/whatsabi)
 * - @podnetwork/abi/abis - Bundled ABIs
 * - @podnetwork/abi/abis/builtins - Pod Network contract ABIs
 * - @podnetwork/abi/abis/common - ERC standard ABIs
 * - @podnetwork/abi/schemas - Zod schemas for validation
 * - @podnetwork/abi/types - Type definitions
 */

// ============================================================================
// Decode (most common operations)
// ============================================================================
export {
  decodeEventLog,
  decodeEventLogStrict,
  getEventTopic,
  getEventTopics,
  buildEventFilter,
  decodeError,
  isError,
  getErrorSelector,
  getErrorSelectors,
  decodeCalldata,
  decodeFunction,
  decodeReturnValue,
  decodeFunctionResult,
  decodeReceiptLogs,
  decodeReceiptLogsWithUnknown,
  isDecodedEventLog,
  isUnknownLog,
  type DecodedEventLog,
  type DecodedError,
  type DecodedFunction,
  type EventFilter,
  type UnknownLog,
  type DecodeOptions,
} from "./decode/index.js";

// ============================================================================
// Encode
// ============================================================================
export {
  encodeFunction,
  getFunctionSelector,
  getFunctionSelectors,
  encodeConstructor,
  hasConstructorParams,
  getConstructorParamCount,
} from "./encode/index.js";

// ============================================================================
// Parse
// ============================================================================
export { parseAbi, parseAbiItem, formatAbi, formatAbiItem } from "./parse/index.js";

// ============================================================================
// Utils
// ============================================================================
export {
  computeSelector,
  computeEventTopic,
  getSignature,
  getFunctionSignature,
  getEventSignature,
  getErrorSignature,
  filterAbi,
  getAbiFunctions,
  getAbiEvents,
  getAbiErrors,
  getAbiItem,
  hasFunction,
  hasEvent,
  hasError,
  diffAbis,
  isBackwardsCompatible,
  type AbiItemType,
  type AbiItem,
  type FilterOptions,
  type FunctionFilterOptions,
  type AbiDiff,
  type AbiItemChange,
} from "./utils/index.js";

// ============================================================================
// Registry
// ============================================================================
export { createRegistry, type AbiRegistry, type RegistryOptions } from "./registry/index.js";

// ============================================================================
// Bundled ABIs (convenience - for tree-shaking use subpaths)
// ============================================================================
export {
  // Common ERCs
  ERC20_ABI,
  ERC721_ABI,
  ERC1155_ABI,
  ERC2612_ABI,
  ERC4626_ABI,
  // Pod built-ins
  CLOB_ABI,
  CLOB_ADDRESS,
  OPTIMISTIC_AUCTION_ABI,
  OPTIMISTIC_AUCTION_ADDRESS,
  POD_ERC20_ABI,
  POD_ADDRESSES,
  Side,
  BidStatus,
  type ERC20Abi,
  type ERC721Abi,
  type ERC1155Abi,
  type ERC2612Abi,
  type ERC4626Abi,
  type ClobAbi,
  type OptimisticAuctionAbi,
  type PodErc20Abi,
  type PodAddresses,
  type SideType,
  type BidStatusType,
} from "./abis/index.js";

// ============================================================================
// Types (from abitype)
// ============================================================================
export type {
  Abi,
  AbiConstructor,
  AbiError,
  AbiEvent,
  AbiFallback,
  AbiFunction,
  AbiParameter,
  AbiReceive,
  AbiStateMutability,
} from "abitype";

// ============================================================================
// Errors
// ============================================================================
export {
  AbiError as AbiPackageError,
  EventNotFoundError,
  ErrorNotFoundError,
  FunctionNotFoundError,
  AmbiguousFunctionError,
  AnonymousEventError,
  DuplicateRegistrationError,
  TypeBoundsError,
  ParseError,
  WhatsAbiNotInstalledError,
  LookupServiceError,
} from "./errors/index.js";

// ============================================================================
// Lookup (NOT re-exported - import from @podnetwork/abi/lookup)
// ============================================================================
// Lookup functions are intentionally not exported from main entry
// to avoid bundling the optional WhatsABI dependency.
// Import from: import { lookupAbi } from "@podnetwork/abi/lookup";
