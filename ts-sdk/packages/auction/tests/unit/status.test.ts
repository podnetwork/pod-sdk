// Unit tests for AuctionStatus and its helper methods

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuctionStatus, DEFAULT_OUTBID_PERCENT } from "../../src/status.js";
import type { AuctionStatusData } from "../../src/schemas/index.js";
import type { Address } from "@podnetwork/core";

// Test fixtures
const mockAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" as Address;

function createAuctionStatus(overrides: Partial<AuctionStatusData> = {}): AuctionStatus {
  const data: AuctionStatusData = {
    auctionId: 123n,
    highestBid: 1000000000000000000n,
    highestBidder: mockAddress,
    deadline: BigInt(Date.now() + 3600000) * 1000n, // 1 hour from now
    isEnded: false,
    ...overrides,
  };
  return AuctionStatus.from(data);
}

describe("AuctionStatus", () => {
  describe("construction", () => {
    it("should create from AuctionStatusData", () => {
      const status = createAuctionStatus();
      expect(status.auctionId).toBe(123n);
      expect(status.highestBid).toBe(1000000000000000000n);
      expect(status.highestBidder).toBe(mockAddress);
      expect(status.isEnded).toBe(false);
    });

    it("should create via static from method", () => {
      const status = createAuctionStatus();
      expect(status).toBeInstanceOf(AuctionStatus);
    });

    it("should handle undefined highestBid and highestBidder", () => {
      const status = createAuctionStatus({
        highestBid: undefined,
        highestBidder: undefined,
      });
      expect(status.highestBid).toBeUndefined();
      expect(status.highestBidder).toBeUndefined();
    });
  });

  describe("deadlineAsDate", () => {
    it("should convert deadline to Date", () => {
      const deadlineMicros = 1700000000000000n;
      const status = createAuctionStatus({ deadline: deadlineMicros });

      const date = status.deadlineAsDate();
      expect(date.getTime()).toBe(1700000000000);
    });
  });

  describe("timeRemaining", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(1700000000000);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return remaining time when auction is active", () => {
      const futureDeadline = BigInt(Date.now() + 60000) * 1000n;
      const status = createAuctionStatus({ deadline: futureDeadline });

      const remaining = status.timeRemaining();
      expect(remaining).toBe(60000);
    });

    it("should return undefined when auction has ended", () => {
      const status = createAuctionStatus({ isEnded: true });
      expect(status.timeRemaining()).toBeUndefined();
    });

    it("should return undefined when deadline has passed", () => {
      const pastDeadline = BigInt(Date.now() - 1000) * 1000n;
      const status = createAuctionStatus({
        deadline: pastDeadline,
        isEnded: false,
      });

      expect(status.timeRemaining()).toBeUndefined();
    });
  });

  describe("hasNoBids", () => {
    it("should return true when no bids placed", () => {
      const status = createAuctionStatus({
        highestBid: undefined,
        highestBidder: undefined,
      });
      expect(status.hasNoBids()).toBe(true);
    });

    it("should return false when bids exist", () => {
      const status = createAuctionStatus();
      expect(status.hasNoBids()).toBe(false);
    });
  });

  describe("minOutbidAmount", () => {
    it("should return 1n when no bids exist", () => {
      const status = createAuctionStatus({
        highestBid: undefined,
        highestBidder: undefined,
      });
      expect(status.minOutbidAmount()).toBe(1n);
    });

    it("should calculate 10% increase by default", () => {
      const status = createAuctionStatus({
        highestBid: 1000n,
      });
      // 1000 * 110 / 100 = 1100
      expect(status.minOutbidAmount()).toBe(1100n);
    });

    it("should calculate custom percentage increase", () => {
      const status = createAuctionStatus({
        highestBid: 1000n,
      });
      // 1000 * 120 / 100 = 1200
      expect(status.minOutbidAmount(20)).toBe(1200n);
    });

    it("should return undefined when auction has ended", () => {
      const status = createAuctionStatus({ isEnded: true });
      expect(status.minOutbidAmount()).toBeUndefined();
    });
  });

  describe("wouldOutbid", () => {
    it("should return true when amount exceeds minimum", () => {
      const status = createAuctionStatus({
        highestBid: 1000n,
      });
      // Min outbid is 1100, so 1200 should win
      expect(status.wouldOutbid(1200n)).toBe(true);
    });

    it("should return true when amount equals minimum", () => {
      const status = createAuctionStatus({
        highestBid: 1000n,
      });
      // Min outbid is 1100
      expect(status.wouldOutbid(1100n)).toBe(true);
    });

    it("should return false when amount is below minimum", () => {
      const status = createAuctionStatus({
        highestBid: 1000n,
      });
      // Min outbid is 1100, so 1099 should not win
      expect(status.wouldOutbid(1099n)).toBe(false);
    });

    it("should return false when auction has ended", () => {
      const status = createAuctionStatus({ isEnded: true });
      expect(status.wouldOutbid(999999999n)).toBe(false);
    });

    it("should return true for any positive amount when no bids exist", () => {
      const status = createAuctionStatus({
        highestBid: undefined,
        highestBidder: undefined,
      });
      expect(status.wouldOutbid(1n)).toBe(true);
    });
  });

  describe("isActive", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(1700000000000);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return true when auction is active", () => {
      const futureDeadline = BigInt(Date.now() + 60000) * 1000n;
      const status = createAuctionStatus({
        deadline: futureDeadline,
        isEnded: false,
      });
      expect(status.isActive()).toBe(true);
    });

    it("should return false when auction has ended", () => {
      const status = createAuctionStatus({ isEnded: true });
      expect(status.isActive()).toBe(false);
    });

    it("should return false when deadline has passed", () => {
      const pastDeadline = BigInt(Date.now() - 1000) * 1000n;
      const status = createAuctionStatus({
        deadline: pastDeadline,
        isEnded: false,
      });
      expect(status.isActive()).toBe(false);
    });
  });
});

describe("DEFAULT_OUTBID_PERCENT", () => {
  it("should be 10 percent", () => {
    expect(DEFAULT_OUTBID_PERCENT).toBe(10);
  });
});
