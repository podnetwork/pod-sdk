/**
 * Contract-specific error codes (7xxx range)
 */
export const CONTRACT_ERRORS = {
  /** Invalid artifact format */
  INVALID_ARTIFACT: "POD_7001",
  /** Invalid ABI structure */
  INVALID_ABI: "POD_7002",
  /** Contract not found in registry */
  CONTRACT_NOT_FOUND: "POD_7003",
  /** Duplicate contract name */
  DUPLICATE_CONTRACT: "POD_7004",
  /** Contract call reverted */
  CALL_REVERTED: "POD_7005",
  /** Custom contract error */
  CUSTOM_ERROR: "POD_7006",
  /** Method not found in ABI */
  METHOD_NOT_FOUND: "POD_7007",
  /** Invalid method arguments */
  INVALID_ARGUMENTS: "POD_7008",
  /** Foundry not installed */
  FOUNDRY_NOT_INSTALLED: "POD_7009",
  /** Solidity compilation failed */
  COMPILATION_FAILED: "POD_7010",
} as const;

export type ContractErrorCode = (typeof CONTRACT_ERRORS)[keyof typeof CONTRACT_ERRORS];

/**
 * Options for constructing a ContractError
 */
export interface ContractErrorOptions {
  cause?: Error | undefined;
  suggestion?: string | undefined;
}

/**
 * Base error class for contract-related errors
 */
export abstract class ContractError extends Error {
  abstract readonly code: ContractErrorCode;
  abstract readonly isRetryable: boolean;
  readonly category = "CONTRACT" as const;
  readonly timestamp: number;
  readonly suggestion?: string;

  constructor(message: string, options?: ContractErrorOptions) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    this.timestamp = Date.now();
    if (options?.suggestion !== undefined) this.suggestion = options.suggestion;

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {
      name: this.name,
      code: this.code,
      message: this.message,
      isRetryable: this.isRetryable,
      category: this.category,
      timestamp: this.timestamp,
    };
    if (this.suggestion !== undefined) json["suggestion"] = this.suggestion;
    if (this.stack !== undefined) json["stack"] = this.stack;
    return json;
  }
}

/**
 * Error thrown when an invalid artifact format is encountered
 */
export class InvalidArtifactError extends ContractError {
  readonly code = CONTRACT_ERRORS.INVALID_ARTIFACT;
  readonly isRetryable = false;

  constructor(
    message: string,
    public readonly filePath?: string,
    options?: ContractErrorOptions
  ) {
    super(message, {
      ...options,
      suggestion:
        options?.suggestion ??
        "Ensure the file is a valid Foundry or Hardhat build artifact containing an ABI field.",
    });
  }
}

/**
 * Error thrown when an invalid ABI structure is encountered
 */
export class InvalidAbiError extends ContractError {
  readonly code = CONTRACT_ERRORS.INVALID_ABI;
  readonly isRetryable = false;

  constructor(message: string, options?: ContractErrorOptions) {
    super(message, {
      ...options,
      suggestion:
        options?.suggestion ?? "Check that the ABI follows the Ethereum ABI specification.",
    });
  }
}

/**
 * Error thrown when a contract is not found in the registry
 */
export class ContractNotFoundError extends ContractError {
  readonly code = CONTRACT_ERRORS.CONTRACT_NOT_FOUND;
  readonly isRetryable = false;

  constructor(
    public readonly contractName: string,
    options?: ContractErrorOptions
  ) {
    super(`Contract "${contractName}" not found in registry`, {
      ...options,
      suggestion:
        options?.suggestion ??
        `Register the contract first using client.contracts.add("${contractName}", address, abi).`,
    });
  }
}

/**
 * Error thrown when attempting to register a duplicate contract name
 */
export class DuplicateContractError extends ContractError {
  readonly code = CONTRACT_ERRORS.DUPLICATE_CONTRACT;
  readonly isRetryable = false;

