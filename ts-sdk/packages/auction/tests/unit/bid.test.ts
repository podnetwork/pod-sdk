// Unit tests for AuctionBid and AuctionBidBuilder

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuctionBid, AuctionBidBuilder, DEFAULT_DEADLINE_OFFSET } from "../../src/bid.js";

describe("AuctionBidBuilder", () => {
  describe("building valid bids", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(1700000000000); // Set mock time (ms)
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should build a complete bid with all required fields", () => {
      const deadlineTs = BigInt(Date.now() + 600000) * 1000n; // 10 mins from now in microseconds
      const bid = new AuctionBidBuilder().amount(1000000000000000000n).deadline(deadlineTs).build();

      expect(bid.amount).toBe(1000000000000000000n);
      expect(bid.deadline).toBe(deadlineTs);
      expect(bid.data).toBe("0x");
    });

    it("should use default deadline when not specified", () => {
      const bid = new AuctionBidBuilder().amount(1000000000000000000n).build();

      const expectedDeadline = BigInt(Date.now()) * 1000n + DEFAULT_DEADLINE_OFFSET;
      expect(bid.deadline).toBe(expectedDeadline);
    });

    it("should accept Date object for deadline", () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const bid = new AuctionBidBuilder().amount(1000000000000000000n).deadline(futureDate).build();

      const expectedDeadline = BigInt(futureDate.getTime()) * 1000n;
      expect(bid.deadline).toBe(expectedDeadline);
    });

    it("should accept number (milliseconds) for deadline", () => {
      const futureMs = Date.now() + 3600000; // 1 hour from now
      const bid = new AuctionBidBuilder().amount(1000000000000000000n).deadline(futureMs).build();

      const expectedDeadline = BigInt(futureMs) * 1000n;
      expect(bid.deadline).toBe(expectedDeadline);
    });

    it("should support deadlineMinutes helper", () => {
      const bid = new AuctionBidBuilder().amount(1000000000000000000n).deadlineMinutes(30).build();

      const now = BigInt(Date.now()) * 1000n;
      const expected = now + 30n * 60n * 1000000n;
      expect(bid.deadline).toBe(expected);
    });

    it("should support deadlineSeconds helper", () => {
      const bid = new AuctionBidBuilder().amount(1000000000000000000n).deadlineSeconds(300).build();

      const now = BigInt(Date.now()) * 1000n;
      const expected = now + 300n * 1000000n;
      expect(bid.deadline).toBe(expected);
    });

    it("should set optional data field", () => {
      const bid = new AuctionBidBuilder().amount(1000000000000000000n).data("0x1234abcd").build();

      expect(bid.data).toBe("0x1234abcd");
    });

    it("should default data to 0x", () => {
      const bid = new AuctionBidBuilder().amount(1000000000000000000n).build();

      expect(bid.data).toBe("0x");
    });
  });

  describe("validation errors", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(1700000000000);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should throw when amount is missing", () => {
      const builder = new AuctionBidBuilder();

      expect(() => builder.build()).toThrow("Missing required parameter: amount");
    });

    it("should throw when amount is zero", () => {
      const builder = new AuctionBidBuilder().amount(0n);

      expect(() => builder.build()).toThrow("amount must be positive");
    });

    it("should throw when amount is negative", () => {
      const builder = new AuctionBidBuilder().amount(-1n);

      expect(() => builder.build()).toThrow("amount must be positive");
    });

    it("should throw when deadline is in the past", () => {
      const pastDeadline = BigInt(Date.now() - 1000) * 1000n;
      const builder = new AuctionBidBuilder().amount(1000000000000000000n).deadline(pastDeadline);

      expect(() => builder.build()).toThrow("deadline must be in the future");
    });
  });

  describe("chaining", () => {
    it("should support method chaining", () => {
      const builder = new AuctionBidBuilder();
      const result = builder.amount(100n).deadlineMinutes(30).data("0x");

      expect(result).toBe(builder);
    });
  });
});

describe("AuctionBid", () => {
  describe("static builder", () => {
    it("should return a new builder instance", () => {
      const builder = AuctionBid.builder();
      expect(builder).toBeInstanceOf(AuctionBidBuilder);
    });
  });

  describe("deadlineAsDate", () => {
    it("should convert deadline to Date", () => {
      // 1700000000000 ms = microseconds / 1000
      const deadlineMicros = 1700000000000000n; // microseconds
      const bid = new AuctionBid({
        amount: 1000n,
        deadline: deadlineMicros,
        data: "0x" as `0x${string}`,
      });

      const date = bid.deadlineAsDate();
      expect(date.getTime()).toBe(1700000000000); // milliseconds
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
      const futureDeadline = BigInt(Date.now() + 60000) * 1000n; // 1 minute from now
      const bid = new AuctionBid({
        amount: 1000n,
        deadline: futureDeadline,
        data: "0x" as `0x${string}`,
      });

      const remaining = bid.timeRemaining();
      expect(remaining).toBe(60000); // 60 seconds in ms
    });

    it("should return undefined when expired", () => {
      const pastDeadline = BigInt(Date.now() - 1000) * 1000n;
      const bid = new AuctionBid({
        amount: 1000n,
        deadline: pastDeadline,
        data: "0x" as `0x${string}`,
      });

      expect(bid.timeRemaining()).toBeUndefined();
    });
  });

  describe("isPastDeadline", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(1700000000000);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return false when deadline is in future", () => {
      const futureDeadline = BigInt(Date.now() + 60000) * 1000n;
      const bid = new AuctionBid({
        amount: 1000n,
        deadline: futureDeadline,
        data: "0x" as `0x${string}`,
      });

      expect(bid.isPastDeadline()).toBe(false);
    });

    it("should return true when deadline has passed", () => {
      const pastDeadline = BigInt(Date.now() - 1000) * 1000n;
      const bid = new AuctionBid({
        amount: 1000n,
        deadline: pastDeadline,
        data: "0x" as `0x${string}`,
      });

      expect(bid.isPastDeadline()).toBe(true);
    });
  });
});

describe("DEFAULT_DEADLINE_OFFSET", () => {
  it("should be 10 minutes in microseconds", () => {
    expect(DEFAULT_DEADLINE_OFFSET).toBe(10n * 60n * 1000000n);
  });
});
