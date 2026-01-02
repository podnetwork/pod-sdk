// Unit tests for OrderBookBid and OrderBookBidBuilder

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OrderBookBid, OrderBookBidBuilder, DEFAULT_BID_TTL } from "../../src/bid.js";
import type { Hash } from "@podnetwork/core";

// Test fixtures
const mockOrderbookId =
  "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hash;
const mockTimestamp = 1700000000000n; // Base timestamp for tests (milliseconds to microseconds = *1000)

describe("OrderBookBidBuilder", () => {
  describe("building valid bids", () => {
    it("should build a complete bid with all required fields", () => {
      const bid = new OrderBookBidBuilder()
        .side("buy")
        .price(1000000000000000000n)
        .volume(5000000000000000000n)
        .orderbookId(mockOrderbookId)
        .startTs(mockTimestamp)
        .ttl(3600000000n)
        .build();

      expect(bid.side).toBe("buy");
      expect(bid.price).toBe(1000000000000000000n);
      expect(bid.volume).toBe(5000000000000000000n);
      expect(bid.orderbookId).toBe(mockOrderbookId);
      expect(bid.startTs).toBe(mockTimestamp);
      expect(bid.ttl).toBe(3600000000n);
    });

    it("should build a sell order", () => {
      const bid = new OrderBookBidBuilder()
        .side("sell")
        .price(2000000000000000000n)
        .volume(1000000000000000000n)
        .orderbookId(mockOrderbookId)
        .build();

      expect(bid.side).toBe("sell");
    });

    it("should use default TTL when not specified", () => {
      const bid = new OrderBookBidBuilder()
        .side("buy")
        .price(1000000000000000000n)
        .volume(5000000000000000000n)
        .orderbookId(mockOrderbookId)
        .build();

      expect(bid.ttl).toBe(DEFAULT_BID_TTL);
    });

    it("should use current timestamp when startTs not specified", () => {
      const before = BigInt(Date.now()) * 1000n;

      const bid = new OrderBookBidBuilder()
        .side("buy")
        .price(1000000000000000000n)
        .volume(5000000000000000000n)
        .orderbookId(mockOrderbookId)
        .build();

      const after = BigInt(Date.now()) * 1000n;

      expect(bid.startTs).toBeGreaterThanOrEqual(before);
      expect(bid.startTs).toBeLessThanOrEqual(after);
    });

    it("should support ttlSeconds helper", () => {
      const bid = new OrderBookBidBuilder()
        .side("buy")
        .price(1000000000000000000n)
        .volume(5000000000000000000n)
        .orderbookId(mockOrderbookId)
        .ttlSeconds(7200) // 2 hours
        .build();

      expect(bid.ttl).toBe(7200n * 1000000n);
    });
  });

  describe("validation errors", () => {
    it("should throw when side is missing", () => {
      const builder = new OrderBookBidBuilder()
        .price(1000000000000000000n)
        .volume(5000000000000000000n)
        .orderbookId(mockOrderbookId);

      expect(() => builder.build()).toThrow("Missing required parameter: side");
    });

    it("should throw when price is missing", () => {
      const builder = new OrderBookBidBuilder()
        .side("buy")
        .volume(5000000000000000000n)
        .orderbookId(mockOrderbookId);

      expect(() => builder.build()).toThrow("Missing required parameter: price");
    });

    it("should throw when volume is missing", () => {
      const builder = new OrderBookBidBuilder()
        .side("buy")
        .price(1000000000000000000n)
        .orderbookId(mockOrderbookId);

      expect(() => builder.build()).toThrow("Missing required parameter: volume");
    });

    it("should throw when orderbookId is missing", () => {
      const builder = new OrderBookBidBuilder()
        .side("buy")
        .price(1000000000000000000n)
        .volume(5000000000000000000n);

      expect(() => builder.build()).toThrow("Missing required parameter: orderbookId");
    });

    it("should throw when price is zero", () => {
      const builder = new OrderBookBidBuilder()
        .side("buy")
        .price(0n)
        .volume(5000000000000000000n)
        .orderbookId(mockOrderbookId);

      expect(() => builder.build()).toThrow("price must be positive");
    });

    it("should throw when price is negative", () => {
      const builder = new OrderBookBidBuilder()
        .side("buy")
        .price(-1n)
        .volume(5000000000000000000n)
        .orderbookId(mockOrderbookId);

      expect(() => builder.build()).toThrow("price must be positive");
    });

    it("should throw when volume is zero", () => {
      const builder = new OrderBookBidBuilder()
        .side("buy")
        .price(1000000000000000000n)
        .volume(0n)
        .orderbookId(mockOrderbookId);

      expect(() => builder.build()).toThrow("volume must be positive");
    });

    it("should throw when volume is negative", () => {
      const builder = new OrderBookBidBuilder()
        .side("buy")
        .price(1000000000000000000n)
        .volume(-1n)
        .orderbookId(mockOrderbookId);

      expect(() => builder.build()).toThrow("volume must be positive");
    });

    it("should throw when ttl is zero", () => {
      const builder = new OrderBookBidBuilder()
        .side("buy")
        .price(1000000000000000000n)
        .volume(5000000000000000000n)
        .orderbookId(mockOrderbookId)
        .ttl(0n);

      expect(() => builder.build()).toThrow("ttl must be positive");
    });

    it("should throw when ttl is negative", () => {
      const builder = new OrderBookBidBuilder()
        .side("buy")
        .price(1000000000000000000n)
        .volume(5000000000000000000n)
        .orderbookId(mockOrderbookId)
        .ttl(-1n);

      expect(() => builder.build()).toThrow("ttl must be positive");
    });
  });

  describe("chaining", () => {
    it("should support method chaining", () => {
      const builder = new OrderBookBidBuilder();
      const result = builder
        .side("buy")
        .price(100n)
        .volume(50n)
        .orderbookId(mockOrderbookId)
        .startTs(1000n)
        .ttl(2000n);

      expect(result).toBe(builder);
    });
  });
});

