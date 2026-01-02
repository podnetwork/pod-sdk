/**
 * @module tests/address
 * @description Unit tests for Address type and utilities
 */

import { describe, it, expect } from "vitest";
import { AddressSchema } from "../types/address.js";
import { toAddress, isAddress, isZeroAddress, ZERO_ADDRESS } from "../utils/address.js";

describe("AddressSchema", () => {
  describe("valid addresses", () => {
    it("should parse lowercase address", () => {
      // Arrange
      const input = "0x742d35cc6634c0532925a3b844bc454e4438f44e";

      // Act
      const result = AddressSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("0x742d35Cc6634C0532925a3b844Bc454e4438f44e");
      }
    });

    it("should parse uppercase address", () => {
      // Arrange
      const input = "0x742D35CC6634C0532925A3B844BC454E4438F44E";

      // Act
      const result = AddressSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("0x742d35Cc6634C0532925a3b844Bc454e4438f44e");
      }
    });

    it("should parse checksummed address", () => {
      // Arrange
      const input = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

      // Act
      const result = AddressSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(input);
      }
    });

    it("should parse zero address", () => {
      // Arrange
      const input = "0x0000000000000000000000000000000000000000";

      // Act
      const result = AddressSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(input);
      }
    });
  });

  describe("invalid addresses", () => {
    it("should reject address without 0x prefix", () => {
      // Arrange
      const input = "742d35cc6634c0532925a3b844bc454e4438f44e";

      // Act
      const result = AddressSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject address with too few characters", () => {
      // Arrange
      const input = "0x742d35cc6634c0532925a3b844bc454e4438f4";

      // Act
      const result = AddressSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject address with too many characters", () => {
      // Arrange
      const input = "0x742d35cc6634c0532925a3b844bc454e4438f44e00";

      // Act
      const result = AddressSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject address with invalid hex characters", () => {
      // Arrange
      const input = "0x742d35cc6634c0532925a3b844bc454e4438g44e";

      // Act
      const result = AddressSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject non-string input", () => {
      // Arrange
      const input = 12345;

      // Act
      const result = AddressSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject null", () => {
      // Act
      const result = AddressSchema.safeParse(null);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject empty string", () => {
      // Act
      const result = AddressSchema.safeParse("");

      // Assert
      expect(result.success).toBe(false);
    });
  });
});

describe("toAddress", () => {
  it("should convert lowercase to checksummed", () => {
    // Arrange
    const input = "0x742d35cc6634c0532925a3b844bc454e4438f44e";

    // Act
    const result = toAddress(input);

    // Assert
    expect(result).toBe("0x742d35Cc6634C0532925a3b844Bc454e4438f44e");
  });

  it("should preserve valid checksummed address", () => {
    // Arrange
    const input = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

    // Act
    const result = toAddress(input);

    // Assert
    expect(result).toBe(input);
  });

  it("should throw for invalid address", () => {
    // Arrange
    const input = "not-an-address";

    // Act & Assert
    expect(() => toAddress(input)).toThrow("Invalid address");
  });

  it("should throw for short address", () => {
    // Arrange
    const input = "0x123";

    // Act & Assert
    expect(() => toAddress(input)).toThrow("Invalid address");
  });
});

describe("isAddress", () => {
  it("should return true for valid address", () => {
    // Arrange
    const input = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

    // Act
    const result = isAddress(input);

    // Assert
    expect(result).toBe(true);
  });

  it("should return true for lowercase address", () => {
    // Arrange
    const input = "0x742d35cc6634c0532925a3b844bc454e4438f44e";

    // Act
    const result = isAddress(input);

    // Assert
    expect(result).toBe(true);
  });

  it("should return false for invalid string", () => {
    // Arrange
    const input = "not-an-address";

    // Act
    const result = isAddress(input);

    // Assert
    expect(result).toBe(false);
  });

  it("should return false for number", () => {
    // Act
    const result = isAddress(12345);

    // Assert
    expect(result).toBe(false);
  });

  it("should return false for null", () => {
    // Act
    const result = isAddress(null);

    // Assert
    expect(result).toBe(false);
  });

  it("should return false for undefined", () => {
    // Act
    const result = isAddress(undefined);

    // Assert
    expect(result).toBe(false);
  });

  it("should return false for object", () => {
    // Act
    const result = isAddress({ address: "0x123" });

    // Assert
    expect(result).toBe(false);
  });

  it("should return false for short hex string", () => {
    // Act
    const result = isAddress("0x123");

    // Assert
    expect(result).toBe(false);
  });
});

describe("ZERO_ADDRESS", () => {
  it("should be the zero address", () => {
    // Assert
    expect(ZERO_ADDRESS).toBe("0x0000000000000000000000000000000000000000");
  });
});

describe("isZeroAddress", () => {
  it("should return true for zero address", () => {
    // Arrange
    const input = "0x0000000000000000000000000000000000000000";

    // Act
    const result = isZeroAddress(input);

    // Assert
    expect(result).toBe(true);
  });

  it("should return true for ZERO_ADDRESS constant", () => {
    // Act
    const result = isZeroAddress(ZERO_ADDRESS);

    // Assert
    expect(result).toBe(true);
  });

  it("should return false for non-zero address", () => {
    // Arrange
    const input = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

    // Act
    const result = isZeroAddress(input);

    // Assert
    expect(result).toBe(false);
  });
});
