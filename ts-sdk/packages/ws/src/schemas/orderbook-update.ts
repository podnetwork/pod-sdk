/**
 * @module ws/schemas/orderbook-update
 * @description Zod schema for OrderbookSnapshot WebSocket events
 */

import { z } from "zod";
import { parseBigInt } from "@podnetwork/core";

/**
 * A price level in the orderbook snapshot.
 */
export interface OrderLevelUpdate {
  /** Price as string (decimal representation of U256) */
  readonly price: bigint;
  /** Total volume at this price level */
  readonly volume: bigint;
  /** Earliest expiry timestamp in microseconds */
  readonly minimumExpiry: bigint;
}

/**
 * Real-time orderbook snapshot from WebSocket subscription.
 *
 * The node sends snapshots with buys and sells as maps where
 * keys are price strings and values contain volume and minimum_expiry.
 *
 * @example
 * ```typescript
 * for await (const update of client.ws.subscribeOrderbook([orderbookId])) {
 *   console.log(`Orderbook ${update.clobId} updated`);
 *   console.log(`Best bid: ${update.bestBid()}`);
 *   console.log(`Best ask: ${update.bestAsk()}`);
 *   console.log(`New bids: ${update.newBidsCount}`);
 * }
 * ```
 */
export interface OrderBookUpdate {
  /** CLOB identifier (bytes32 as hex) */
  readonly clobId: `0x${string}`;
  /** Bid levels sorted by price descending */
  readonly bids: readonly OrderLevelUpdate[];
  /** Ask levels sorted by price ascending */
  readonly asks: readonly OrderLevelUpdate[];
  /** Grouping precision for price aggregation */
  readonly groupingPrecision: bigint;
  /** Update timestamp in microseconds */
  readonly timestamp: bigint;
  /** Number of new bids since last update */
  readonly newBidsCount: number;
}

/**
 * Tick snapshot from the node's map format.
 * @internal
 */
const TickSnapshotSchema = z.object({
  volume: z.string(),
  minimum_expiry: z.number(),
});

/**
 * Parse a price map into sorted order levels.
 * @internal
 */
function parsePriceMap(
  map: Record<string, { volume: string; minimum_expiry: number }>,
  ascending: boolean
): OrderLevelUpdate[] {
  const entries = Object.entries(map).map(([priceStr, tick]) => ({
    price: parseBigInt(priceStr),
    volume: parseBigInt(tick.volume),
    minimumExpiry: BigInt(tick.minimum_expiry),
  }));

  // Sort by price
  entries.sort((a, b) => {
    const diff = a.price - b.price;
    if (diff < 0n) return ascending ? -1 : 1;
    if (diff > 0n) return ascending ? 1 : -1;
    return 0;
  });

  return entries;
}

/**
 * Zod schema for validating OrderBookUpdate from WebSocket messages.
 *
 * The node sends orderbook_snapshot messages with this format:
 * ```json
 * {
 *   "type": "orderbook_snapshot",
 *   "clob_id": "0x...",
 *   "buys": { "1000000000000000000": { "volume": "5000000000", "minimum_expiry": 1234567890 } },
 *   "sells": { "1100000000000000000": { "volume": "3000000000", "minimum_expiry": 1234567890 } },
 *   "grouping_precision": "1000000000000000",
 *   "timestamp": 1234567890123456,
 *   "new_bids_count": 5
 * }
 * ```
 *
 * @example
 * ```typescript
 * const result = OrderBookUpdateSchema.safeParse(wsData);
 * if (result.success) {
 *   const update: OrderBookUpdate = result.data;
 * }
 * ```
 */
export const OrderBookUpdateSchema: z.ZodType<OrderBookUpdate, z.ZodTypeDef, unknown> = z
  .object({
    clob_id: z.string(),
    buys: z.record(z.string(), TickSnapshotSchema),
    sells: z.record(z.string(), TickSnapshotSchema),
    grouping_precision: z.string(),
    timestamp: z.number(),
    new_bids_count: z.number().int().nonnegative(),
  })
  .transform(
    (v): OrderBookUpdate => ({
      clobId: (v.clob_id.startsWith("0x") ? v.clob_id : `0x${v.clob_id}`) as `0x${string}`,
      bids: parsePriceMap(v.buys, false), // Descending for bids (highest first)
      asks: parsePriceMap(v.sells, true), // Ascending for asks (lowest first)
      groupingPrecision: parseBigInt(v.grouping_precision),
      timestamp: BigInt(v.timestamp),
      newBidsCount: v.new_bids_count,
    })
  );

/**
 * Helper class for working with OrderBookUpdate.
 */
export class OrderBookUpdateHelper {
  constructor(private readonly update: OrderBookUpdate) {}

  /**
   * Creates an OrderBookUpdateHelper from raw data.
   */
  static from(data: OrderBookUpdate): OrderBookUpdateHelper {
    return new OrderBookUpdateHelper(data);
  }

  /**
   * Gets the raw update data.
   */
  get data(): OrderBookUpdate {
    return this.update;
  }

  /**
   * Gets the CLOB ID.
   */
  get clobId(): `0x${string}` {
    return this.update.clobId;
  }

  /**
   * Gets the bids.
   */
  get bids(): readonly OrderLevelUpdate[] {
    return this.update.bids;
  }

  /**
   * Gets the asks.
   */
  get asks(): readonly OrderLevelUpdate[] {
    return this.update.asks;
  }

  /**
   * Gets the timestamp.
   */
  get timestamp(): bigint {
    return this.update.timestamp;
  }

  /**
   * Gets the new bids count.
   */
  get newBidsCount(): number {
    return this.update.newBidsCount;
  }

  /**
   * Gets the grouping precision.
   */
  get groupingPrecision(): bigint {
    return this.update.groupingPrecision;
  }

  /**
   * Gets the best bid price (highest).
   * @returns Highest bid price, or undefined if no bids
   */
  bestBid(): bigint | undefined {
    return this.update.bids[0]?.price;
  }

  /**
   * Gets the best ask price (lowest).
   * @returns Lowest ask price, or undefined if no asks
   */
  bestAsk(): bigint | undefined {
    return this.update.asks[0]?.price;
  }

  /**
   * Gets the spread between best ask and best bid.
   * @returns Spread, or undefined if either side is empty
   */
  spread(): bigint | undefined {
    const bestBid = this.bestBid();
    const bestAsk = this.bestAsk();
    if (bestBid === undefined || bestAsk === undefined) {
      return undefined;
    }
    return bestAsk - bestBid;
  }

  /**
   * Gets the mid-price between best bid and best ask.
   * @returns Mid-price, or undefined if either side is empty
   */
  midPrice(): bigint | undefined {
    const bestBid = this.bestBid();
    const bestAsk = this.bestAsk();
    if (bestBid === undefined || bestAsk === undefined) {
      return undefined;
    }
    return (bestBid + bestAsk) / 2n;
  }

  /**
   * Checks if the orderbook is empty.
   */
  isEmpty(): boolean {
    return this.update.bids.length === 0 && this.update.asks.length === 0;
  }

  /**
   * Gets the depth of the orderbook.
   */
  depth(): { bids: number; asks: number } {
    return {
      bids: this.update.bids.length,
      asks: this.update.asks.length,
    };
  }
}
