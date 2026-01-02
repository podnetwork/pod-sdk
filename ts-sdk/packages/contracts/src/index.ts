/**
 * @module @podnetwork/contracts
 * @description Smart contract utilities for Pod Network SDK
 *
 * This package provides:
 * - CLI tool for extracting ABIs from Foundry/Hardhat artifacts
 * - Type-safe contract registration and method invocation
 * - Full TypeScript type inference from ABI definitions
 *
 * @example
 * ```typescript
 * import { PodClient } from "@podnetwork/core";
 * import { myTokenAbi } from "./abis/myToken.js";
 *
 * const client = PodClient.dev();
 *
 * // Register contract with full type inference
 * const token = client.contracts.add(
 *   "myToken",
 *   "0x...",
 *   myTokenAbi
 * );
 *
 * // Type-safe method calls
 * const balance = await token.balanceOf("0x...");
 * ```
 */

// Schemas for artifact validation
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
} from "./schemas/index.js";

export type {
  AbiParameter as AbiParameterParsed,
  AbiItem as AbiItemParsed,
  AbiFunction as AbiFunctionParsed,
  AbiEvent as AbiEventParsed,
  AbiError as AbiErrorParsed,
  AbiConstructor as AbiConstructorParsed,
  Abi as AbiParsed,
  FoundryArtifact,
  HardhatArtifact,
  BuildArtifact,
  ArtifactFormat,
} from "./schemas/index.js";

// Type utilities (re-exports from abitype)
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
} from "./types/index.js";

// Solidity type utilities
export { getSolidityTypeDescription, isValueType, isDynamicType } from "./types/index.js";

// Contract errors
export {
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
} from "./errors/index.js";

export type { ContractErrorCode, ContractErrorOptions } from "./errors/index.js";

// Contract interaction classes
export { TypedContract, PendingContractTransaction } from "./contract.js";

export type {
  Address as ContractAddress,
  TransactionSender,
  ContractSigner,
  CallOptions,
  TypedContractReadMethods,
  TypedContractWriteMethods,
  DecodedContractEvent,
  ContractEventFilter,
  ContractLog,
} from "./contract.js";

// Contract namespace/registry
export { ContractsNamespace } from "./namespace.js";
