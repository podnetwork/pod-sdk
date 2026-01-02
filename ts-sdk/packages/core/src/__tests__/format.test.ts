/**
 * @module tests/format
 * @description Unit tests for POD and Gwei formatting utilities
 */

import { describe, it, expect } from "vitest";
import { parsePod, formatPod, formatPodFixed, parseGwei, formatGwei } from "../utils/format.js";

describe("parsePod", () => {
  describe("whole numbers", () => {
    it("should parse 1 POD", () => {
      // Act
      const result = parsePod("1");

      // Assert
      expect(result).toBe(1000000000000000000n);
    });

    it("should parse 0 POD", () => {
      // Act
      const result = parsePod("0");

      // Assert
      expect(result).toBe(0n);
    });

    it("should parse large amounts", () => {
      // Act
      const result = parsePod("1000000");

      // Assert
      expect(result).toBe(1000000000000000000000000n);
    });
  });

  describe("decimal numbers", () => {
    it("should parse 1.5 POD", () => {
      // Act
      const result = parsePod("1.5");

      // Assert
      expect(result).toBe(1500000000000000000n);
    });

    it("should parse 0.001 POD", () => {
      // Act
      const result = parsePod("0.001");

      // Assert
      expect(result).toBe(1000000000000000n);
    });

    it("should parse minimum unit (1 wei)", () => {
      // Act
      const result = parsePod("0.000000000000000001");

      // Assert
      expect(result).toBe(1n);
    });

    it("should parse with trailing zeros", () => {
      // Act
      const result = parsePod("1.500");

      // Assert
      expect(result).toBe(1500000000000000000n);
    });
  });

  describe("edge cases", () => {
    it("should handle leading zeros", () => {
      // Act
      const result = parsePod("01.5");

      // Assert
      expect(result).toBe(1500000000000000000n);
    });

    it("should handle whitespace", () => {
      // Act
      const result = parsePod("  1  ");

      // Assert
      expect(result).toBe(1000000000000000000n);
    });

    it("should parse negative values", () => {
      // Act
      const result = parsePod("-1");

      // Assert
      expect(result).toBe(-1000000000000000000n);
    });

    it("should parse negative decimals", () => {
      // Act
      const result = parsePod("-0.5");

      // Assert
      expect(result).toBe(-500000000000000000n);
    });
  });

  describe("invalid inputs", () => {
    it("should throw for too many decimal places", () => {
      // Act & Assert
      expect(() => parsePod("1.0000000000000000001")).toThrow("Too many decimal places");
    });

    it("should throw for non-numeric string", () => {
      // Act & Assert
      expect(() => parsePod("abc")).toThrow("Invalid decimal value");
    });

    it("should throw for empty string", () => {
      // Act & Assert
      expect(() => parsePod("")).toThrow("Invalid decimal value");
    });

    it("should throw for multiple dots", () => {
      // Act & Assert
      expect(() => parsePod("1.2.3")).toThrow("Invalid decimal value");
    });
  });
});

describe("formatPod", () => {
  describe("whole numbers", () => {
    it("should format 1 POD", () => {
      // Arrange
      const wei = 1000000000000000000n;

      // Act
      const result = formatPod(wei);

      // Assert
      expect(result).toBe("1");
    });

    it("should format 0 POD", () => {
      // Act
      const result = formatPod(0n);

      // Assert
      expect(result).toBe("0");
    });

    it("should format large amounts", () => {
      // Arrange
      const wei = 1000000000000000000000000n;

      // Act
      const result = formatPod(wei);

      // Assert
      expect(result).toBe("1000000");
    });
  });

  describe("decimal numbers", () => {
    it("should format 1.5 POD", () => {
      // Arrange
      const wei = 1500000000000000000n;

      // Act
      const result = formatPod(wei);

      // Assert
      expect(result).toBe("1.5");
    });

    it("should format 0.001 POD", () => {
      // Arrange
      const wei = 1000000000000000n;

      // Act
      const result = formatPod(wei);

      // Assert
      expect(result).toBe("0.001");
    });

    it("should format 1 wei", () => {
      // Act
      const result = formatPod(1n);

      // Assert
      expect(result).toBe("0.000000000000000001");
    });

    it("should remove trailing zeros", () => {
      // Arrange
      const wei = 1500000000000000000n;

      // Act
      const result = formatPod(wei);

      // Assert
      expect(result).toBe("1.5"); // Not "1.500000000000000000"
    });
  });

  describe("negative values", () => {
    it("should format negative whole number", () => {
      // Act
      const result = formatPod(-1000000000000000000n);

      // Assert
      expect(result).toBe("-1");
    });

    it("should format negative decimal", () => {
      // Act
      const result = formatPod(-500000000000000000n);

      // Assert
      expect(result).toBe("-0.5");
    });
  });
});