describe("OrderBookBid", () => {
  describe("static builder", () => {
    it("should return a new builder instance", () => {
      const builder = OrderBookBid.builder();
      expect(builder).toBeInstanceOf(OrderBookBidBuilder);
    });
  });

  describe("expiryTs", () => {
    it("should calculate expiry timestamp", () => {
      const bid = new OrderBookBidBuilder()
        .side("buy")
        .price(1000000000000000000n)
        .volume(5000000000000000000n)
        .orderbookId(mockOrderbookId)
        .startTs(1000n)
        .ttl(500n)
        .build();

      expect(bid.expiryTs()).toBe(1500n);
    });
  });

  describe("isExpired", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(1700000000000); // Set mock time (ms)
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return false when not expired", () => {
      const futureStartTs = BigInt(Date.now() + 1000) * 1000n;
      const bid = new OrderBookBidBuilder()
        .side("buy")
        .price(1000000000000000000n)
        .volume(5000000000000000000n)
        .orderbookId(mockOrderbookId)
        .startTs(futureStartTs)
        .ttl(3600000000n)
        .build();

      expect(bid.isExpired()).toBe(false);
    });

    it("should return true when expired", () => {
      const pastStartTs = BigInt(Date.now() - 2000) * 1000n;
      const bid = new OrderBookBidBuilder()
        .side("buy")
        .price(1000000000000000000n)
        .volume(5000000000000000000n)
        .orderbookId(mockOrderbookId)
        .startTs(pastStartTs)
        .ttl(1000n) // Very short TTL
        .build();

      expect(bid.isExpired()).toBe(true);
    });
  });

  describe("timeRemaining", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(1700000000000); // Set mock time (ms)
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return remaining time when not expired", () => {
      const currentMicros = BigInt(Date.now()) * 1000n;
      const bid = new OrderBookBidBuilder()
        .side("buy")
        .price(1000000000000000000n)
        .volume(5000000000000000000n)
        .orderbookId(mockOrderbookId)
        .startTs(currentMicros)
        .ttl(3600000000n) // 1 hour in microseconds
        .build();

      const remaining = bid.timeRemaining();
      expect(remaining).toBe(3600000000n);
    });

    it("should return 0 when expired", () => {
      const pastStartTs = BigInt(Date.now() - 10000) * 1000n;
      const bid = new OrderBookBidBuilder()
        .side("buy")
        .price(1000000000000000000n)
        .volume(5000000000000000000n)
        .orderbookId(mockOrderbookId)
        .startTs(pastStartTs)
        .ttl(1000n) // Very short TTL - already expired
        .build();

      expect(bid.timeRemaining()).toBe(0n);
    });
  });
});

describe("DEFAULT_BID_TTL", () => {
  it("should be 1 hour in microseconds", () => {
    expect(DEFAULT_BID_TTL).toBe(3600n * 1000000n);
  });
});
