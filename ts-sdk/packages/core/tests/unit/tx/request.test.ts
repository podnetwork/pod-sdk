// Unit tests for TransactionRequest validation

import { describe, it, expect } from "vitest";
import { TransactionRequestSchema } from "../../../src/schemas/transaction.js";
import type { Address } from "../../../src/types/address.js";

// Sample addresses
const VALID_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" as Address;

describe("TransactionRequestSchema", () => {
  describe("valid requests", () => {
    it("should accept minimal transfer request", () => {
      const request = {
        to: VALID_ADDRESS,
        value: 1000000000000000000n, // 1 ETH in wei
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.to).toBe(VALID_ADDRESS);
        expect(result.data.value).toBe(1000000000000000000n);
      }
    });

    it("should accept request with all optional fields", () => {
      const request = {
        to: VALID_ADDRESS,
        value: 1000000000000000000n,
        data: "0xabcdef",
        gas: 21000n,
        maxFeePerGas: 1000000000n,
        maxPriorityFeePerGas: 500000000n,
        nonce: 5n,
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.to).toBe(VALID_ADDRESS);
        expect(result.data.value).toBe(1000000000000000000n);
        expect(result.data.data).toBe("0xabcdef");
        expect(result.data.gas).toBe(21000n);
        expect(result.data.maxFeePerGas).toBe(1000000000n);
        expect(result.data.maxPriorityFeePerGas).toBe(500000000n);
        expect(result.data.nonce).toBe(5n);
      }
    });

    it("should accept EIP-1559 request", () => {
      const request = {
        to: VALID_ADDRESS,
        value: 0n,
        maxFeePerGas: 2000000000n,
        maxPriorityFeePerGas: 1000000000n,
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxFeePerGas).toBe(2000000000n);
        expect(result.data.maxPriorityFeePerGas).toBe(1000000000n);
      }
    });

    it("should accept contract creation request (no to address)", () => {
      const request = {
        data: "0x6080604052", // Contract bytecode (valid even hex)
        value: 0n,
        gas: 1000000n,
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.to).toBeUndefined();
        expect(result.data.data).toBe("0x6080604052");
      }
    });

    it("should accept empty request (all optional)", () => {
      const request = {};

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should accept zero value", () => {
      const request = {
        to: VALID_ADDRESS,
        value: 0n,
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.value).toBe(0n);
      }
    });

    it("should accept zero nonce", () => {
      const request = {
        to: VALID_ADDRESS,
        nonce: 0n,
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nonce).toBe(0n);
      }
    });
  });

  describe("invalid requests", () => {
    it("should reject invalid address", () => {
      const request = {
        to: "not-an-address",
        value: 1000000000000000000n,
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("should reject short address", () => {
      const request = {
        to: "0x742d35Cc6634C0532925a3b844Bc454e4438f44",
        value: 1000000000000000000n,
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("should reject negative value", () => {
      const request = {
        to: VALID_ADDRESS,
        value: -1000000000000000000n,
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("should reject zero gas", () => {
      const request = {
        to: VALID_ADDRESS,
        gas: 0n,
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("should reject negative gas", () => {
      const request = {
        to: VALID_ADDRESS,
        gas: -21000n,
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("should reject zero maxFeePerGas", () => {
      const request = {
        to: VALID_ADDRESS,
        maxFeePerGas: 0n,
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("should reject negative nonce", () => {
      const request = {
        to: VALID_ADDRESS,
        nonce: -1n,
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("should reject invalid data format", () => {
      const request = {
        to: VALID_ADDRESS,
        data: "not-hex-data",
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("should reject data with odd hex length", () => {
      const request = {
        to: VALID_ADDRESS,
        data: "0xabc", // Odd length
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe("address normalization", () => {
    it("should accept lowercase address and normalize to checksum", () => {
      const request = {
        to: "0x742d35cc6634c0532925a3b844bc454e4438f44e",
        value: 0n,
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        // Should be normalized to checksum format
        expect(result.data.to).toBe(VALID_ADDRESS);
      }
    });

    it("should accept uppercase address and normalize to checksum", () => {
      const request = {
        to: "0x742D35CC6634C0532925A3B844BC454E4438F44E",
        value: 0n,
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        // Should be normalized to checksum format
        expect(result.data.to).toBe(VALID_ADDRESS);
      }
    });
  });

  describe("data format", () => {
    it("should accept empty data (0x)", () => {
      const request = {
        to: VALID_ADDRESS,
        data: "0x",
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data).toBe("0x");
      }
    });

    it("should accept lowercase hex data", () => {
      const request = {
        to: VALID_ADDRESS,
        data: "0xabcdef12",
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should normalize uppercase hex data to lowercase", () => {
      const request = {
        to: VALID_ADDRESS,
        data: "0xABCDEF12",
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data).toBe("0xabcdef12");
      }
    });
  });

  describe("type coercion", () => {
    it("should only accept bigint for numeric fields (not strings)", () => {
      // Schema expects bigint, not string
      const request = {
        to: VALID_ADDRESS,
        value: "1000000000000000000", // String, not bigint
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("should only accept bigint for gas (not number)", () => {
      const request = {
        to: VALID_ADDRESS,
        gas: 21000, // Number, not bigint
      };

      const result = TransactionRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });
});
