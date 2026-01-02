// Unit tests for BidEvent schema validation

import { describe, it, expect } from "vitest";
import {
  BidEventSchema,
  SideSchema,
  type BidEvent,
  type CLOBBidInfo,
  type Side,
} from "../../../src/schemas/bid-event.js";

describe("BidEventSchema", () => {
  describe("SideSchema", () => {
    it("should parse buy side", () => {
      const result = SideSchema.safeParse("buy");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("buy");
      }
    });

    it("should parse sell side", () => {
      const result = SideSchema.safeParse("sell");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("sell");
      }
    });

    it("should reject invalid side", () => {
      const result = SideSchema.safeParse("hold");
      expect(result.success).toBe(false);
    });
  });

  describe("CLOBBidInfo parsing", () => {
    it("should parse a valid bid event with single bid", () => {
      const input = {
        clob_id: "0x" + "a".repeat(64),
        bids: [
          {
            tx_hash: "b".repeat(64),
            bidder: "0x" + "c".repeat(40),
            volume: "1000000000000000000",
            price: "1500000000000000000",
            side: "buy",
            start_ts: 1234567890,
            end_ts: 1234567899,
            nonce: 42,
          },
        ],
        timestamp: 1234567890123456,
      };

      const result = BidEventSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.clobId).toBe("0x" + "a".repeat(64));
        expect(result.data.bids.length).toBe(1);
        expect(result.data.timestamp).toBe(1234567890123456n);

        const bid = result.data.bids[0]!;
        expect(bid.txHash).toBe("0x" + "b".repeat(64));
        expect(bid.bidder).toBe("0x" + "c".repeat(40));
        expect(bid.volume).toBe(1000000000000000000n);
        expect(bid.price).toBe(1500000000000000000n);
        expect(bid.side).toBe("buy");
        expect(bid.startTs).toBe(1234567890n);
        expect(bid.endTs).toBe(1234567899n);
        expect(bid.nonce).toBe(42n);
      }
    });

    it("should parse bid event with sell side", () => {
      const input = {
        clob_id: "0x" + "a".repeat(64),
        bids: [
          {
            tx_hash: "0x" + "b".repeat(64),
            bidder: "0x" + "c".repeat(40),
            volume: "100",
            price: "200",
            side: "sell",
            start_ts: 1,
            end_ts: 5,
            nonce: 0,
          },
        ],
        timestamp: 1000,
      };

      const result = BidEventSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bids[0]?.side).toBe("sell");
      }
    });

    it("should parse bid event with multiple bids", () => {
      const input = {
        clob_id: "0x" + "a".repeat(64),
        bids: [
          {
            tx_hash: "0x" + "b".repeat(64),
            bidder: "0x" + "c".repeat(40),
            volume: "100",
            price: "200",
            side: "buy",
            start_ts: 1,
            end_ts: 5,
            nonce: 0,
          },
          {
            tx_hash: "0x" + "d".repeat(64),
            bidder: "0x" + "e".repeat(40),
            volume: "500",
            price: "300",
            side: "sell",
            start_ts: 6,
            end_ts: 10,
            nonce: 1,
          },
        ],
        timestamp: 1000,
      };

      const result = BidEventSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bids.length).toBe(2);
        expect(result.data.bids[0]?.side).toBe("buy");
        expect(result.data.bids[1]?.side).toBe("sell");
      }
    });

    it("should parse bid event with empty bids array", () => {
      const input = {
        clob_id: "0x" + "a".repeat(64),
        bids: [],
        timestamp: 1000,
      };

      const result = BidEventSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bids.length).toBe(0);
      }
    });

    it("should add 0x prefix to clob_id if missing", () => {
      const input = {
        clob_id: "a".repeat(64), // No 0x prefix
        bids: [],
        timestamp: 1000,
      };

      const result = BidEventSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.clobId).toBe("0x" + "a".repeat(64));
      }
    });

    it("should add 0x prefix to tx_hash if missing", () => {
      const input = {
        clob_id: "0x" + "a".repeat(64),
        bids: [
          {
            tx_hash: "b".repeat(64), // No 0x prefix
            bidder: "0x" + "c".repeat(40),
            volume: "100",
            price: "200",
            side: "buy",
            start_ts: 1,
            end_ts: 5,
            nonce: 0,
          },
        ],
        timestamp: 1000,
      };

      const result = BidEventSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bids[0]?.txHash).toBe("0x" + "b".repeat(64));
      }
    });
  });

  describe("validation", () => {
    it("should reject event with invalid side", () => {
      const input = {
        clob_id: "0x" + "a".repeat(64),
        bids: [
          {
            tx_hash: "0x" + "b".repeat(64),
            bidder: "0x" + "c".repeat(40),
            volume: "100",
            price: "200",
            side: "hold", // Invalid
            start_ts: 1,
            end_ts: 5,
            nonce: 0,
          },
        ],
        timestamp: 1000,
      };

      const result = BidEventSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject event missing required fields", () => {
      const input = {
        clob_id: "0x" + "a".repeat(64),
        // Missing bids and timestamp
      };

      const result = BidEventSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject event with bid missing volume", () => {
      const input = {
        clob_id: "0x" + "a".repeat(64),
        bids: [
          {
            tx_hash: "0x" + "b".repeat(64),
            bidder: "0x" + "c".repeat(40),
            // Missing volume
            price: "200",
            side: "buy",
            start_ts: 1,
            end_ts: 5,
            nonce: 0,
          },
        ],
        timestamp: 1000,
      };

      const result = BidEventSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("bigint conversions", () => {
    it("should parse decimal string volumes and prices", () => {
      const input = {
        clob_id: "0x" + "a".repeat(64),
        bids: [
          {
            tx_hash: "0x" + "b".repeat(64),
            bidder: "0x" + "c".repeat(40),
            volume: "1234567890123456789",
            price: "9876543210987654321",
            side: "buy",
            start_ts: 1000000,
            end_ts: 2000000,
            nonce: 5,
          },
        ],
        timestamp: 1234567890123456,
      };

      const result = BidEventSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        const bid = result.data.bids[0]!;
        expect(bid.volume).toBe(1234567890123456789n);
        expect(bid.price).toBe(9876543210987654321n);
        expect(bid.startTs).toBe(1000000n);
        expect(bid.endTs).toBe(2000000n);
        expect(bid.nonce).toBe(5n);
      }
    });

    it("should convert timestamp to bigint", () => {
      const input = {
        clob_id: "0x" + "a".repeat(64),
        bids: [],
        timestamp: 9007199254740991, // Max safe integer
      };

      const result = BidEventSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timestamp).toBe(9007199254740991n);
      }
    });
  });

  describe("type inference", () => {
    it("should correctly type the parsed result", () => {
      const input = {
        clob_id: "0x" + "a".repeat(64),
        bids: [
          {
            tx_hash: "0x" + "b".repeat(64),
            bidder: "0x" + "c".repeat(40),
            volume: "100",
            price: "200",
            side: "buy",
            start_ts: 1,
            end_ts: 5,
            nonce: 0,
          },
        ],
        timestamp: 1000,
      };

      const result = BidEventSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        // These type assertions should work if types are correct
        const event: BidEvent = result.data;
        const bid: CLOBBidInfo | undefined = event.bids[0];
        const side: Side | undefined = bid?.side;

        expect(event.clobId).toBeDefined();
        expect(bid?.txHash).toBeDefined();
        expect(side).toBe("buy");
      }
    });
  });
});
