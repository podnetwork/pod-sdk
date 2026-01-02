/**
 * Tests for truncateHash utility
 */

import { describe, it, expect } from "vitest";
import {
  truncateHash,
  isValidHash,
  isValidAddress,
  isValidTxHash,
} from "../../../src/utils/truncate-hash.js";

describe("truncateHash", () => {
  const SAMPLE_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
  const SAMPLE_TX_HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

  describe("middle truncation (default)", () => {
    it("should truncate in the middle with default chars", () => {
      const result = truncateHash(SAMPLE_ADDRESS);
      expect(result).toBe("0x123456...345678");
    });

    it("should preserve 0x prefix", () => {
      const result = truncateHash(SAMPLE_ADDRESS);
      expect(result.startsWith("0x")).toBe(true);
    });

    it("should handle custom char count", () => {
      const result = truncateHash(SAMPLE_ADDRESS, { chars: 4 });
      expect(result).toBe("0x1234...5678");
    });

    it("should handle long hashes", () => {
      const result = truncateHash(SAMPLE_TX_HASH, { chars: 8 });
      expect(result).toBe("0x12345678...90abcdef");
    });
  });

  describe("start truncation", () => {
    it("should show only end characters", () => {
      const result = truncateHash(SAMPLE_ADDRESS, { mode: "start", chars: 6 });
      expect(result).toBe("...345678");
    });

    it("should handle custom char count", () => {
      const result = truncateHash(SAMPLE_ADDRESS, { mode: "start", chars: 8 });
      expect(result).toBe("...12345678");
    });
  });

  describe("end truncation", () => {
    it("should show only start characters with 0x prefix", () => {
      const result = truncateHash(SAMPLE_ADDRESS, { mode: "end", chars: 6 });
      expect(result).toBe("0x123456...");
    });

    it("should handle custom char count", () => {
      const result = truncateHash(SAMPLE_ADDRESS, { mode: "end", chars: 8 });
      expect(result).toBe("0x12345678...");
    });
  });

  describe("no truncation", () => {
    it("should return full hash when mode is none", () => {
      const result = truncateHash(SAMPLE_ADDRESS, { mode: "none" });
      expect(result).toBe(SAMPLE_ADDRESS);
    });

    it("should preserve original case when mode is none", () => {
      const mixedCase = "0xABCDEF1234567890";
      const result = truncateHash(mixedCase, { mode: "none" });
      expect(result).toBe(mixedCase);
    });
  });

  describe("edge cases", () => {
    it("should return empty string for empty input", () => {
      expect(truncateHash("")).toBe("");
    });

    it("should return empty string for null/undefined", () => {
      expect(truncateHash(null as unknown as string)).toBe("");
      expect(truncateHash(undefined as unknown as string)).toBe("");
    });

    it("should normalize to lowercase", () => {
      const mixedCase = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
      const result = truncateHash(mixedCase, { mode: "middle", chars: 4 });
      expect(result).toBe("0xabcd...ef12");
    });

    it("should handle hash without 0x prefix", () => {
      const noPrefix = "1234567890abcdef1234567890abcdef12345678";
      const result = truncateHash(noPrefix, { mode: "middle", chars: 4 });
      expect(result).toBe("1234...5678");
    });

    it("should not truncate if hash is too short", () => {
      const shortHash = "0x1234";
      const result = truncateHash(shortHash, { mode: "middle", chars: 6 });
      expect(result).toBe("0x1234");
    });
  });
});

describe("isValidHash", () => {
  it("should return true for valid hex hash with 0x prefix", () => {
    expect(isValidHash("0x1234abcdef")).toBe(true);
  });

  it("should return true for valid hex hash without 0x prefix", () => {
    expect(isValidHash("1234abcdef")).toBe(true);
  });

  it("should return true for uppercase hex", () => {
    expect(isValidHash("0xABCDEF")).toBe(true);
  });

  it("should return false for non-hex characters", () => {
    expect(isValidHash("0xghijkl")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isValidHash("")).toBe(false);
  });

  it("should return false for null/undefined", () => {
    expect(isValidHash(null as unknown as string)).toBe(false);
    expect(isValidHash(undefined as unknown as string)).toBe(false);
  });
});

describe("isValidAddress", () => {
  const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
  const CHECKSUM_ADDRESS = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";

  it("should return true for valid address", () => {
    expect(isValidAddress(VALID_ADDRESS)).toBe(true);
  });

  it("should return true for checksum address", () => {
    expect(isValidAddress(CHECKSUM_ADDRESS)).toBe(true);
  });

  it("should return false for address without 0x prefix", () => {
    expect(isValidAddress("1234567890abcdef1234567890abcdef12345678")).toBe(false);
  });

  it("should return false for short address", () => {
    expect(isValidAddress("0x1234567890abcdef")).toBe(false);
  });

  it("should return false for long address", () => {
    expect(isValidAddress(VALID_ADDRESS + "00")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isValidAddress("")).toBe(false);
  });
});

describe("isValidTxHash", () => {
  const VALID_TX_HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

  it("should return true for valid transaction hash", () => {
    expect(isValidTxHash(VALID_TX_HASH)).toBe(true);
  });

  it("should return false for address (40 chars)", () => {
    expect(isValidTxHash("0x1234567890abcdef1234567890abcdef12345678")).toBe(false);
  });

  it("should return false for short hash", () => {
    expect(isValidTxHash("0x1234567890abcdef")).toBe(false);
  });

  it("should return false for hash without 0x prefix", () => {
    expect(isValidTxHash("1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")).toBe(
      false
    );
  });

  it("should return false for empty string", () => {
    expect(isValidTxHash("")).toBe(false);
  });
});
