/**
 * @module errors/funding
 * @description Funding-related errors (insufficient funds, gas, faucet)
 */

import { ERROR_CODE_METADATA, type PodErrorCategory, POD_ERRORS } from "./codes.js";
import { PodError, type PodErrorJson, type PodErrorOptions } from "./pod-error.js";

/**
 * Funding error codes (2xxx range).
 */
export type PodFundingErrorCode =
  | typeof POD_ERRORS.INSUFFICIENT_FUNDS
  | typeof POD_ERRORS.GAS_TOO_LOW
  | typeof POD_ERRORS.UNDERPRICED
  | typeof POD_ERRORS.REPLACEMENT_UNDERPRICED
  | typeof POD_ERRORS.FAUCET_RATE_LIMITED
  | typeof POD_ERRORS.FAUCET_UNAVAILABLE
  | typeof POD_ERRORS.FAUCET_REQUEST_FAILED;

/**
 * Funding-related errors.
 *
 * These errors occur when there are issues with account funding,
 * gas pricing, or faucet requests.
 *
 * @example
 * ```typescript
 * import { PodFundingError } from '@podnetwork/core';
 *
 * try {
 *   await client.tx.sendTransaction(tx, wallet);
 * } catch (error) {
 *   if (error instanceof PodFundingError) {
 *     console.log(error.code);     // "POD_2001"
 *     console.log(error.suggestion); // "Request tokens from the faucet..."
 *   }
 * }
 * ```
 */
export class PodFundingError extends PodError {
  readonly code: PodFundingErrorCode;
  readonly isRetryable: boolean;
  override readonly category: PodErrorCategory = "FUNDING";

  /** Required amount, if known */
  readonly required?: bigint;

  /** Available amount, if known */
  readonly available?: bigint;

  /** Wait time before retry (for rate limiting), in milliseconds */
  readonly waitTime?: number;

  private constructor(
    message: string,
    code: PodFundingErrorCode,
    isRetryable: boolean,
    options?: PodErrorOptions & {
      required?: bigint;
      available?: bigint;
      waitTime?: number;
    }
  ) {
    const metadata = ERROR_CODE_METADATA[code];
    super(message, {
      ...options,
      severity: options?.severity ?? metadata.severity,
      suggestion: options?.suggestion ?? metadata.suggestion,
    });
    this.code = code;
    this.isRetryable = isRetryable;
    if (options?.required !== undefined) this.required = options.required;
    if (options?.available !== undefined) this.available = options.available;
    if (options?.waitTime !== undefined) this.waitTime = options.waitTime;
  }

  /**
   * Create an insufficient funds error.
   *
   * @param required - The amount required, if known
   * @param available - The amount available, if known
   * @returns A new PodFundingError
   *
   * @example
   * ```typescript
   * throw PodFundingError.insufficientFunds(1000000n, 500000n);
   * ```
   */
  static insufficientFunds(required?: bigint, available?: bigint): PodFundingError {
    let message = "Insufficient funds for transaction";
    if (required !== undefined && available !== undefined) {
      message = `Insufficient funds: required ${String(required)}, available ${String(available)}`;
    }
    const opts: { required?: bigint; available?: bigint } = {};
    if (required !== undefined) opts.required = required;
    if (available !== undefined) opts.available = available;
    return new PodFundingError(message, POD_ERRORS.INSUFFICIENT_FUNDS, false, opts);
  }

  /**
   * Create a gas too low error.
   *
   * @param provided - The gas limit provided
   * @param required - The gas limit required
   * @returns A new PodFundingError
   *
   * @example
   * ```typescript
   * throw PodFundingError.gasTooLow(21000n, 50000n);
   * ```
   */
  static gasTooLow(provided?: bigint, required?: bigint): PodFundingError {
    let message = "Gas limit is too low for transaction";
    if (provided !== undefined && required !== undefined) {
      message = `Gas limit too low: provided ${String(provided)}, required ${String(required)}`;
    }
    const opts: { required?: bigint; available?: bigint } = {};
    if (required !== undefined) opts.required = required;
    if (provided !== undefined) opts.available = provided;
    return new PodFundingError(message, POD_ERRORS.GAS_TOO_LOW, false, opts);
  }

