/**
 * @module errors/pod-error
 * @description Base error class for all pod SDK errors
 */

import {
  type PodErrorCategory,
  type PodErrorCode,
  type PodErrorSeverity,
  ERROR_CODE_METADATA,
  POD_ERRORS,
} from "./codes.js";

/**
 * Documentation URL for pod SDK.
 */
const DOCS_URL = "https://docs.v1.pod.network/";

/**
 * JSON representation of a PodError.
 */
export interface PodErrorJson {
  /** Error class name */
  name: string;
  /** Unified error code (POD_XXXX format) */
  code: PodErrorCode;
  /** Human-readable error message */
  message: string;
  /** Whether this error can be retried */
  isRetryable: boolean;
  /** Error severity level */
  severity: PodErrorSeverity;
  /** Error category */
  category: PodErrorCategory;
  /** Timestamp when error occurred (ms since epoch) */
  timestamp: number;
  /** Actionable suggestion for resolving the error */
  suggestion?: string;
  /** Link to relevant documentation */
  docsUrl?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Stack trace */
  stack?: string;
  /** Additional error-specific data */
  [key: string]: unknown;
}

/**
 * Options for constructing a PodError.
 */
export interface PodErrorOptions {
  /** The original error that caused this error */
  cause?: Error;
  /** Override the default severity */
  severity?: PodErrorSeverity;
  /** Override the default suggestion */
  suggestion?: string;
  /** Override the default docs URL */
  docsUrl?: string;
  /** Request ID for tracing */
  requestId?: string;
}

/**
 * Base error class for all pod SDK errors.
 *
 * All pod SDK errors extend this class, providing:
 * - Unified error codes (POD_XXXX format)
 * - Retryability information
 * - Severity levels
 * - Actionable suggestions
 * - Documentation links
 * - Timestamp tracking
 * - Request ID for tracing
 * - JSON serialization for logging
 *
 * @example
 * ```typescript
 * import { PodError } from '@podnetwork/core';
 *
 * try {
 *   await client.tx.sendTransaction(tx, wallet);
 * } catch (err) {
 *   const podError = PodError.from(err);
 *
 *   console.log(podError.code);        // "POD_2001"
 *   console.log(podError.message);     // "Insufficient funds"
 *   console.log(podError.suggestion);  // "Request tokens from the faucet..."
 *   console.log(podError.isRetryable); // false
 *
 *   // Log structured error
 *   logger.error(podError.toJSON());
 * }
 * ```
 */
export abstract class PodError extends Error {
  /**
   * Unified error code in POD_XXXX format.
   *
   * Code ranges by category:
   * - 1xxx: Network errors
   * - 2xxx: Funding errors
   * - 3xxx: Execution errors
   * - 4xxx: Wallet errors
   * - 5xxx: Auction errors
   * - 6xxx: Orderbook errors
   */
  abstract readonly code: PodErrorCode;

  /**
   * Whether this error can be retried.
   *
   * If true, the operation that caused this error may succeed
   * if retried, possibly after a delay.
   */
  abstract readonly isRetryable: boolean;

  /**
   * Error severity level.
   *
   * - `info`: Informational, not necessarily an error
   * - `warning`: Potentially recoverable issue
   * - `error`: Error that prevented the operation
   * - `critical`: Severe error that may affect other operations
   */
  readonly severity: PodErrorSeverity;

  /**
   * Error category.
   */
  readonly category: PodErrorCategory;

  /**
   * Timestamp when the error occurred (ms since epoch).
   */
  readonly timestamp: number;

  /**
   * Actionable suggestion for resolving the error.
   */
  readonly suggestion?: string;

  /**
   * Link to relevant documentation.
   */
  readonly docsUrl: string;

  /**
   * Request ID for tracing.
   * Can be used to correlate errors with specific requests.
   */
  readonly requestId?: string;

  constructor(message: string, options?: PodErrorOptions) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    this.timestamp = Date.now();
    this.severity = options?.severity ?? "error";
    this.category = "NETWORK"; // Will be overridden by subclasses
    if (options?.suggestion !== undefined) this.suggestion = options.suggestion;
    this.docsUrl = options?.docsUrl ?? DOCS_URL;
    if (options?.requestId !== undefined) this.requestId = options.requestId;

    // Capture stack trace in V8 environments (Node.js, Chrome)
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Normalize any error to a PodError.
   *
   * This is the primary way to convert unknown errors (from RPC, ethers,
   * fetch, etc.) into structured PodError instances.
   *
   * @param error - The error to normalize
   * @param requestId - Optional request ID for tracing
   * @returns A PodError instance
   *
   * @example
   * ```typescript
   * try {
   *   await fetch(url);
   * } catch (err) {
   *   throw PodError.from(err);
   * }
   * ```
   */
  static from(error: unknown, requestId?: string): PodError {
    // Already a PodError - just return it
    if (error instanceof PodError) {
      return error;
    }

    // Import normalizer dynamically to avoid circular dependency
    // The normalizer will classify the error and return the appropriate PodError subclass
    return normalizeUnknownError(error, requestId);
  }

  /**
   * Serialize the error to JSON for logging.
   *
   * @returns JSON representation of the error
   *
   * @example
   * ```typescript
   * logger.error(podError.toJSON());
   * ```
   */
  toJSON(): PodErrorJson {
    const json: Record<string, unknown> = {
      name: this.name,
      code: this.code,
      message: this.message,
      isRetryable: this.isRetryable,
      severity: this.severity,
      category: this.category,
      timestamp: this.timestamp,
      docsUrl: this.docsUrl,
    };
    if (this.suggestion !== undefined) json["suggestion"] = this.suggestion;
    if (this.requestId !== undefined) json["requestId"] = this.requestId;
    if (this.stack !== undefined) json["stack"] = this.stack;
    return json as PodErrorJson;
  }
}

/**
 * Unknown error for cases where the error cannot be classified.
 *
 * This is used as a fallback when normalizing unknown errors.
 */
export class PodUnknownError extends PodError {
  readonly code = POD_ERRORS.UNKNOWN;
  readonly isRetryable = false;
  override readonly category: PodErrorCategory = "NETWORK";

  constructor(message: string, options?: PodErrorOptions) {
    const metadata = ERROR_CODE_METADATA[POD_ERRORS.UNKNOWN];
    super(message, {
      ...options,
      severity: options?.severity ?? metadata.severity,
      suggestion: options?.suggestion ?? metadata.suggestion,
    });
  }

  /**
   * Create an unknown error from any error.
   */
  static fromError(error: unknown, requestId?: string): PodUnknownError {
    const opts: PodErrorOptions = {};
    if (requestId !== undefined) opts.requestId = requestId;

    if (error instanceof Error) {
      opts.cause = error;
      return new PodUnknownError(error.message, opts);
    }
    if (typeof error === "string") {
      return new PodUnknownError(error, Object.keys(opts).length > 0 ? opts : undefined);
    }
    return new PodUnknownError(
      "An unknown error occurred",
      Object.keys(opts).length > 0 ? opts : undefined
    );
  }
}

/**
 * Internal function to normalize unknown errors.
 * Uses the normalizer module for comprehensive error classification.
 */
function normalizeUnknownError(error: unknown, requestId?: string): PodError {
  // Import dynamically to avoid circular dependency during module initialization
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const normalizer = require("./normalizer.js") as {
    normalizeError: (error: unknown, requestId?: string) => PodError;
  };
  return normalizer.normalizeError(error, requestId);
}
