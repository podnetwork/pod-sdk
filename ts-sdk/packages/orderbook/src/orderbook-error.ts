/**
 * @module orderbook/orderbook-error
 * @description Orderbook-specific errors
 */

import {
  PodError,
  POD_ERRORS,
  ERROR_CODE_METADATA,
  type PodErrorCategory,
  type PodErrorJson,
  type PodErrorOptions,
} from "@podnetwork/core";

/**
 * Orderbook error codes (6xxx range).
 */
export type PodOrderbookErrorCode =
  | typeof POD_ERRORS.ORDERBOOK_NOT_FOUND
  | typeof POD_ERRORS.ORDER_INVALID
  | typeof POD_ERRORS.ORDERBOOK_DECODE_FAILED;

/**
 * Orderbook-related errors.
 *
 * These errors occur during orderbook operations, such as
 * fetching orderbook data and decoding responses.
 *
 * @example
 * ```typescript
 * import { PodOrderbookError } from '@podnetwork/orderbook';
 *
 * try {
 *   await orderbookNamespace.getOrderbook(orderbookId);
 * } catch (error) {
 *   if (error instanceof PodOrderbookError) {
 *     console.log(error.code);        // "POD_6001"
 *     console.log(error.orderbookId); // The orderbook ID
 *   }
 * }
 * ```
 */
export class PodOrderbookError extends PodError {
  readonly code: PodOrderbookErrorCode;
  readonly isRetryable: boolean;
  override readonly category: PodErrorCategory = "ORDERBOOK";

  /** The orderbook ID, if known */
  readonly orderbookId?: bigint;

  private constructor(
    message: string,
    code: PodOrderbookErrorCode,
    isRetryable: boolean,
    options?: PodErrorOptions & {
      orderbookId?: bigint;
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
    if (options?.orderbookId !== undefined) this.orderbookId = options.orderbookId;
  }

  /**
   * Create an orderbook not found error.
   *
   * @param orderbookId - The orderbook ID that was not found
   * @returns A new PodOrderbookError
   *
   * @example
   * ```typescript
   * throw PodOrderbookError.notFound(123n);
   * ```
   */
  static notFound(orderbookId: bigint): PodOrderbookError {
    return new PodOrderbookError(
      `Orderbook ${String(orderbookId)} not found`,
      POD_ERRORS.ORDERBOOK_NOT_FOUND,
      false,
      { orderbookId }
    );
  }

  /**
   * Create an invalid order error.
   *
   * @param reason - The reason the order is invalid
   * @param orderbookId - The orderbook ID, if known
   * @returns A new PodOrderbookError
   *
   * @example
   * ```typescript
   * throw PodOrderbookError.invalidOrder('Price must be positive');
   * ```
   */
  static invalidOrder(reason: string, orderbookId?: bigint): PodOrderbookError {
    return new PodOrderbookError(
      `Invalid order: ${reason}`,
      POD_ERRORS.ORDER_INVALID,
      false,
      orderbookId !== undefined ? { orderbookId } : undefined
    );
  }

  /**
   * Create a decode failed error.
   *
   * @param reason - The reason decoding failed
   * @param cause - The original error, if any
   * @returns A new PodOrderbookError
   *
   * @example
   * ```typescript
   * throw PodOrderbookError.decodeFailed('Invalid response format');
   * ```
   */
  static decodeFailed(reason: string, cause?: Error): PodOrderbookError {
    return new PodOrderbookError(
      `Failed to decode orderbook response: ${reason}`,
      POD_ERRORS.ORDERBOOK_DECODE_FAILED,
      false,
      cause !== undefined ? { cause } : undefined
    );
  }

  override toJSON(): PodErrorJson {
    const json = super.toJSON() as Record<string, unknown>;
    if (this.orderbookId !== undefined) json["orderbookId"] = String(this.orderbookId);
    return json as PodErrorJson;
  }
}
