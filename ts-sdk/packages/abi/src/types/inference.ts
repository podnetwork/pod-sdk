/**
 * Type inference utilities for working with ABIs
 *
 * These utilities provide compile-time type inference for ABI operations
 * when using `as const` typed ABIs.
 */

import type { Abi, AbiFunction, AbiEvent, AbiError } from "abitype";

/**
 * Extract function names from an ABI
 */
export type ExtractFunctionNames<TAbi extends Abi> = Extract<
  TAbi[number],
  { type: "function" }
>["name"];

/**
 * Extract event names from an ABI
 */
export type ExtractEventNames<TAbi extends Abi> = Extract<TAbi[number], { type: "event" }>["name"];

/**
 * Extract error names from an ABI
 */
export type ExtractErrorNames<TAbi extends Abi> = Extract<TAbi[number], { type: "error" }>["name"];

/**
 * Get a specific function from an ABI by name
 */
export type GetFunction<TAbi extends Abi, TName extends string> = Extract<
  TAbi[number],
  { type: "function"; name: TName }
>;

/**
 * Get a specific event from an ABI by name
 */
export type GetEvent<TAbi extends Abi, TName extends string> = Extract<
  TAbi[number],
  { type: "event"; name: TName }
>;

/**
 * Get a specific error from an ABI by name
 */
export type GetError<TAbi extends Abi, TName extends string> = Extract<
  TAbi[number],
  { type: "error"; name: TName }
>;

/**
 * Check if an ABI has a specific function
 */
export type HasFunction<TAbi extends Abi, TName extends string> =
  GetFunction<TAbi, TName> extends never ? false : true;

/**
 * Check if an ABI has a specific event
 */
export type HasEvent<TAbi extends Abi, TName extends string> =
  GetEvent<TAbi, TName> extends never ? false : true;

/**
 * Check if an ABI has a specific error
 */
export type HasError<TAbi extends Abi, TName extends string> =
  GetError<TAbi, TName> extends never ? false : true;

/**
 * Union of all ABI item types
 */
export type AbiItem =
  | AbiFunction
  | AbiEvent
  | AbiError
  | { type: "constructor" }
  | { type: "fallback" }
  | { type: "receive" };

/**
 * Literal type for ABI item kinds
 */
export type AbiItemType = "function" | "event" | "error" | "constructor" | "fallback" | "receive";
