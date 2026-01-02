// Unit tests for faucet schemas

import { describe, it, expect } from "vitest";
import { FaucetResponseDataSchema, type FaucetResponseData } from "../../src/schemas/index.js";

describe("FaucetResponseDataSchema", () => {
  describe("valid responses", () => {
    it("should parse a valid response with single tx hash", () => {
      const input = {
        tx_hashes: ["0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"],
      };

      const result = FaucetResponseDataSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.txHashes).toHaveLength(1);
        expect(result.data.txHashes[0]).toBe(
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        );
      }
    });

    it("should parse a valid response with multiple tx hashes", () => {
      const input = {
        tx_hashes: [
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        ],
      };

      const result = FaucetResponseDataSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.txHashes).toHaveLength(2);
        expect(result.data.txHashes[0]).toBe(
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        );
        expect(result.data.txHashes[1]).toBe(
          "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
        );
      }
    });

    it("should parse a valid response with empty tx hashes array", () => {
      const input = {
        tx_hashes: [],
      };

      const result = FaucetResponseDataSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.txHashes).toHaveLength(0);
      }
    });

    it("should normalize hashes to lowercase", () => {
      const input = {
        tx_hashes: ["0xABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890"],
      };

      const result = FaucetResponseDataSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.txHashes[0]).toBe(
          "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
        );
      }
    });
  });

  describe("invalid responses", () => {
    it("should reject invalid hash in array", () => {
      const input = {
        tx_hashes: ["0x123"], // Too short
      };

      const result = FaucetResponseDataSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject missing tx_hashes", () => {
      const input = {};

      const result = FaucetResponseDataSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject non-array tx_hashes", () => {
      const input = {
        tx_hashes: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      };

      const result = FaucetResponseDataSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject invalid hex hash", () => {
      const input = {
        tx_hashes: ["0xGGGG567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"],
      };

      const result = FaucetResponseDataSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe("type assertions", () => {
    it("should produce correct type", () => {
      const input = {
        tx_hashes: ["0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"],
      };

      const result = FaucetResponseDataSchema.parse(input);

      // Type check - these should compile
      const txHashes: readonly `0x${string}`[] = result.txHashes;
      const response: FaucetResponseData = result;

      expect(txHashes).toBeDefined();
      expect(response).toBeDefined();
    });
  });
});
