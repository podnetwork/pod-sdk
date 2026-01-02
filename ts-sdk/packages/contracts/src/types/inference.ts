import type {
  Abi,
  AbiFunction,
  AbiParametersToPrimitiveTypes,
  ExtractAbiFunction,
  ExtractAbiFunctionNames,
  ExtractAbiEvent,
  ExtractAbiEventNames,
  ExtractAbiError,
  ExtractAbiErrorNames,
} from "abitype";

/**
 * Extract the input types for a specific function
 */
export type FunctionInputs<
  TAbi extends Abi,
  TFunctionName extends ExtractAbiFunctionNames<TAbi>,
> = AbiParametersToPrimitiveTypes<ExtractAbiFunction<TAbi, TFunctionName>["inputs"], "inputs">;

/**
 * Extract the output types for a specific function
 */
export type FunctionOutputs<
  TAbi extends Abi,
  TFunctionName extends ExtractAbiFunctionNames<TAbi>,
> = AbiParametersToPrimitiveTypes<ExtractAbiFunction<TAbi, TFunctionName>["outputs"], "outputs">;

/**
 * Extract the single return type for a function (unwrapped if single output)
 */
export type FunctionReturnType<
  TAbi extends Abi,
  TFunctionName extends ExtractAbiFunctionNames<TAbi>,
> = ExtractAbiFunction<TAbi, TFunctionName>["outputs"] extends readonly [infer _Single]
  ? AbiParametersToPrimitiveTypes<ExtractAbiFunction<TAbi, TFunctionName>["outputs"], "outputs">[0]
  : AbiParametersToPrimitiveTypes<ExtractAbiFunction<TAbi, TFunctionName>["outputs"], "outputs">;

/**
 * Extract event argument types
 */
export type EventArgs<
  TAbi extends Abi,
  TEventName extends ExtractAbiEventNames<TAbi>,
> = AbiParametersToPrimitiveTypes<ExtractAbiEvent<TAbi, TEventName>["inputs"], "inputs">;

/**
 * Extract error argument types
 */
export type ErrorArgs<
  TAbi extends Abi,
  TErrorName extends ExtractAbiErrorNames<TAbi>,
> = AbiParametersToPrimitiveTypes<ExtractAbiError<TAbi, TErrorName>["inputs"], "inputs">;

/**
 * Check if a function is read-only (view/pure)
 */
export type IsReadFunction<TFunction extends AbiFunction> = TFunction["stateMutability"] extends
  | "view"
  | "pure"
  ? true
  : false;

/**
 * Check if a function is state-changing (nonpayable/payable)
 */
export type IsWriteFunction<TFunction extends AbiFunction> = TFunction["stateMutability"] extends
  | "nonpayable"
  | "payable"
  ? true
  : false;

/**
 * Extract only read functions from an ABI
 */
export type ReadFunctions<TAbi extends Abi> = {
  [K in ExtractAbiFunctionNames<TAbi>]: IsReadFunction<ExtractAbiFunction<TAbi, K>> extends true
    ? K
    : never;
}[ExtractAbiFunctionNames<TAbi>];

/**
 * Extract only write functions from an ABI
 */
export type WriteFunctions<TAbi extends Abi> = {
  [K in ExtractAbiFunctionNames<TAbi>]: IsWriteFunction<ExtractAbiFunction<TAbi, K>> extends true
    ? K
    : never;
}[ExtractAbiFunctionNames<TAbi>];

/**
 * Typed event callback for contract events.
 *
 * @example
 * ```typescript
 * // For a Transfer(address from, address to, uint256 amount) event:
 * type TransferCallback = TypedEventCallback<MyTokenAbi, 'Transfer'>;
 * // = (from: `0x${string}`, to: `0x${string}`, amount: bigint) => void
 * ```
 */
export type TypedEventCallback<TAbi extends Abi, TEventName extends ExtractAbiEventNames<TAbi>> = (
  ...args: AbiParametersToPrimitiveTypes<ExtractAbiEvent<TAbi, TEventName>["inputs"], "inputs">
) => void;

/**
 * Contract event listener entry for managing subscriptions.
 */
export interface ContractEventListener<
  TAbi extends Abi = Abi,
  TEventName extends ExtractAbiEventNames<TAbi> = ExtractAbiEventNames<TAbi>,
> {
  /** Event name */
  readonly eventName: TEventName;
  /** Callback function */
  readonly callback: TypedEventCallback<TAbi, TEventName>;
  /** Abort controller for cancellation */
  readonly controller: AbortController;
}

/**
 * Typed contract error with name and decoded arguments.
 *
 * @example
 * ```typescript
 * // For an error InsufficientBalance(uint256 available, uint256 required):
 * type MyError = TypedContractError<MyTokenAbi, 'InsufficientBalance'>;
 * // = { name: 'InsufficientBalance', args: [bigint, bigint] }
 * ```
 */
export interface TypedContractError<
  TAbi extends Abi,
  TErrorName extends ExtractAbiErrorNames<TAbi>,
> {
  /** Error name */
  readonly name: TErrorName;
  /** Decoded error arguments */
  readonly args: AbiParametersToPrimitiveTypes<
    ExtractAbiError<TAbi, TErrorName>["inputs"],
    "inputs"
  >;
  /** Raw error data */
  readonly data: `0x${string}`;
}
