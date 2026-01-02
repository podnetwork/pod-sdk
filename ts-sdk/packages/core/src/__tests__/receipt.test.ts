/**
 * @module tests/receipt
 * @description Unit tests for TransactionReceipt schema and types
 */

import { describe, it, expect } from "vitest";
import {
  TransactionReceiptSchema,
  TransactionReceiptOrNullSchema,
  TransactionReceiptHelper,
} from "../schemas/receipt.js";
import type { TransactionReceipt } from "../schemas/receipt.js";

// Helper to create valid receipt data matching actual node response format
function createValidReceiptData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    transactionHash: "0x" + "ab".repeat(32),
    blockNumber: "0x10",
    blockHash: "0x" + "cd".repeat(32),
    from: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    to: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    gasUsed: "0x5208",
    cumulativeGasUsed: "0x5208",
    status: "0x1",
    contractAddress: null,
    logs: [],
    effectiveGasPrice: "0x3b9aca00",
    transactionIndex: "0x0",
    // pod-specific fields at top level (matching actual node response)
    attested_tx: {
      hash: "0x" + "ab".repeat(32),
      committee_epoch: 0,
    },
    signatures: {
      "0": "3045022100f0918df4d22fbfb1bdbd5ff6bf868d010c250714f3764369f2edbff8fea6f43f022065a781054e85abfce957a521810b038130f89ea32743336bd7099af80bf1080b",
      "1": "304502210089abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567022098765432109876543210987654321098765432109876543210987654321098765432",
    },
    ...overrides,
  };
}

describe("TransactionReceiptSchema", () => {
  describe("valid receipts", () => {
    it("should parse successful receipt", () => {
      // Arrange
      const input = createValidReceiptData();

      // Act
      const result = TransactionReceiptSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        const receipt: TransactionReceipt = result.data;
        expect(receipt.transactionHash).toBe("0x" + "ab".repeat(32));
        expect(receipt.blockNumber).toBe(16n);
        expect(receipt.from).toBe("0x742d35Cc6634C0532925a3b844Bc454e4438f44e");
        expect(receipt.to).toBe("0x8ba1f109551bD432803012645Ac136ddd64DBA72");
        expect(receipt.gasUsed).toBe(21000n);
        expect(receipt.status).toBe(true);
        expect(receipt.logs).toHaveLength(0);
        expect(receipt.effectiveGasPrice).toBe(1000000000n);
      }
    });

    it("should parse failed/reverted receipt", () => {
      // Arrange
      const input = createValidReceiptData({ status: "0x0" });

      // Act
      const result = TransactionReceiptSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(false);
      }
    });

    it("should parse contract creation receipt", () => {
      // Arrange
      const input = createValidReceiptData({
        to: null,
        contractAddress: "0x9999999999999999999999999999999999999999",
      });

      // Act
      const result = TransactionReceiptSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.to).toBeUndefined();
        expect(result.data.contractAddress).toBe("0x9999999999999999999999999999999999999999");
      }
    });

    it("should parse receipt with logs", () => {
      // Arrange
      const input = createValidReceiptData({
        logs: [
          {
            address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
            topics: ["0x" + "ee".repeat(32), "0x" + "ff".repeat(32)],
            data: "0x1234567890abcdef",
            blockNumber: "0x10",
            blockHash: "0x" + "cd".repeat(32),
            transactionHash: "0x" + "ab".repeat(32),
            logIndex: "0x0",
            transactionIndex: "0x0",
            removed: false,
          },
        ],
      });

      // Act
      const result = TransactionReceiptSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.logs).toHaveLength(1);
        expect(result.data.logs[0].address).toBe("0x742d35Cc6634C0532925a3b844Bc454e4438f44e");
        expect(result.data.logs[0].topics).toHaveLength(2);
        expect(result.data.logs[0].data).toBe("0x1234567890abcdef");
      }
    });
  });

  describe("pod metadata", () => {
    it("should parse attestation data correctly", () => {
      // Arrange
      const input = createValidReceiptData();

      // Act
      const result = TransactionReceiptSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        const meta = result.data.podMetadata;
        expect(meta.attestedTx.txHash).toBe("0x" + "ab".repeat(32));
        expect(meta.attestedTx.committeeEpoch).toBe(0);
        expect(meta.signatureCount).toBe(2);
        expect(Object.keys(meta.signatures)).toHaveLength(2);
      }
    });

    it("should parse receipt with single signature", () => {
      // Arrange
      const input = createValidReceiptData({
        signatures: {
          "0": "3045022100f0918df4d22fbfb1bdbd5ff6bf868d010c250714f3764369f2edbff8fea6f43f022065a781054e85abfce957a521810b038130f89ea32743336bd7099af80bf1080b",
        },
      });

      // Act
      const result = TransactionReceiptSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.podMetadata.signatureCount).toBe(1);
      }
    });

    it("should parse receipt with empty signatures", () => {
      // Arrange
      const input = createValidReceiptData({
        signatures: {},
      });

      // Act
      const result = TransactionReceiptSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.podMetadata.signatureCount).toBe(0);
      }
    });
  });

  describe("bigint field parsing", () => {
    it("should handle null blockNumber", () => {
      // Arrange
      const input = createValidReceiptData({ blockNumber: null });

      // Act
      const result = TransactionReceiptSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.blockNumber).toBeUndefined();
      }
    });

    it("should parse large hex values", () => {
      // Arrange
      const input = createValidReceiptData({
        gasUsed: "0xffffffffff",
        cumulativeGasUsed: "0xffffffffffff",
        effectiveGasPrice: "0x174876e800", // 100 Gwei
      });

      // Act
      const result = TransactionReceiptSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gasUsed).toBe(0xffffffffffn);
        expect(result.data.cumulativeGasUsed).toBe(0xffffffffffffn);
        expect(result.data.effectiveGasPrice).toBe(100000000000n);
      }
    });
  });

  describe("invalid receipts", () => {
    it("should reject receipt with invalid transactionHash", () => {
      // Arrange
      const input = createValidReceiptData({ transactionHash: "invalid" });

      // Act
      const result = TransactionReceiptSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject receipt with invalid from address", () => {
      // Arrange
      const input = createValidReceiptData({ from: "not-an-address" });

      // Act
      const result = TransactionReceiptSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject receipt missing required fields", () => {
      // Arrange
      const input = {
        transactionHash: "0x" + "ab".repeat(32),
        // missing most fields
      };

      // Act
      const result = TransactionReceiptSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should handle various status formats", () => {
      // Status "0x2" is treated as false (not 0x1)
      const input = createValidReceiptData({ status: "0x2" });

      // Act
      const result = TransactionReceiptSchema.safeParse(input);

      // Assert - schema accepts any string/number/boolean, transforms to boolean
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(false); // "0x2" is not "0x1" so false
      }
    });
  });
});

