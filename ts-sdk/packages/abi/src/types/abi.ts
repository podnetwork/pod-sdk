/**
 * Re-export ABIType types for user convenience
 *
 * ABIType provides compile-time type inference from ABI definitions.
 * Users can import these types from @podnetwork/abi directly.
 */
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
} from "abitype";

/**
 * Type-level utilities for ABI type extraction
 */
export type {
  ExtractAbiError,
  ExtractAbiErrorNames,
  ExtractAbiErrors,
  ExtractAbiEvent,
  ExtractAbiEventNames,
  ExtractAbiEvents,
  ExtractAbiFunction,
  ExtractAbiFunctionNames,
  ExtractAbiFunctions,
} from "abitype";
