/**
 * Error types for @podnetwork/abi package
 *
 * All errors extend the base AbiError class for easy instanceof checks.
 */

// External types
type Address = `0x${string}`;
type Hex = `0x${string}`;

interface Log {
  address: Address;
  topics: readonly Hex[];
  data: Hex;
}

/**
 * Base error class for all ABI operations
 */
export class AbiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AbiError";
    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when event signature not found in ABI (strict mode)
 * @see FR-003
 */
export class EventNotFoundError extends AbiError {
  readonly topic: Hex;

  constructor(topic: Hex) {
    super(`Event with topic ${topic} not found in ABI`);
    this.name = "EventNotFoundError";
    this.topic = topic;
  }
}

/**
 * Thrown when error selector not found in ABI
 * @see FR-010
 */
export class ErrorNotFoundError extends AbiError {
  readonly selector: Hex;

  constructor(selector: Hex) {
    super(`Error with selector ${selector} not found in ABI`);
    this.name = "ErrorNotFoundError";
    this.selector = selector;
  }
}

/**
 * Thrown when function not found in ABI
 */
export class FunctionNotFoundError extends AbiError {
  readonly functionName: string;

  constructor(name: string) {
    super(`Function "${name}" not found in ABI`);
    this.name = "FunctionNotFoundError";
    this.functionName = name;
  }
}

/**
 * Thrown when function name matches multiple overloads
 * @see FR-017
 */
export class AmbiguousFunctionError extends AbiError {
  readonly functionName: string;
  readonly signatures: readonly string[];

  constructor(name: string, signatures: readonly string[]) {
    super(
      `Function "${name}" has ${String(signatures.length)} overloads. ` +
        `Use full signature: ${signatures.join(" or ")}`
    );
    this.name = "AmbiguousFunctionError";
    this.functionName = name;
    this.signatures = signatures;
  }
}

/**
 * Thrown when attempting to decode anonymous event (strict mode)
 * @see FR-007
 */
export class AnonymousEventError extends AbiError {
  readonly log: Log;

  constructor(log: Log) {
    super("Cannot decode anonymous event (no topic0)");
    this.name = "AnonymousEventError";
    this.log = log;
  }
}

/**
 * Thrown when encoding value exceeds Solidity type bounds
 * @see FR-018
 */
export class TypeBoundsError extends AbiError {
  readonly paramName: string;
  readonly paramType: string;
  readonly value: unknown;

  constructor(paramName: string, paramType: string, value: unknown) {
    super(`Value for "${paramName}" exceeds ${paramType} bounds`);
    this.name = "TypeBoundsError";
    this.paramName = paramName;
    this.paramType = paramType;
    this.value = value;
  }
}

/**
 * Thrown when human-readable signature is malformed
 * @see FR-025
 */
export class ParseError extends AbiError {
  readonly position: number;
  readonly signature: string;

  constructor(message: string, position: number, signature: string) {
    super(`${message} at position ${String(position)}: "${signature}"`);
    this.name = "ParseError";
    this.position = position;
    this.signature = signature;
  }
}

/**
 * Thrown when registering duplicate address with onDuplicate="error"
 * @see FR-039
 */
export class DuplicateRegistrationError extends AbiError {
  readonly address: Address;

  constructor(address: Address) {
    super(`ABI already registered for address ${address}`);
    this.name = "DuplicateRegistrationError";
    this.address = address;
  }
}

/**
 * Thrown when @shazow/whatsabi is not installed
 */
export class WhatsAbiNotInstalledError extends AbiError {
  constructor() {
    super(
      "WhatsABI not installed. Run: pnpm add @shazow/whatsabi\n" +
        "This dependency is optional and only needed for ABI lookup features."
    );
    this.name = "WhatsAbiNotInstalledError";
  }
}

/**
 * Thrown when lookup service is unavailable (strict mode)
 * @see FR-044
 */
export class LookupServiceError extends AbiError {
  readonly service: string;

  constructor(service: string) {
    super(`ABI lookup service "${service}" is unavailable`);
    this.name = "LookupServiceError";
    this.service = service;
  }
}
