/**
 * @module orderbook/bid
 * @description OrderBookBid and OrderBookBidBuilder for creating bid orders
 */

import { PodExecutionError, type Hash, type HashLike, HashSchema } from "@podnetwork/core";
import type { Side } from "./types.js";
import type { OrderBookBidData } from "./schemas/index.js";

/**
 * Get current timestamp in microseconds.
 * @internal
 */
function nowMicroseconds(): bigint {
  return BigInt(Date.now()) * 1000n;
}

/**
 * Default TTL for orderbook bids (1 hour in microseconds).
 */
export const DEFAULT_BID_TTL = 3600n * 1000000n;

/**
 * OrderBookBid represents a bid to be submitted to an orderbook.
 *
 * Use the builder pattern for convenient construction:
 *
 * @example
 * ```typescript
 * const bid = OrderBookBid.builder()
 *   .side('buy')
 *   .price(parsePod('1.5'))
 *   .volume(parsePod('10'))
 *   .orderbookId(orderbookHash)
 *   .ttl(3600n * 1000000n) // 1 hour
 *   .build();
 * ```
 */
export class OrderBookBid implements OrderBookBidData {
  /** Order side: 'buy' or 'sell' */
  readonly side: Side;
  /** Price in wei */
  readonly price: bigint;
  /** Volume in wei */
  readonly volume: bigint;
  /** Target orderbook ID */
  readonly orderbookId: Hash;
  /** Start timestamp in microseconds */
  readonly startTs: bigint;
  /** Time-to-live in microseconds */
  readonly ttl: bigint;

  /**
   * Creates a new OrderBookBid.
   * @internal Prefer using OrderBookBid.builder()
   */
  constructor(data: OrderBookBidData) {
    this.side = data.side;
    this.price = data.price;
    this.volume = data.volume;
    this.orderbookId = data.orderbookId;
    this.startTs = data.startTs;
    this.ttl = data.ttl;
  }

  /**
   * Creates a new OrderBookBidBuilder for fluent construction.
   *
   * @returns A new OrderBookBidBuilder instance
   *
   * @example
   * ```typescript
   * const bid = OrderBookBid.builder()
   *   .side('buy')
   *   .price(1000000000000000000n)
   *   .volume(5000000000000000000n)
   *   .orderbookId(orderbookHash)
   *   .build();
   * ```
   */
  static builder(): OrderBookBidBuilder {
    return new OrderBookBidBuilder();
  }

  /**
   * Gets the expiry timestamp (startTs + ttl).
   *
   * @returns Expiry timestamp in microseconds
   */
  expiryTs(): bigint {
    return this.startTs + this.ttl;
  }

  /**
   * Checks if the bid has expired.
   *
   * @returns true if current time is past expiry
   */
  isExpired(): boolean {
    return nowMicroseconds() >= this.expiryTs();
  }

  /**
   * Gets the remaining time until expiry.
   *
   * @returns Remaining time in microseconds, or 0 if expired
   */
  timeRemaining(): bigint {
    const remaining = this.expiryTs() - nowMicroseconds();
    return remaining > 0n ? remaining : 0n;
  }
}

/**
 * Builder for creating OrderBookBid instances.
 *
 * All required fields must be set before calling build():
 * - side: 'buy' or 'sell'
 * - price: bid price in wei
 * - volume: bid volume in wei
 * - orderbookId: target orderbook hash
 *
 * Optional fields with defaults:
 * - startTs: current timestamp (defaults to now)
 * - ttl: time-to-live (defaults to 1 hour)
 *
 * @example
 * ```typescript
 * const bid = new OrderBookBidBuilder()
 *   .side('buy')
 *   .price(parsePod('1.5'))
 *   .volume(parsePod('10'))
 *   .orderbookId(orderbookHash)
 *   .build();
 * ```
 */
export class OrderBookBidBuilder {
  private _side?: Side;
  private _price?: bigint;
  private _volume?: bigint;
  private _orderbookId?: Hash;
  private _startTs?: bigint;
  private _ttl?: bigint;

  /**
   * Sets the order side.
   *
   * @param side - 'buy' or 'sell'
   * @returns this for chaining
   */
  side(side: Side): this {
    this._side = side;
    return this;
  }

  /**
   * Sets the bid price.
   *
   * @param price - Price in wei (must be positive)
   * @returns this for chaining
   */
  price(price: bigint): this {
    this._price = price;
    return this;
  }

  /**
   * Sets the bid volume.
   *
   * @param volume - Volume in wei (must be positive)
   * @returns this for chaining
   */
  volume(volume: bigint): this {
    this._volume = volume;
    return this;
  }

  /**
   * Sets the target orderbook ID.
   *
   * @param orderbookId - Orderbook hash
   * @returns this for chaining
   */
  orderbookId(orderbookId: HashLike): this {
    this._orderbookId = HashSchema.parse(orderbookId);
    return this;
  }

  /**
   * Sets the start timestamp.
   *
   * @param startTs - Start timestamp in microseconds (defaults to now)
   * @returns this for chaining
   */
  startTs(startTs: bigint): this {
    this._startTs = startTs;
    return this;
  }

  /**
   * Sets the time-to-live.
   *
   * @param ttl - TTL in microseconds (must be positive)
   * @returns this for chaining
   */
  ttl(ttl: bigint): this {
    this._ttl = ttl;
    return this;
  }

  /**
   * Sets the TTL from a duration in seconds.
   *
   * @param seconds - Duration in seconds
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * builder.ttlSeconds(3600) // 1 hour
   * ```
   */
  ttlSeconds(seconds: number): this {
    this._ttl = BigInt(seconds) * 1000000n;
    return this;
  }

  /**
   * Builds the OrderBookBid.
   *
   * @returns A new OrderBookBid instance
   * @throws PodExecutionError if required fields are missing or invalid
   *
   * @example
   * ```typescript
   * const bid = builder.build();
   * ```
   */
  build(): OrderBookBid {
    if (this._side === undefined) {
      throw PodExecutionError.missingParameter("side");
    }
    if (this._price === undefined) {
      throw PodExecutionError.missingParameter("price");
    }
    if (this._volume === undefined) {
      throw PodExecutionError.missingParameter("volume");
    }
    if (this._orderbookId === undefined) {
      throw PodExecutionError.missingParameter("orderbookId");
    }

    // Validate positive values
    if (this._price <= 0n) {
      throw PodExecutionError.invalidParameter("price", "price must be positive");
    }
    if (this._volume <= 0n) {
      throw PodExecutionError.invalidParameter("volume", "volume must be positive");
    }

    const ttl = this._ttl ?? DEFAULT_BID_TTL;
    if (ttl <= 0n) {
      throw PodExecutionError.invalidParameter("ttl", "ttl must be positive");
    }

    const startTs = this._startTs ?? nowMicroseconds();
    if (startTs < 0n) {
      throw PodExecutionError.invalidParameter("startTs", "startTs must be non-negative");
    }

    return new OrderBookBid({
      side: this._side,
      price: this._price,
      volume: this._volume,
      orderbookId: this._orderbookId,
      startTs,
      ttl,
    });
  }
}
