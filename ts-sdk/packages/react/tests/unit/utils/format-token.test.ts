/**
 * Tests for formatTokenAmount and parseTokenAmount utilities
 */

import { describe, it, expect } from "vitest";
import { formatTokenAmount, parseTokenAmount } from "../../../src/utils/format-token.js";

describe("formatTokenAmount", () => {
  describe("basic formatting", () => {
    it("should format 1 ETH correctly", () => {
      const oneEth = 1000000000000000000n;
      expect(formatTokenAmount(oneEth)).toBe("1");
    });

    it("should format 1.5 ETH correctly", () => {
      const onePointFiveEth = 1500000000000000000n;
      expect(formatTokenAmount(onePointFiveEth)).toBe("1.5");
    });

    it("should format 0.001 ETH correctly", () => {
      const smallAmount = 1000000000000000n;
      expect(formatTokenAmount(smallAmount)).toBe("0.001");
    });

    it("should format 0 correctly", () => {
      expect(formatTokenAmount(0n)).toBe("0");
    });

    it("should format large amounts correctly", () => {
      const million = 1000000n * 1000000000000000000n;
      expect(formatTokenAmount(million)).toBe("1,000,000");
    });
  });

  describe("with symbol", () => {
    it("should append symbol", () => {
      const oneEth = 1000000000000000000n;
      expect(formatTokenAmount(oneEth, { symbol: "pETH" })).toBe("1 pETH");
    });

    it("should append symbol with decimal values", () => {
      const amount = 1234500000000000000n;
      expect(formatTokenAmount(amount, { symbol: "ETH" })).toBe("1.2345 ETH");
    });
  });

  describe("custom decimals", () => {
    it("should handle USDC (6 decimals)", () => {
      const oneUsdc = 1000000n;
      expect(formatTokenAmount(oneUsdc, { decimals: 6 })).toBe("1");
    });

    it("should handle USDC with cents", () => {
      const usdcAmount = 1500000n;
      expect(formatTokenAmount(usdcAmount, { decimals: 6 })).toBe("1.5");
    });

    it("should handle USDC with symbol", () => {
      const usdcAmount = 100000000n;
      expect(formatTokenAmount(usdcAmount, { decimals: 6, symbol: "USDC" })).toBe("100 USDC");
    });
  });

  describe("compact notation", () => {
    it("should format thousands as K", () => {
      const thousand = 1000n * 1000000000000000000n;
      const result = formatTokenAmount(thousand, { compact: true });
      expect(result).toBe("1K");
    });

    it("should format millions as M", () => {
      const million = 1000000n * 1000000000000000000n;
      const result = formatTokenAmount(million, { compact: true });
      expect(result).toBe("1M");
    });

    it("should format billions as B", () => {
      const billion = 1000000000n * 1000000000000000000n;
      const result = formatTokenAmount(billion, { compact: true });
      expect(result).toBe("1B");
    });
  });

  describe("decimal precision", () => {
    it("should respect maxDecimals", () => {
      const amount = 1234567890123456789n;
      const result = formatTokenAmount(amount, { maxDecimals: 2 });
      expect(result).toBe("1.23");
    });

    it("should respect minDecimals", () => {
      const oneEth = 1000000000000000000n;
      const result = formatTokenAmount(oneEth, { minDecimals: 2 });
      expect(result).toBe("1.00");
    });
  });

  describe("grouping", () => {
    it("should use thousands separator by default", () => {
      const million = 1000000n * 1000000000000000000n;
      const result = formatTokenAmount(million, { compact: false });
      expect(result).toBe("1,000,000");
    });

    it("should disable grouping when specified", () => {
      const million = 1000000n * 1000000000000000000n;
      const result = formatTokenAmount(million, { useGrouping: false });
      expect(result).toBe("1000000");
    });
  });
});

describe("parseTokenAmount", () => {
  describe("basic parsing", () => {
    it("should parse whole numbers", () => {
      expect(parseTokenAmount("1")).toBe(1000000000000000000n);
    });

    it("should parse decimal numbers", () => {
      expect(parseTokenAmount("1.5")).toBe(1500000000000000000n);
    });

    it("should parse small decimals", () => {
      expect(parseTokenAmount("0.001")).toBe(1000000000000000n);
    });

    it("should parse zero", () => {
      expect(parseTokenAmount("0")).toBe(0n);
    });
  });

  describe("custom decimals", () => {
    it("should parse USDC amounts (6 decimals)", () => {
      expect(parseTokenAmount("1", 6)).toBe(1000000n);
    });

    it("should parse USDC with cents", () => {
      expect(parseTokenAmount("1.50", 6)).toBe(1500000n);
    });

    it("should parse small USDC amounts", () => {
      expect(parseTokenAmount("0.000001", 6)).toBe(1n);
    });
  });

  describe("input normalization", () => {
    it("should handle whitespace", () => {
      expect(parseTokenAmount("  1.5  ")).toBe(1500000000000000000n);
    });

    it("should handle commas", () => {
      expect(parseTokenAmount("1,000")).toBe(1000n * 1000000000000000000n);
    });

    it("should handle commas with decimals", () => {
      expect(parseTokenAmount("1,234.56")).toBe(1234560000000000000000n);
    });
  });

  describe("precision handling", () => {
    it("should truncate excess decimals", () => {
      // More than 18 decimal places should be truncated
      expect(parseTokenAmount("0.12345678901234567890")).toBe(123456789012345678n);
    });

    it("should pad insufficient decimals", () => {
      expect(parseTokenAmount("1.1")).toBe(1100000000000000000n);
    });
  });

  describe("roundtrip", () => {
    it("should roundtrip whole numbers", () => {
      const original = 100n * 1000000000000000000n;
      const formatted = formatTokenAmount(original);
      const parsed = parseTokenAmount(formatted.replace(/,/g, ""));
      expect(parsed).toBe(original);
    });

    it("should roundtrip decimal numbers", () => {
      const original = 1500000000000000000n;
      const formatted = formatTokenAmount(original, { maxDecimals: 4 });
      const parsed = parseTokenAmount(formatted);
      expect(parsed).toBe(original);
    });
  });
});
