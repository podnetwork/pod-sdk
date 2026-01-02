/**
 * Unit tests for address utilities.
 * These tests verify our EIP-55 implementation matches ethers.js behavior.
 */

import { describe, it, expect } from "vitest";
import { toAddress, isAddress, ZERO_ADDRESS, isZeroAddress } from "../../../src/utils/address.js";

describe("toAddress", () => {
  describe("checksum conversion", () => {
    it("should convert lowercase address to checksummed", () => {
      const input = "0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed";
      const result = toAddress(input);
      expect(result).toBe("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed");
    });

    it("should convert uppercase address to checksummed", () => {
      const input = "0x5AAEB6053F3E94C9B9A09F33669435E7EF1BEAED";
      const result = toAddress(input);
      expect(result).toBe("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed");
    });

    it("should preserve already checksummed address", () => {
      const input = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
      const result = toAddress(input);
      expect(result).toBe(input);
    });

    it("should handle zero address", () => {
      const result = toAddress("0x0000000000000000000000000000000000000000");
      expect(result).toBe("0x0000000000000000000000000000000000000000");
    });
  });

  describe("EIP-55 test vectors", () => {
    // Test vectors from EIP-55 specification
    const testCases = [
      // All lowercase
      ["0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed", "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed"],
      ["0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359", "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359"],
      ["0xdbf03b407c01e7cd3cbea99509d93f8dddc8c6fb", "0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB"],
      ["0xd1220a0cf47c7b9be7a2e6ba89f429762e7b9adb", "0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb"],
    ] as const;

    testCases.forEach(([input, expected]) => {
      it(`should checksum ${input} correctly`, () => {
        const result = toAddress(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe("error handling", () => {
    it("should throw on invalid format", () => {
      expect(() => toAddress("0x123")).toThrow("Invalid address");
    });

    it("should throw on non-hex characters", () => {
      expect(() => toAddress("0x5aaeb6053f3e94c9b9a09f33669435e7ef1beagg")).toThrow(
        "Invalid address"
      );
    });

    it("should throw on missing 0x prefix", () => {
      expect(() => toAddress("5aaeb6053f3e94c9b9a09f33669435e7ef1beaed")).toThrow(
        "Invalid address"
      );
    });

    it("should throw on too long address", () => {
      expect(() => toAddress("0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed00")).toThrow(
        "Invalid address"
      );
    });

    it("should throw on too short address", () => {
      expect(() => toAddress("0x5aaeb6053f3e94c9b9a09f33669435e7ef1bea")).toThrow(
        "Invalid address"
      );
    });

    it("should throw on invalid checksum (mixed case)", () => {
      // This is a valid format but invalid checksum
      expect(() => toAddress("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1beaed")).toThrow(
        "Invalid address"
      );
    });
  });
});

describe("isAddress", () => {
  describe("valid addresses", () => {
    it("should accept lowercase address", () => {
      expect(isAddress("0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed")).toBe(true);
    });

    it("should accept uppercase address", () => {
      expect(isAddress("0x5AAEB6053F3E94C9B9A09F33669435E7EF1BEAED")).toBe(true);
    });

    it("should accept checksummed address", () => {
      expect(isAddress("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed")).toBe(true);
    });

    it("should accept zero address", () => {
      expect(isAddress("0x0000000000000000000000000000000000000000")).toBe(true);
    });
  });

  describe("invalid addresses", () => {
    it("should reject too short", () => {
      expect(isAddress("0x5aaeb6053f3e94c9b9a09f33669435e7ef1bea")).toBe(false);
    });

    it("should reject too long", () => {
      expect(isAddress("0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed00")).toBe(false);
    });

    it("should reject invalid hex chars", () => {
      expect(isAddress("0x5aaeb6053f3e94c9b9a09f33669435e7ef1beagg")).toBe(false);
    });

    it("should reject missing 0x prefix", () => {
      expect(isAddress("5aaeb6053f3e94c9b9a09f33669435e7ef1beaed")).toBe(false);
    });

    it("should reject invalid checksum", () => {
      // Mixed case but invalid checksum
      expect(isAddress("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1beaed")).toBe(false);
    });
  });

  describe("non-string inputs", () => {
    it("should reject null", () => {
      expect(isAddress(null)).toBe(false);
    });

    it("should reject undefined", () => {
      expect(isAddress(undefined)).toBe(false);
    });

    it("should reject number", () => {
      expect(isAddress(12345)).toBe(false);
    });

    it("should reject object", () => {
      expect(isAddress({})).toBe(false);
    });

    it("should reject array", () => {
      expect(isAddress([])).toBe(false);
    });
  });
});

describe("ZERO_ADDRESS", () => {
  it("should be the zero address", () => {
    expect(ZERO_ADDRESS).toBe("0x0000000000000000000000000000000000000000");
  });

  it("should be 42 characters", () => {
    expect(ZERO_ADDRESS.length).toBe(42);
  });
});

describe("isZeroAddress", () => {
  it("should return true for zero address", () => {
    expect(isZeroAddress("0x0000000000000000000000000000000000000000")).toBe(true);
  });

  it("should return false for non-zero address", () => {
    expect(isZeroAddress("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed")).toBe(false);
  });

  it("should handle lowercase zero address", () => {
    expect(isZeroAddress("0x0000000000000000000000000000000000000000")).toBe(true);
  });

  it("should return false for address with single non-zero digit", () => {
    expect(isZeroAddress("0x0000000000000000000000000000000000000001")).toBe(false);
  });
});
