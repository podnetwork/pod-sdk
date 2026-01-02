/**
 * @module tests/block
 * @description Unit tests for Block schema and types
 */

import { describe, it, expect } from "vitest";
import { BlockSchema, BlockOrNullSchema } from "../schemas/block.js";
import type { Block, BlockTransaction } from "../schemas/block.js";

describe("BlockSchema", () => {
  describe("valid block with transaction hashes", () => {
    it("should parse block with transaction hashes", () => {
      // Arrange
      const input = {
        number: "0x10",
        hash: "0x" + "ab".repeat(32),
        parentHash: "0x" + "cd".repeat(32),
        timestamp: "0x60000000",
        transactions: ["0x" + "11".repeat(32), "0x" + "22".repeat(32)],
        gasLimit: "0x1000000",
        gasUsed: "0x500000",
        miner: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        baseFeePerGas: "0x3b9aca00",
        extraData: "0x1234",
      };

      // Act
      const result = BlockSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        const block: Block = result.data;
        expect(block.number).toBe(16n);
        expect(block.hash).toBe("0x" + "ab".repeat(32));
        expect(block.parentHash).toBe("0x" + "cd".repeat(32));
        expect(block.timestamp).toBe(0x60000000n);
        expect(block.transactions).toHaveLength(2);
        expect(block.gasLimit).toBe(0x1000000n);
        expect(block.gasUsed).toBe(0x500000n);
        expect(block.miner).toBe("0x742d35Cc6634C0532925a3b844Bc454e4438f44e");
        expect(block.baseFeePerGas).toBe(1000000000n);
        expect(block.extraData).toBe("0x1234");
      }
    });

    it("should parse block without optional fields", () => {
      // Arrange
      const input = {
        number: "0x0",
        hash: "0x" + "00".repeat(32),
        parentHash: "0x" + "00".repeat(32),
        timestamp: "0x0",
        transactions: [],
        gasLimit: "0x0",
        gasUsed: "0x0",
      };

      // Act
      const result = BlockSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        const block: Block = result.data;
        expect(block.number).toBe(0n);
        expect(block.miner).toBeUndefined();
        expect(block.baseFeePerGas).toBeUndefined();
        expect(block.extraData).toBeUndefined();
      }
    });
  });

  describe("valid block with full transactions", () => {
    it("should parse block with full transaction objects", () => {
      // Arrange
      const input = {
        number: "0x10",
        hash: "0x" + "ab".repeat(32),
        parentHash: "0x" + "cd".repeat(32),
        timestamp: "0x60000000",
        transactions: [
          {
            hash: "0x" + "11".repeat(32),
            from: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
            to: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
            value: "0xde0b6b3a7640000", // 1 POD
            input: "0x",
            nonce: "0x1",
            gas: "0x5208",
            gasPrice: "0x3b9aca00",
          },
        ],
        gasLimit: "0x1000000",
        gasUsed: "0x5208",
      };

      // Act
      const result = BlockSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        const block: Block = result.data;
        expect(block.transactions).toHaveLength(1);
        const tx = block.transactions[0] as BlockTransaction;
        expect(tx.hash).toBe("0x" + "11".repeat(32));
        expect(tx.from).toBe("0x742d35Cc6634C0532925a3b844Bc454e4438f44e");
        expect(tx.to).toBe("0x8ba1f109551bD432803012645Ac136ddd64DBA72");
        expect(tx.value).toBe(1000000000000000000n);
        expect(tx.nonce).toBe(1n);
        expect(tx.gas).toBe(21000n);
        expect(tx.gasPrice).toBe(1000000000n);
      }
    });

    it("should parse transaction with null to field (contract creation)", () => {
      // Arrange
      const input = {
        number: "0x10",
        hash: "0x" + "ab".repeat(32),
        parentHash: "0x" + "cd".repeat(32),
        timestamp: "0x60000000",
        transactions: [
          {
            hash: "0x" + "11".repeat(32),
            from: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
            to: null,
            value: "0x0",
            input: "0x608060405234801561001057600080fd5b50",
            nonce: "0x0",
            gas: "0x100000",
          },
        ],
        gasLimit: "0x1000000",
        gasUsed: "0x50000",
      };

      // Act
      const result = BlockSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        const tx = result.data.transactions[0] as BlockTransaction;
        expect(tx.to).toBeUndefined();
        expect(tx.input).toContain("0x6080");
      }
    });
  });

  describe("bigint field parsing", () => {
    it("should parse hex strings as bigint", () => {
      // Arrange
      const input = {
        number: "0xff",
        hash: "0x" + "ab".repeat(32),
        parentHash: "0x" + "cd".repeat(32),
        timestamp: "0xffffffff",
        transactions: [],
        gasLimit: "0x7a1200",
        gasUsed: "0x5208",
      };

      // Act
      const result = BlockSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.number).toBe(255n);
        expect(result.data.timestamp).toBe(4294967295n);
        expect(result.data.gasLimit).toBe(8000000n);
        expect(result.data.gasUsed).toBe(21000n);
      }
    });

    it("should handle bigint values directly", () => {
      // Arrange
      const input = {
        number: 100n,
        hash: "0x" + "ab".repeat(32),
        parentHash: "0x" + "cd".repeat(32),
        timestamp: 1000000n,
        transactions: [],
        gasLimit: 8000000n,
        gasUsed: 21000n,
      };

      // Act
      const result = BlockSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.number).toBe(100n);
        expect(result.data.timestamp).toBe(1000000n);
      }
    });

    it("should handle null baseFeePerGas", () => {
      // Arrange
      const input = {
        number: "0x10",
        hash: "0x" + "ab".repeat(32),
        parentHash: "0x" + "cd".repeat(32),
        timestamp: "0x60000000",
        transactions: [],
        gasLimit: "0x1000000",
        gasUsed: "0x0",
        baseFeePerGas: null,
      };

      // Act
      const result = BlockSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.baseFeePerGas).toBeUndefined();
      }
    });
  });

  describe("invalid blocks", () => {
    it("should reject block with invalid hash", () => {
      // Arrange
      const input = {
        number: "0x10",
        hash: "invalid-hash",
        parentHash: "0x" + "cd".repeat(32),
        timestamp: "0x60000000",
        transactions: [],
        gasLimit: "0x1000000",
        gasUsed: "0x0",
      };

      // Act
      const result = BlockSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject block with invalid address", () => {
      // Arrange
      const input = {
        number: "0x10",
        hash: "0x" + "ab".repeat(32),
        parentHash: "0x" + "cd".repeat(32),
        timestamp: "0x60000000",
        transactions: [],
        gasLimit: "0x1000000",
        gasUsed: "0x0",
        miner: "not-an-address",
      };

      // Act
      const result = BlockSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject block missing required fields", () => {
      // Arrange
      const input = {
        number: "0x10",
        hash: "0x" + "ab".repeat(32),
        // missing parentHash, timestamp, transactions, gasLimit, gasUsed
      };

      // Act
      const result = BlockSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});

describe("BlockOrNullSchema", () => {
  it("should parse valid block", () => {
    // Arrange
    const input = {
      number: "0x10",
      hash: "0x" + "ab".repeat(32),
      parentHash: "0x" + "cd".repeat(32),
      timestamp: "0x60000000",
      transactions: [],
      gasLimit: "0x1000000",
      gasUsed: "0x0",
    };

    // Act
    const result = BlockOrNullSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toBeNull();
      expect(result.data?.number).toBe(16n);
    }
  });

  it("should parse null for block not found", () => {
    // Arrange
    const input = null;

    // Act
    const result = BlockOrNullSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });
});
