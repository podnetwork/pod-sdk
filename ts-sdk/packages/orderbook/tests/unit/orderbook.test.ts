// Unit tests for OrderBook helper methods

import { describe, it, expect } from "vitest";
import { OrderBook } from "../../src/orderbook.js";
import type { OrderBookData, OrderLevel } from "../../src/schemas/index.js";
import type { Hash } from "@podnetwork/core";

// Test fixtures
const mockOrderbookId =
  "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hash;

function createOrderLevel(price: bigint, volume: bigint, minimumExpiry = 0n): OrderLevel {
  return { price, volume, minimumExpiry };
}

function createOrderBook(bids: OrderLevel[] = [], asks: OrderLevel[] = []): OrderBook {
  const data: OrderBookData = {
    orderbookId: mockOrderbookId,
    bids,
    asks,
  };
  return OrderBook.from(data);
}

describe("OrderBook", () => {
  describe("construction", () => {
    it("should create from OrderBookData", () => {
      const data: OrderBookData = {
        orderbookId: mockOrderbookId,
        bids: [createOrderLevel(100n, 50n)],
        asks: [createOrderLevel(110n, 30n)],
      };
      const orderbook = new OrderBook(data);
      expect(orderbook.orderbookId).toBe(mockOrderbookId);
      expect(orderbook.bids).toHaveLength(1);
      expect(orderbook.asks).toHaveLength(1);
    });

    it("should create via static from method", () => {
      const orderbook = createOrderBook(
        [createOrderLevel(100n, 50n)],
        [createOrderLevel(110n, 30n)]
      );
      expect(orderbook).toBeInstanceOf(OrderBook);
    });
  });

  describe("bestBid", () => {
    it("should return highest bid price", () => {
      const orderbook = createOrderBook(
        [createOrderLevel(100n, 50n), createOrderLevel(95n, 40n), createOrderLevel(90n, 30n)],
        []
      );
      expect(orderbook.bestBid()).toBe(100n);
    });

    it("should return undefined when no bids", () => {
      const orderbook = createOrderBook([], [createOrderLevel(110n, 30n)]);
      expect(orderbook.bestBid()).toBeUndefined();
    });
  });

  describe("bestAsk", () => {
    it("should return lowest ask price", () => {
      const orderbook = createOrderBook(
        [],
        [createOrderLevel(100n, 50n), createOrderLevel(105n, 40n), createOrderLevel(110n, 30n)]
      );
      expect(orderbook.bestAsk()).toBe(100n);
    });

    it("should return undefined when no asks", () => {
      const orderbook = createOrderBook([createOrderLevel(90n, 50n)], []);
      expect(orderbook.bestAsk()).toBeUndefined();
    });
  });

  describe("spread", () => {
    it("should calculate bid-ask spread", () => {
      const orderbook = createOrderBook(
        [createOrderLevel(100n, 50n)],
        [createOrderLevel(110n, 30n)]
      );
      expect(orderbook.spread()).toBe(10n);
    });

    it("should return undefined when no bids", () => {
      const orderbook = createOrderBook([], [createOrderLevel(110n, 30n)]);
      expect(orderbook.spread()).toBeUndefined();
    });

    it("should return undefined when no asks", () => {
      const orderbook = createOrderBook([createOrderLevel(100n, 50n)], []);
      expect(orderbook.spread()).toBeUndefined();
    });

    it("should return undefined when empty", () => {
      const orderbook = createOrderBook([], []);
      expect(orderbook.spread()).toBeUndefined();
    });
  });

  describe("midPrice", () => {
    it("should calculate mid-market price", () => {
      const orderbook = createOrderBook(
        [createOrderLevel(100n, 50n)],
        [createOrderLevel(110n, 30n)]
      );
      // (100 + 110) / 2 = 105
      expect(orderbook.midPrice()).toBe(105n);
    });

    it("should floor for odd sums", () => {
      const orderbook = createOrderBook(
        [createOrderLevel(100n, 50n)],
        [createOrderLevel(111n, 30n)]
      );
      // (100 + 111) / 2 = 105.5 -> 105 (integer division)
      expect(orderbook.midPrice()).toBe(105n);
    });

    it("should return undefined when no bids", () => {
      const orderbook = createOrderBook([], [createOrderLevel(110n, 30n)]);
      expect(orderbook.midPrice()).toBeUndefined();
    });

    it("should return undefined when no asks", () => {
      const orderbook = createOrderBook([createOrderLevel(100n, 50n)], []);
      expect(orderbook.midPrice()).toBeUndefined();
    });
  });

  describe("isEmpty", () => {
    it("should return true when empty", () => {
      const orderbook = createOrderBook([], []);
      expect(orderbook.isEmpty()).toBe(true);
    });

    it("should return false when has bids", () => {
      const orderbook = createOrderBook([createOrderLevel(100n, 50n)], []);
      expect(orderbook.isEmpty()).toBe(false);
    });

    it("should return false when has asks", () => {
      const orderbook = createOrderBook([], [createOrderLevel(110n, 30n)]);
      expect(orderbook.isEmpty()).toBe(false);
    });

    it("should return false when has both", () => {
      const orderbook = createOrderBook(
        [createOrderLevel(100n, 50n)],
        [createOrderLevel(110n, 30n)]
      );
      expect(orderbook.isEmpty()).toBe(false);
    });
  });

  describe("depth", () => {
    it("should return zero depth when empty", () => {
      const orderbook = createOrderBook([], []);
      expect(orderbook.depth()).toEqual({ bids: 0, asks: 0 });
    });

    it("should return correct depth counts", () => {
      const orderbook = createOrderBook(
        [createOrderLevel(100n, 50n), createOrderLevel(95n, 40n)],
        [createOrderLevel(110n, 30n), createOrderLevel(115n, 20n), createOrderLevel(120n, 10n)]
      );
      expect(orderbook.depth()).toEqual({ bids: 2, asks: 3 });
    });
  });

  describe("totalBidVolume", () => {
    it("should return 0 when no bids", () => {
      const orderbook = createOrderBook([], []);
      expect(orderbook.totalBidVolume()).toBe(0n);
    });

    it("should sum all bid volumes", () => {
      const orderbook = createOrderBook(
        [createOrderLevel(100n, 50n), createOrderLevel(95n, 40n), createOrderLevel(90n, 30n)],
        []
      );
      expect(orderbook.totalBidVolume()).toBe(120n);
    });
  });

  describe("totalAskVolume", () => {
    it("should return 0 when no asks", () => {
      const orderbook = createOrderBook([], []);
      expect(orderbook.totalAskVolume()).toBe(0n);
    });

    it("should sum all ask volumes", () => {
      const orderbook = createOrderBook(
        [],
        [createOrderLevel(100n, 50n), createOrderLevel(105n, 40n), createOrderLevel(110n, 30n)]
      );
      expect(orderbook.totalAskVolume()).toBe(120n);
    });
  });

  describe("volumeAtPrice", () => {
    it("should return volume at bid price", () => {
      const orderbook = createOrderBook(
        [createOrderLevel(100n, 50n), createOrderLevel(95n, 40n)],
        []
      );
      expect(orderbook.volumeAtPrice(100n, "buy")).toBe(50n);
      expect(orderbook.volumeAtPrice(95n, "buy")).toBe(40n);
    });

    it("should return volume at ask price", () => {
      const orderbook = createOrderBook(
        [],
        [createOrderLevel(110n, 30n), createOrderLevel(115n, 20n)]
      );
      expect(orderbook.volumeAtPrice(110n, "sell")).toBe(30n);
      expect(orderbook.volumeAtPrice(115n, "sell")).toBe(20n);
    });

    it("should return 0n for non-existent price", () => {
      const orderbook = createOrderBook(
        [createOrderLevel(100n, 50n)],
        [createOrderLevel(110n, 30n)]
      );
      expect(orderbook.volumeAtPrice(105n, "buy")).toBe(0n);
      expect(orderbook.volumeAtPrice(105n, "sell")).toBe(0n);
    });
  });
});
