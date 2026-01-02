/**
 * @module orderbook/orderbook
 * @description OrderBook class with helper methods for orderbook state
 */

import type { Hash } from "@podnetwork/core";
import type { OrderLevel, OrderBookData } from "./schemas/index.js";

/**
 * Depth information for an orderbook.
 */
export interface OrderBookDepth {
  /** Number of bid price levels */
  readonly bids: number;
  /** Number of ask price levels */
  readonly asks: number;
}

/**
 * OrderBook represents a snapshot of orderbook state with helper methods.
 *
 * This class wraps the raw orderbook data from the network and provides
 * convenient methods for querying prices, spreads, and depth.
 *
 * @example
 * ```typescript
 * const orderbook = await client.orderbook.getOrderbook(orderbookId);
 * if (orderbook) {
 *   console.log(`Best bid: ${orderbook.bestBid()}`);
 *   console.log(`Best ask: ${orderbook.bestAsk()}`);
 *   console.log(`Spread: ${orderbook.spread()}`);
 *   console.log(`Mid price: ${orderbook.midPrice()}`);
 * }
 * ```
 */
export class OrderBook implements OrderBookData {
  /** Unique identifier for this orderbook */
  readonly orderbookId: Hash;

  /** Bid levels sorted by price descending (highest first) */
  readonly bids: readonly OrderLevel[];

  /** Ask levels sorted by price ascending (lowest first) */
  readonly asks: readonly OrderLevel[];

  /**
   * Creates a new OrderBook instance.
   *
   * @param data - Raw orderbook data from RPC
   */
  constructor(data: OrderBookData) {
    this.orderbookId = data.orderbookId;
    this.bids = data.bids;
    this.asks = data.asks;
  }

  /**
   * Creates an OrderBook from raw data.
   *
   * @param data - Raw orderbook data
   * @returns New OrderBook instance
   */
  static from(data: OrderBookData): OrderBook {
    return new OrderBook(data);
  }

  /**
   * Gets the highest bid price (best bid).
   *
   * @returns Best bid price in wei, or undefined if no bids
   *
   * @example
   * ```typescript
   * const bestBid = orderbook.bestBid();
   * if (bestBid !== undefined) {
   *   console.log(`Best bid: ${formatPod(bestBid)} POD`);
   * }
   * ```
   */
  bestBid(): bigint | undefined {
    const first = this.bids[0];
    return first?.price;
  }

  /**
   * Gets the lowest ask price (best ask).
   *
   * @returns Best ask price in wei, or undefined if no asks
   *
   * @example
   * ```typescript
   * const bestAsk = orderbook.bestAsk();
   * if (bestAsk !== undefined) {
   *   console.log(`Best ask: ${formatPod(bestAsk)} POD`);
   * }
   * ```
   */
  bestAsk(): bigint | undefined {
    const first = this.asks[0];
    return first?.price;
  }

  /**
   * Gets the bid-ask spread (best ask - best bid).
   *
   * @returns Spread in wei, or undefined if either side is empty
   *
   * @example
   * ```typescript
   * const spread = orderbook.spread();
   * if (spread !== undefined) {
   *   console.log(`Spread: ${formatPod(spread)} POD`);
   * }
   * ```
   */
  spread(): bigint | undefined {
    const bid = this.bestBid();
    const ask = this.bestAsk();
    if (bid === undefined || ask === undefined) {
      return undefined;
    }
    return ask - bid;
  }

  /**
   * Gets the mid-market price ((best bid + best ask) / 2).
   *
   * Note: This uses integer division, so the result is floored.
   *
   * @returns Mid price in wei, or undefined if either side is empty
   *
   * @example
   * ```typescript
   * const mid = orderbook.midPrice();
   * if (mid !== undefined) {
   *   console.log(`Mid price: ${formatPod(mid)} POD`);
   * }
   * ```
   */
  midPrice(): bigint | undefined {
    const bid = this.bestBid();
    const ask = this.bestAsk();
    if (bid === undefined || ask === undefined) {
      return undefined;
    }
    return (bid + ask) / 2n;
  }

  /**
   * Checks if the orderbook is empty (no bids and no asks).
   *
   * @returns true if both bid and ask sides are empty
   *
   * @example
   * ```typescript
   * if (orderbook.isEmpty()) {
   *   console.log('No orders in book');
   * }
   * ```
   */
  isEmpty(): boolean {
    return this.bids.length === 0 && this.asks.length === 0;
  }

  /**
   * Gets the depth information for the orderbook.
   *
   * @returns Object with bid and ask level counts
   *
   * @example
   * ```typescript
   * const { bids, asks } = orderbook.depth();
   * console.log(`${bids} bid levels, ${asks} ask levels`);
   * ```
   */
  depth(): OrderBookDepth {
    return {
      bids: this.bids.length,
      asks: this.asks.length,
    };
  }

  /**
   * Gets the total volume on the bid side.
   *
   * @returns Total bid volume in wei
   *
   * @example
   * ```typescript
   * const totalBidVolume = orderbook.totalBidVolume();
   * console.log(`Total bid volume: ${formatPod(totalBidVolume)} POD`);
   * ```
   */
  totalBidVolume(): bigint {
    return this.bids.reduce((sum, level) => sum + level.volume, 0n);
  }

  /**
   * Gets the total volume on the ask side.
   *
   * @returns Total ask volume in wei
   *
   * @example
   * ```typescript
   * const totalAskVolume = orderbook.totalAskVolume();
   * console.log(`Total ask volume: ${formatPod(totalAskVolume)} POD`);
   * ```
   */
  totalAskVolume(): bigint {
    return this.asks.reduce((sum, level) => sum + level.volume, 0n);
  }

  /**
   * Gets the volume at a specific price level.
   *
   * @param price - Price level to query
   * @param side - Order side ('buy' for bids, 'sell' for asks)
   * @returns Volume at the price level, or 0n if not found
   *
   * @example
   * ```typescript
   * const volume = orderbook.volumeAtPrice(price, 'buy');
   * ```
   */
  volumeAtPrice(price: bigint, side: "buy" | "sell"): bigint {
    const levels = side === "buy" ? this.bids : this.asks;
    const level = levels.find((l) => l.price === price);
    return level?.volume ?? 0n;
  }
}
