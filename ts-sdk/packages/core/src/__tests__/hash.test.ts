/**
 * @module tests/hash
 * @description Unit tests for Hash type and utilities
 */

import { describe, it, expect } from "vitest";
import { HashSchema } from "../types/hash.js";
import { toHash, isHash, isZeroHash, shortenHash, ZERO_HASH } from "../utils/hash.js";

// Test fixtures
const VALID_HASH_LOWERCASE = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
const VALID_HASH_MIXED = "0xABCDEF1234567890abcdef1234567890ABCDEF1234567890abcdef1234567890";
const ZERO_HASH_STRING = "0x" + "0".repeat(64);

describe("HashSchema", () => {
  describe("valid hashes", () => {
    it("should parse lowercase hash", () => {
      // Arrange
      const input = VALID_HASH_LOWERCASE;

      // Act
      const result = HashSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(VALID_HASH_LOWERCASE);
      }
    });

    it("should normalize mixed case to lowercase", () => {
      // Arrange
      const input = VALID_HASH_MIXED;

      // Act
      const result = HashSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(input.toLowerCase());
      }
    });

    it("should parse uppercase hash", () => {
      // Arrange
      const input = "0x" + "A".repeat(64);

      // Act
      const result = HashSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("0x" + "a".repeat(64));
      }
    });

    it("should parse zero hash", () => {
      // Arrange
      const input = ZERO_HASH_STRING;

      // Act
      const result = HashSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(ZERO_HASH_STRING);
      }
    });
  });

  describe("invalid hashes", () => {
    it("should reject hash without 0x prefix", () => {
      // Arrange
      const input = "a".repeat(64);

      // Act
      const result = HashSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject hash with too few characters", () => {
      // Arrange
      const input = "0x" + "a".repeat(63);

      // Act
      const result = HashSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject hash with too many characters", () => {
      // Arrange
      const input = "0x" + "a".repeat(65);

      // Act
      const result = HashSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject hash with invalid hex characters", () => {
      // Arrange
      const input = "0x" + "g".repeat(64);

      // Act
      const result = HashSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject non-string input", () => {
      // Act
      const result = HashSchema.safeParse(12345);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject null", () => {
      // Act
      const result = HashSchema.safeParse(null);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject empty string", () => {
      // Act
      const result = HashSchema.safeParse("");

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject address-length string", () => {
      // Arrange (40 chars = address, not 64 = hash)
      const input = "0x" + "a".repeat(40);

      // Act
      const result = HashSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});

describe("toHash", () => {
  it("should convert to lowercase", () => {
    // Arrange
    const input = VALID_HASH_MIXED;

    // Act
    const result = toHash(input);

    // Assert
    expect(result).toBe(input.toLowerCase());
  });

  it("should preserve lowercase hash", () => {
    // Arrange
    const input = VALID_HASH_LOWERCASE;

    // Act
    const result = toHash(input);

    // Assert
    expect(result).toBe(input);
  });

  it("should throw for invalid hash", () => {
    // Arrange
    const input = "not-a-hash";

    // Act & Assert
    expect(() => toHash(input)).toThrow("Invalid hash");
  });

  it("should throw for short hash", () => {
    // Arrange
    const input = "0x" + "a".repeat(32);

    // Act & Assert
    expect(() => toHash(input)).toThrow("Invalid hash");
  });

  it("should throw for address-length input", () => {
    // Arrange
    const input = "0x" + "a".repeat(40);

    // Act & Assert
    expect(() => toHash(input)).toThrow("Invalid hash");
  });
});

describe("isHash", () => {
  it("should return true for valid lowercase hash", () => {
    // Act
    const result = isHash(VALID_HASH_LOWERCASE);

    // Assert
    expect(result).toBe(true);
  });

  it("should return true for valid mixed case hash", () => {
    // Act
    const result = isHash(VALID_HASH_MIXED);

    // Assert
    expect(result).toBe(true);
  });

  it("should return true for zero hash", () => {
    // Act
    const result = isHash(ZERO_HASH_STRING);

    // Assert
    expect(result).toBe(true);
  });

  it("should return false for invalid string", () => {
    // Act
    const result = isHash("not-a-hash");

    // Assert
    expect(result).toBe(false);
  });

  it("should return false for number", () => {
    // Act
    const result = isHash(12345);

    // Assert
    expect(result).toBe(false);
  });

  it("should return false for null", () => {
    // Act
    const result = isHash(null);

    // Assert
    expect(result).toBe(false);
  });

  it("should return false for undefined", () => {
    // Act
    const result = isHash(undefined);

    // Assert
    expect(result).toBe(false);
  });

  it("should return false for short hash", () => {
    // Act
    const result = isHash("0x" + "a".repeat(32));

    // Assert
    expect(result).toBe(false);
  });

  it("should return false for address-length string", () => {
    // Act
    const result = isHash("0x" + "a".repeat(40));

    // Assert
    expect(result).toBe(false);
  });
});

describe("ZERO_HASH", () => {
  it("should be the zero hash", () => {
    // Assert
    expect(ZERO_HASH).toBe(ZERO_HASH_STRING);
  });
});

describe("isZeroHash", () => {
  it("should return true for zero hash string", () => {
    // Act
    const result = isZeroHash(ZERO_HASH_STRING);

    // Assert
    expect(result).toBe(true);
  });

  it("should return true for ZERO_HASH constant", () => {
    // Act
    const result = isZeroHash(ZERO_HASH);

    // Assert
    expect(result).toBe(true);
  });

  it("should return false for non-zero hash", () => {
    // Act
    const result = isZeroHash(VALID_HASH_LOWERCASE);

    // Assert
    expect(result).toBe(false);
  });
});

describe("shortenHash", () => {
  it("should shorten hash with default chars (4)", () => {
    // Arrange
    const input = VALID_HASH_LOWERCASE;

    // Act
    const result = shortenHash(input);

    // Assert
    expect(result).toBe("0xabcd...7890");
  });

  it("should shorten hash with custom chars", () => {
    // Arrange
    const input = VALID_HASH_LOWERCASE;

    // Act
    const result = shortenHash(input, 6);

    // Assert
    expect(result).toBe("0xabcdef...567890");
  });

  it("should normalize to lowercase when shortening", () => {
    // Arrange
    const input = VALID_HASH_MIXED;

    // Act
    const result = shortenHash(input);

    // Assert
    expect(result).toBe("0xabcd...7890");
  });

  it("should shorten zero hash", () => {
    // Act
    const result = shortenHash(ZERO_HASH);

    // Assert
    expect(result).toBe("0x0000...0000");
  });

  it("should throw for invalid hash", () => {
    // Act & Assert
    expect(() => shortenHash("not-a-hash")).toThrow("Invalid hash");
  });
});