describe("formatPodFixed", () => {
  it("should format with 2 decimal places", () => {
    // Arrange
    const wei = 1500000000000000000n;

    // Act
    const result = formatPodFixed(wei, 2);

    // Assert
    expect(result).toBe("1.50");
  });

  it("should format with 4 decimal places", () => {
    // Arrange
    const wei = 1000000000000000000n;

    // Act
    const result = formatPodFixed(wei, 4);

    // Assert
    expect(result).toBe("1.0000");
  });

  it("should format with 0 decimal places", () => {
    // Arrange
    const wei = 1500000000000000000n;

    // Act
    const result = formatPodFixed(wei, 0);

    // Assert
    expect(result).toBe("1");
  });

  it("should truncate excess decimals", () => {
    // Arrange
    const wei = 1234567890000000000n;

    // Act
    const result = formatPodFixed(wei, 2);

    // Assert
    expect(result).toBe("1.23");
  });

  it("should pad with zeros when needed", () => {
    // Arrange
    const wei = 1000000000000000000n;

    // Act
    const result = formatPodFixed(wei, 6);

    // Assert
    expect(result).toBe("1.000000");
  });

  it("should format 0 with decimals", () => {
    // Act
    const result = formatPodFixed(0n, 4);

    // Assert
    expect(result).toBe("0.0000");
  });
});

describe("parseGwei", () => {
  it("should parse 1 Gwei", () => {
    // Act
    const result = parseGwei("1");

    // Assert
    expect(result).toBe(1000000000n);
  });

  it("should parse 0 Gwei", () => {
    // Act
    const result = parseGwei("0");

    // Assert
    expect(result).toBe(0n);
  });

  it("should parse 1.5 Gwei", () => {
    // Act
    const result = parseGwei("1.5");

    // Assert
    expect(result).toBe(1500000000n);
  });

  it("should parse fractional Gwei", () => {
    // Act
    const result = parseGwei("0.000000001");

    // Assert
    expect(result).toBe(1n);
  });

  it("should throw for too many decimals", () => {
    // Act & Assert
    expect(() => parseGwei("1.0000000001")).toThrow("Too many decimal places");
  });
});

describe("formatGwei", () => {
  it("should format 1 Gwei", () => {
    // Arrange
    const wei = 1000000000n;

    // Act
    const result = formatGwei(wei);

    // Assert
    expect(result).toBe("1");
  });

  it("should format 1.5 Gwei", () => {
    // Arrange
    const wei = 1500000000n;

    // Act
    const result = formatGwei(wei);

    // Assert
    expect(result).toBe("1.5");
  });

  it("should format 0 Gwei", () => {
    // Act
    const result = formatGwei(0n);

    // Assert
    expect(result).toBe("0");
  });

  it("should format 1 wei in Gwei", () => {
    // Act
    const result = formatGwei(1n);

    // Assert
    expect(result).toBe("0.000000001");
  });

  it("should remove trailing zeros", () => {
    // Arrange
    const wei = 1500000000n;

    // Act
    const result = formatGwei(wei);

    // Assert
    expect(result).toBe("1.5"); // Not "1.500000000"
  });
});

describe("round-trip conversions", () => {
  it("should round-trip POD values", () => {
    // Arrange
    const values = ["0", "1", "1.5", "0.001", "1000000", "0.000000000000000001"];

    for (const value of values) {
      // Act
      const wei = parsePod(value);
      const result = formatPod(wei);

      // Assert
      expect(result).toBe(value);
    }
  });

  it("should round-trip Gwei values", () => {
    // Arrange
    const values = ["0", "1", "1.5", "0.000000001", "100"];

    for (const value of values) {
      // Act
      const wei = parseGwei(value);
      const result = formatGwei(wei);

      // Assert
      expect(result).toBe(value);
    }
  });
});
