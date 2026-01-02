/**
 * @module auction/bid
 * @description AuctionBid and AuctionBidBuilder for creating auction bids
 */

import { PodExecutionError, type Bytes, BytesSchema } from "@podnetwork/core";
import type { AuctionBidData } from "./schemas/index.js";

/**
 * Get current timestamp in microseconds.
 * @internal
 */
function nowMicroseconds(): bigint {
  return BigInt(Date.now()) * 1000n;
}

/**
 * Default deadline offset (10 minutes in microseconds).
 */
export const DEFAULT_DEADLINE_OFFSET = 10n * 60n * 1000000n;

/**
 * AuctionBid represents a bid to be submitted to an optimistic auction.
 *
 * Use the builder pattern for convenient construction:
 *
 * @example
 * ```typescript
 * const bid = AuctionBid.builder()
 *   .amount(parsePod('1.5'))
 *   .deadlineMinutes(30)
 *   .build();
 * ```
 */
export class AuctionBid implements AuctionBidData {
  /** Bid amount in wei */
  readonly amount: bigint;
  /** Deadline timestamp in microseconds since epoch */
  readonly deadline: bigint;
  /** Optional calldata for the bid */
  readonly data: Bytes;

  /**
   * Creates a new AuctionBid.
   * @internal Prefer using AuctionBid.builder()
   */
  constructor(data: AuctionBidData) {
    this.amount = data.amount;
    this.deadline = data.deadline;
    this.data = data.data;
  }

  /**
   * Creates a new AuctionBidBuilder for fluent construction.
   *
   * @returns A new AuctionBidBuilder instance
   *
   * @example
   * ```typescript
   * const bid = AuctionBid.builder()
   *   .amount(1000000000000000000n)
   *   .deadlineMinutes(30)
   *   .build();
   * ```
   */
  static builder(): AuctionBidBuilder {
    return new AuctionBidBuilder();
  }

  /**
   * Gets the deadline as a Date object.
   *
   * @returns Deadline as Date
   */
  deadlineAsDate(): Date {
    // Convert microseconds to milliseconds
    return new Date(Number(this.deadline / 1000n));
  }

  /**
   * Gets the remaining time until deadline.
   *
   * @returns Remaining time in milliseconds, or undefined if past deadline
   */
  timeRemaining(): number | undefined {
    const now = nowMicroseconds();
    if (now >= this.deadline) {
      return undefined;
    }
    // Convert microseconds to milliseconds
    return Number((this.deadline - now) / 1000n);
  }

  /**
   * Checks if the deadline has passed.
   *
   * @returns true if current time is past deadline
   */
  isPastDeadline(): boolean {
    return nowMicroseconds() >= this.deadline;
  }
}

/**
 * Builder for creating AuctionBid instances.
 *
 * Required fields:
 * - amount: bid amount in wei
 *
 * Optional fields with defaults:
 * - deadline: timestamp (defaults to now + 10 minutes)
 * - data: calldata (defaults to '0x')
 *
 * @example
 * ```typescript
 * const bid = new AuctionBidBuilder()
 *   .amount(parsePod('1.5'))
 *   .deadlineMinutes(30)
 *   .data('0x1234')
 *   .build();
 * ```
 */
export class AuctionBidBuilder {
  private _amount?: bigint;
  private _deadline?: bigint;
  private _data: Bytes = "0x" as Bytes;

  /**
   * Sets the bid amount.
   *
   * @param amount - Amount in wei (must be positive)
   * @returns this for chaining
   */
  amount(amount: bigint): this {
    this._amount = amount;
    return this;
  }

  /**
   * Sets the deadline timestamp.
   *
   * @param deadline - Deadline in microseconds since epoch, or Date/number (ms since epoch)
   * @returns this for chaining
   */
  deadline(deadline: Date | number | bigint): this {
    if (deadline instanceof Date) {
      this._deadline = BigInt(deadline.getTime()) * 1000n;
    } else if (typeof deadline === "number") {
      // Assume milliseconds if number
      this._deadline = BigInt(deadline) * 1000n;
    } else {
      // Already in microseconds
      this._deadline = deadline;
    }
    return this;
  }

  /**
   * Sets the deadline relative to now in minutes.
   *
   * @param minutes - Number of minutes from now
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * builder.deadlineMinutes(30) // 30 minutes from now
   * ```
   */
  deadlineMinutes(minutes: number): this {
    this._deadline = nowMicroseconds() + BigInt(minutes) * 60n * 1000000n;
    return this;
  }

  /**
   * Sets the deadline relative to now in seconds.
   *
   * @param seconds - Number of seconds from now
   * @returns this for chaining
   */
  deadlineSeconds(seconds: number): this {
    this._deadline = nowMicroseconds() + BigInt(seconds) * 1000000n;
    return this;
  }

  /**
   * Sets the optional calldata.
   *
   * @param data - Bytes to include with the bid
   * @returns this for chaining
   */
  data(data: string): this {
    this._data = BytesSchema.parse(data);
    return this;
  }

  /**
   * Builds the AuctionBid.
   *
   * @returns A new AuctionBid instance
   * @throws PodExecutionError if required fields are missing or invalid
   *
   * @example
   * ```typescript
   * const bid = builder.build();
   * ```
   */
  build(): AuctionBid {
    if (this._amount === undefined) {
      throw PodExecutionError.missingParameter("amount");
    }

    // Validate positive amount
    if (this._amount <= 0n) {
      throw PodExecutionError.invalidParameter("amount", "amount must be positive");
    }

    const deadline = this._deadline ?? nowMicroseconds() + DEFAULT_DEADLINE_OFFSET;

    // Validate deadline is in the future
    const now = nowMicroseconds();
    if (deadline <= now) {
      throw PodExecutionError.invalidParameter("deadline", "deadline must be in the future");
    }

    return new AuctionBid({
      amount: this._amount,
      deadline,
      data: this._data,
    });
  }
}