  constructor(
    public readonly contractName: string,
    options?: ContractErrorOptions
  ) {
    super(`Contract "${contractName}" is already registered`, {
      ...options,
      suggestion:
        options?.suggestion ??
        `Use a different name or remove the existing contract first using client.contracts.remove("${contractName}").`,
    });
  }
}

/**
 * Error thrown when a contract call reverts
 */
export class ContractCallRevertedError extends ContractError {
  readonly code = CONTRACT_ERRORS.CALL_REVERTED;
  readonly isRetryable = false;

  constructor(
    message: string,
    public readonly revertData?: string,
    options?: ContractErrorOptions
  ) {
    super(message, {
      ...options,
      suggestion:
        options?.suggestion ??
        "Check the contract's requirements and ensure all preconditions are met.",
    });
  }
}

/**
 * Error representing a parsed custom Solidity error
 */
export class ContractRevertError extends ContractError {
  readonly code = CONTRACT_ERRORS.CUSTOM_ERROR;
  readonly isRetryable = false;

  constructor(
    public readonly errorName: string,
    public readonly errorArgs: readonly unknown[],
    public readonly rawData: string,
    options?: ContractErrorOptions
  ) {
    super(`Contract reverted with error: ${errorName}`, options);
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      errorName: this.errorName,
      errorArgs: this.errorArgs,
      rawData: this.rawData,
    };
  }
}

/**
 * Error thrown when a method is not found in the ABI
 */
export class MethodNotFoundError extends ContractError {
  readonly code = CONTRACT_ERRORS.METHOD_NOT_FOUND;
  readonly isRetryable = false;

  constructor(
    public readonly methodName: string,
    public readonly contractName?: string,
    options?: ContractErrorOptions
  ) {
    const target = contractName !== undefined ? ` in ${contractName}` : "";
    super(`Method "${methodName}" not found${target}`, {
      ...options,
      suggestion:
        options?.suggestion ??
        "Check that the method name is correct and the ABI includes this function.",
    });
  }
}

/**
 * Error thrown when invalid arguments are passed to a method
 */
export class InvalidArgumentsError extends ContractError {
  readonly code = CONTRACT_ERRORS.INVALID_ARGUMENTS;
  readonly isRetryable = false;

  constructor(
    public readonly methodName: string,
    public readonly expectedCount: number,
    public readonly actualCount: number,
    options?: ContractErrorOptions
  ) {
    super(
      `Method "${methodName}" expects ${String(expectedCount)} arguments, got ${String(actualCount)}`,
      options
    );
  }
}

/**
 * Error thrown when Foundry is not installed
 */
export class FoundryNotInstalledError extends ContractError {
  readonly code = CONTRACT_ERRORS.FOUNDRY_NOT_INSTALLED;
  readonly isRetryable = false;

  constructor(options?: ContractErrorOptions) {
    super("Foundry is required to compile .sol files", {
      ...options,
      suggestion:
        options?.suggestion ??
        `Foundry was not found on your system. To install Foundry, run:

  curl -L https://foundry.paradigm.xyz | bash
  foundryup

After installation, restart your terminal and try again.

Alternatively, compile your contracts first with 'forge build' and then
extract ABIs from the build artifacts:

  forge build
  pnpm extract-abi './out/**/*.json' -o ./abis/`,
    });
  }
}

/**
 * Error thrown when Solidity compilation fails
 */
export class CompilationFailedError extends ContractError {
  readonly code = CONTRACT_ERRORS.COMPILATION_FAILED;
  readonly isRetryable = false;

  constructor(
    public readonly solFilePath: string,
    public readonly compilerOutput: string,
    options?: ContractErrorOptions
  ) {
    super(`Solidity compilation failed for '${solFilePath}'`, {
      ...options,
      suggestion: options?.suggestion ?? "Fix the compilation errors and try again.",
    });
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      solFilePath: this.solFilePath,
      compilerOutput: this.compilerOutput,
    };
  }
}
