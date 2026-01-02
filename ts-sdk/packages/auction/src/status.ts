/**
 * @module auction/status
 * @description AuctionStatus class with helper methods
 */

import type { Address } from "@podnetwork/core";
import type { AuctionStatusData } from "./schemas/index.js";

/**
 * Get current timestamp in microseconds.
 * @internal
 */
function nowMicroseconds(): bigint {
  return BigInt(Date.now()) * 1000n;
}

/**
 * Default outbid percentage (10%).
 */
export const DEFAULT_OUTBID_PERCENT = 10;

/**
 * AuctionStatus represents the current state of an optimistic auction.
 *
 * This class wraps auction status data and provides convenient methods for
 * querying time remaining, calculating outbid amounts, and checking auction state.
 *
 * @example
 * ```typescript
 * // Create status from known auction data
 * const status = AuctionStatus.from({
 *   auctionId: 1n,
 *   highestBid: 1000000n,
 *   highestBidder: '0x...',
 *   deadline: BigInt(Date.now() + 60000) * 1000n, // 1 minute from now
 *   isEnded: false,
 * });
 *
 * console.log(`Highest bid: ${status.highestBid}`);
 * console.log(`Time remaining: ${status.timeRemaining()} ms`);
 * console.log(`Min outbid: ${status.minOutbidAmount()}`);
 * ```
 */
export class AuctionStatus implements AuctionStatusData {
  /** Auction identifier */
  readonly auctionId: bigint;
  /** Highest bid amount in wei, or undefined if no bids */
  readonly highestBid: bigint | undefined;
  /** Address of highest bidder, or undefined if no bids */
  readonly highestBidder: Address | undefined;
  /** Deadline timestamp in microseconds since epoch */
  readonly deadline: bigint;
  /** Whether the auction has ended */
  readonly isEnded: boolean;

  /**
   * Creates a new AuctionStatus instance.
   *
   * @param data - Raw auction status data from RPC
   */
  constructor(data: AuctionStatusData) {
    this.auctionId = data.auctionId;
    this.highestBid = data.highestBid;
    this.highestBidder = data.highestBidder;
    this.deadline = data.deadline;
    this.isEnded = data.isEnded;
  }

  /**
   * Creates an AuctionStatus from raw data.
   *
   * @param data - Raw auction status data
   * @returns New AuctionStatus instance
   */
  static from(data: AuctionStatusData): AuctionStatus {
    return new AuctionStatus(data);
  }

  /**
   * Gets the deadline as a Date object.
   *
   * @returns Deadline as Date
   *
   * @example
   * ```typescript
   * const deadlineDate = status.deadlineAsDate();
   * console.log(`Auction ends at: ${deadlineDate.toISOString()}`);
   * ```
   */
  deadlineAsDate(): Date {
    // Convert microseconds to milliseconds
    return new Date(Number(this.deadline / 1000n));
  }

  /**
   * Gets the remaining time until the auction deadline.
   *
   * @returns Remaining time in milliseconds, or undefined if ended
   *
   * @example
   * ```typescript
   * const remaining = status.timeRemaining();
   * if (remaining !== undefined) {
   *   console.log(`${remaining / 1000} seconds remaining`);
   * }
   * ```
   */
  timeRemaining(): number | undefined {
    if (this.isEnded) {
      return undefined;
    }
    const now = nowMicroseconds();
    if (now >= this.deadline) {
      return undefined;
    }
    // Convert microseconds to milliseconds
    return Number((this.deadline - now) / 1000n);
  }

  /**
   * Checks if the auction has no bids yet.
   *
   * @returns true if no bids have been placed
   *
   * @example
   * ```typescript
   * if (status.hasNoBids()) {
   *   console.log('Be the first bidder!');
   * }
   * ```
   */
  hasNoBids(): boolean {
    return this.highestBid === undefined;
  }

  /**
   * Calculates the minimum amount required to outbid the current highest bid.
   *
   * @param spreadPercent - Required increase percentage over current bid (default: 10%)
   * @returns Minimum bid amount in wei, or undefined if auction has ended
   *
   * @example
   * ```typescript
   * const minBid = status.minOutbidAmount(10); // 10% increase required
   * if (minBid !== undefined) {
   *   console.log(`Minimum bid: ${formatPod(minBid)} POD`);
   * }
   * ```
   */
  minOutbidAmount(spreadPercent: number = DEFAULT_OUTBID_PERCENT): bigint | undefined {
    if (this.isEnded) {
      return undefined;
    }

    // If no bids yet, any positive amount is valid
    if (this.highestBid === undefined) {
      return 1n;
    }

    // Calculate minimum outbid: currentBid * (100 + spreadPercent) / 100
    const multiplier = 100n + BigInt(Math.floor(spreadPercent));
    return (this.highestBid * multiplier) / 100n;
  }

  /**
   * Checks if a given amount would outbid the current highest bid.
   *
   * @param amount - Amount to check in wei
   * @param spreadPercent - Required increase percentage (default: 10%)
   * @returns true if the amount would win the auction
   *
   * @example
   * ```typescript
   * if (status.wouldOutbid(myBidAmount)) {
   *   console.log('Your bid would win!');
   * }
   * ```
   */
  wouldOutbid(amount: bigint, spreadPercent: number = DEFAULT_OUTBID_PERCENT): boolean {
    const minBid = this.minOutbidAmount(spreadPercent);
    if (minBid === undefined) {
      return false;
    }
    return amount >= minBid;
  }

  /**
   * Checks if the auction is still active (not ended and deadline not passed).
   *
   * @returns true if bidding is still possible
   *
   * @example
   * ```typescript
   * if (status.isActive()) {
   *   console.log('Auction is still accepting bids');
   * }
   * ```
   */
  isActive(): boolean {
    if (this.isEnded) {
      return false;
    }
    return nowMicroseconds() < this.deadline;
  }
}
