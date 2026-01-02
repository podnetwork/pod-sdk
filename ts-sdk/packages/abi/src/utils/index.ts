/**
 * Utils module for @podnetwork/abi
 *
 * Provides signature computation, ABI filtering, and comparison utilities.
 */

// Signature utilities
export {
  computeSelector,
  computeEventTopic,
  getSignature,
  getFunctionSignature,
  getEventSignature,
  getErrorSignature,
  type SignableAbiItem,
} from "./signature.js";

// Filter utilities
export {
  filterAbi,
  getAbiFunctions,
  getAbiEvents,
  getAbiErrors,
  getAbiItem,
  hasFunction,
  hasEvent,
  hasError,
  type AbiItemType,
  type AbiItem,
  type FilterOptions,
  type FunctionFilterOptions,
} from "./filter.js";

// Diff utilities
export { diffAbis, isBackwardsCompatible, type AbiDiff, type AbiItemChange } from "./diff.js";
