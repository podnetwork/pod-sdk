/**
 * Type exports for @podnetwork/abi
 *
 * This module provides type definitions for working with Ethereum ABIs.
 */

// Re-export abitype types
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
  AbiType,
  Address,
  ExtractAbiError,
  ExtractAbiErrorNames,
  ExtractAbiErrors,
  ExtractAbiEvent,
  ExtractAbiEventNames,
  ExtractAbiEvents,
  ExtractAbiFunction,
  ExtractAbiFunctionNames,
  ExtractAbiFunctions,
} from "./abi.js";

// Export Solidity type helpers
export {
  type Hex,
  type Log,
  type TransactionReceipt,
  SOLIDITY_INT_RANGES,
  isWithinBounds,
  normalizeIntType,
  isValidAddress,
  isValidHex,
  padHex,
} from "./solidity-types.js";

// Export type inference utilities
export type {
  ExtractFunctionNames,
  ExtractEventNames,
  ExtractErrorNames,
  GetFunction,
  GetEvent,
  GetError,
  HasFunction,
  HasEvent,
  HasError,
  AbiItem,
  AbiItemType,
} from "./inference.js";