  /**
   * Create an underpriced transaction error.
   *
   * @param gasPrice - The gas price that was rejected
   * @returns A new PodFundingError
   *
   * @example
   * ```typescript
   * throw PodFundingError.underpriced(1000000000n);
   * ```
   */
  static underpriced(gasPrice?: bigint): PodFundingError {
    let message = "Transaction gas price is too low";
    if (gasPrice !== undefined) {
      message = `Transaction underpriced: gas price ${String(gasPrice)} is below minimum`;
    }
    return new PodFundingError(message, POD_ERRORS.UNDERPRICED, true);
  }

  /**
   * Create a replacement underpriced error.
   *
   * @param oldPrice - The original transaction's gas price
   * @param newPrice - The replacement transaction's gas price
   * @returns A new PodFundingError
   *
   * @example
   * ```typescript
   * throw PodFundingError.replacementUnderpriced(1000000000n, 1050000000n);
   * ```
   */
  static replacementUnderpriced(oldPrice?: bigint, newPrice?: bigint): PodFundingError {
    let message = "Replacement transaction gas price is too low";
    if (oldPrice !== undefined && newPrice !== undefined) {
      message = `Replacement underpriced: new price ${String(newPrice)} must be at least 10% higher than ${String(oldPrice)}`;
    }
    return new PodFundingError(message, POD_ERRORS.REPLACEMENT_UNDERPRICED, true);
  }

  /**
   * Create a faucet rate limited error.
   *
   * @param waitTimeMs - Time to wait before retry, in milliseconds
   * @returns A new PodFundingError
   *
   * @example
   * ```typescript
   * throw PodFundingError.rateLimited(3600000); // 1 hour
   * ```
   */
  static rateLimited(waitTimeMs: number): PodFundingError {
    const seconds = Math.ceil(waitTimeMs / 1000);
    const minutes = Math.ceil(waitTimeMs / 60000);
    const timeStr = minutes > 1 ? `${String(minutes)} minutes` : `${String(seconds)} seconds`;
    return new PodFundingError(
      `Faucet rate limit exceeded. Please wait ${timeStr} before requesting again.`,
      POD_ERRORS.FAUCET_RATE_LIMITED,
      true,
      { waitTime: waitTimeMs }
    );
  }

  /**
   * Create a faucet unavailable error.
   *
   * @param reason - The reason the faucet is unavailable
   * @returns A new PodFundingError
   *
   * @example
   * ```typescript
   * throw PodFundingError.faucetUnavailable('Service maintenance');
   * ```
   */
  static faucetUnavailable(reason?: string): PodFundingError {
    const message =
      reason !== undefined && reason !== ""
        ? `Faucet unavailable: ${reason}`
        : "Faucet service is currently unavailable";
    return new PodFundingError(message, POD_ERRORS.FAUCET_UNAVAILABLE, true);
  }

  /**
   * Create a faucet request failed error.
   *
   * @param reason - The reason the request failed
   * @param cause - The original error, if any
   * @returns A new PodFundingError
   *
   * @example
   * ```typescript
   * throw PodFundingError.faucetRequestFailed('Invalid address format');
   * ```
   */
  static faucetRequestFailed(reason: string, cause?: Error): PodFundingError {
    return new PodFundingError(
      `Faucet request failed: ${reason}`,
      POD_ERRORS.FAUCET_REQUEST_FAILED,
      false,
      cause !== undefined ? { cause } : undefined
    );
  }

  override toJSON(): PodErrorJson {
    const json = super.toJSON();
    if (this.required !== undefined) {
      (json as Record<string, unknown>)["required"] = String(this.required);
    }
    if (this.available !== undefined) {
      (json as Record<string, unknown>)["available"] = String(this.available);
    }
    if (this.waitTime !== undefined) {
      (json as Record<string, unknown>)["waitTime"] = this.waitTime;
    }
    return json;
  }
}
