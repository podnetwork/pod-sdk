/**
 * @module auction/auction-error
 * @description Auction-specific errors
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
 * Auction error codes (5xxx range).
 */
export type PodAuctionErrorCode =
  | typeof POD_ERRORS.AUCTION_NOT_FOUND
  | typeof POD_ERRORS.AUCTION_TIMEOUT
  | typeof POD_ERRORS.AUCTION_ENDED
  | typeof POD_ERRORS.BID_TOO_LOW
  | typeof POD_ERRORS.AUCTION_DECODE_FAILED;

/**
 * Auction-related errors.
 *
 * These errors occur during auction operations, such as bidding,
 * waiting for deadlines, and decoding auction data.
 *
 * @example
 * ```typescript
 * import { PodAuctionError } from '@podnetwork/auction';
 *
 * try {
 *   await auctionNamespace.waitForDeadline(auctionId);
 * } catch (error) {
 *   if (error instanceof PodAuctionError) {
 *     console.log(error.code);      // "POD_5002"
 *     console.log(error.deadline);  // The deadline that timed out
 *   }
 * }
 * ```
 */
export class PodAuctionError extends PodError {
  readonly code: PodAuctionErrorCode;
  readonly isRetryable: boolean;
  override readonly category: PodErrorCategory = "AUCTION";

  /** The auction ID, if known */
  readonly auctionId?: bigint;

  /** The deadline that was being waited for (for timeout errors) */
  readonly deadline?: bigint;

  private constructor(
    message: string,
    code: PodAuctionErrorCode,
    isRetryable: boolean,
    options?: PodErrorOptions & {
      auctionId?: bigint;
      deadline?: bigint;
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
    if (options?.auctionId !== undefined) this.auctionId = options.auctionId;
    if (options?.deadline !== undefined) this.deadline = options.deadline;
  }

  /**
   * Create an auction not found error.
   *
   * @param auctionId - The auction ID that was not found
   * @returns A new PodAuctionError
   *
   * @example
   * ```typescript
   * throw PodAuctionError.notFound(123n);
   * ```
   */
  static notFound(auctionId: bigint): PodAuctionError {
    return new PodAuctionError(
      `Auction ${String(auctionId)} not found`,
      POD_ERRORS.AUCTION_NOT_FOUND,
      false,
      { auctionId }
    );
  }

  /**
   * Create an auction timeout error.
   *
   * @param deadline - The deadline that was being waited for
   * @returns A new PodAuctionError
   *
   * @example
   * ```typescript
   * throw PodAuctionError.timeout(1703001600n);
   * ```
   */
  static timeout(deadline: bigint): PodAuctionError {
    return new PodAuctionError(
      `Timeout waiting for deadline ${String(deadline)} to pass`,
      POD_ERRORS.AUCTION_TIMEOUT,
      true,
      { deadline }
    );
  }

  /**
   * Create an auction ended error.
   *
   * @param auctionId - The auction ID that has ended
   * @returns A new PodAuctionError
   *
   * @example
   * ```typescript
   * throw PodAuctionError.ended(123n);
   * ```
   */
  static ended(auctionId: bigint): PodAuctionError {
    return new PodAuctionError(
      `Auction ${String(auctionId)} has already ended`,
      POD_ERRORS.AUCTION_ENDED,
      false,
      { auctionId }
    );
  }

  /**
   * Create a bid too low error.
   *
   * @param auctionId - The auction ID
   * @param minBid - The minimum bid amount, if known
   * @returns A new PodAuctionError
   *
   * @example
   * ```typescript
   * throw PodAuctionError.bidTooLow(123n, 1000000n);
   * ```
   */
  static bidTooLow(auctionId: bigint, minBid?: bigint): PodAuctionError {
    let message = `Bid for auction ${String(auctionId)} is too low`;
    if (minBid !== undefined) {
      message += `. Minimum bid: ${String(minBid)}`;
    }
    return new PodAuctionError(message, POD_ERRORS.BID_TOO_LOW, false, { auctionId });
  }

  /**
   * Create a decode failed error.
   *
   * @param reason - The reason decoding failed
   * @param cause - The original error, if any
   * @returns A new PodAuctionError
   *
   * @example
   * ```typescript
   * throw PodAuctionError.decodeFailed('Invalid response format');
   * ```
   */
  static decodeFailed(reason: string, cause?: Error): PodAuctionError {
    return new PodAuctionError(
      `Failed to decode auction response: ${reason}`,
      POD_ERRORS.AUCTION_DECODE_FAILED,
      false,
      cause !== undefined ? { cause } : undefined
    );
  }

  override toJSON(): PodErrorJson {
    const json = super.toJSON() as Record<string, unknown>;
    if (this.auctionId !== undefined) json["auctionId"] = String(this.auctionId);
    if (this.deadline !== undefined) json["deadline"] = String(this.deadline);
    return json as PodErrorJson;
  }
}