describe("TransactionReceiptOrNullSchema", () => {
  it("should parse valid receipt", () => {
    // Arrange
    const input = createValidReceiptData();

    // Act
    const result = TransactionReceiptOrNullSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toBeNull();
    }
  });

  it("should parse null for receipt not found", () => {
    // Arrange
    const input = null;

    // Act
    const result = TransactionReceiptOrNullSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });
});

describe("TransactionReceiptHelper", () => {
  it("should report successful transaction", () => {
    // Arrange
    const receiptResult = TransactionReceiptSchema.safeParse(createValidReceiptData());
    expect(receiptResult.success).toBe(true);
    if (!receiptResult.success) return;

    const helper = new TransactionReceiptHelper(receiptResult.data);

    // Act & Assert
    expect(helper.succeeded()).toBe(true);
    expect(helper.failed()).toBe(false);
  });

  it("should report reverted transaction", () => {
    // Arrange
    const receiptResult = TransactionReceiptSchema.safeParse(
      createValidReceiptData({ status: "0x0" })
    );
    expect(receiptResult.success).toBe(true);
    if (!receiptResult.success) return;

    const helper = new TransactionReceiptHelper(receiptResult.data);

    // Act & Assert
    expect(helper.succeeded()).toBe(false);
    expect(helper.failed()).toBe(true);
  });

  it("should report attestation status", () => {
    // Arrange
    const receiptResult = TransactionReceiptSchema.safeParse(createValidReceiptData());
    expect(receiptResult.success).toBe(true);
    if (!receiptResult.success) return;

    const helper = new TransactionReceiptHelper(receiptResult.data);

    // Act & Assert
    expect(helper.hasAttestations()).toBe(true);
    expect(helper.signatureCount()).toBe(2);
    expect(helper.committeeEpoch()).toBe(0);
  });

  it("should identify contract deployment", () => {
    // Arrange
    const receiptResult = TransactionReceiptSchema.safeParse(
      createValidReceiptData({
        to: null,
        contractAddress: "0x9999999999999999999999999999999999999999",
      })
    );
    expect(receiptResult.success).toBe(true);
    if (!receiptResult.success) return;

    const helper = new TransactionReceiptHelper(receiptResult.data);

    // Act & Assert
    expect(helper.isDeployment()).toBe(true);
    expect(helper.data.contractAddress).toBe("0x9999999999999999999999999999999999999999");
  });

  it("should calculate total cost", () => {
    // Arrange
    const receiptResult = TransactionReceiptSchema.safeParse(
      createValidReceiptData({
        gasUsed: "0x5208", // 21000
        effectiveGasPrice: "0x3b9aca00", // 1 Gwei
      })
    );
    expect(receiptResult.success).toBe(true);
    if (!receiptResult.success) return;

    const helper = new TransactionReceiptHelper(receiptResult.data);

    // Act
    const cost = helper.totalCost();

    // Assert
    expect(cost).toBe(21000n * 1000000000n); // 21000 gas * 1 Gwei
  });

  it("should provide access to underlying receipt via data getter", () => {
    // Arrange
    const receiptResult = TransactionReceiptSchema.safeParse(createValidReceiptData());
    expect(receiptResult.success).toBe(true);
    if (!receiptResult.success) return;

    const helper = new TransactionReceiptHelper(receiptResult.data);

    // Act & Assert
    expect(helper.data).toBe(receiptResult.data);
    expect(helper.data.transactionHash).toBe("0x" + "ab".repeat(32));
  });

  it("should report no attestations for empty signatures", () => {
    // Arrange
    const receiptResult = TransactionReceiptSchema.safeParse(
      createValidReceiptData({ signatures: {} })
    );
    expect(receiptResult.success).toBe(true);
    if (!receiptResult.success) return;

    const helper = new TransactionReceiptHelper(receiptResult.data);

    // Act & Assert
    expect(helper.hasAttestations()).toBe(false);
    expect(helper.signatureCount()).toBe(0);
  });
});
