/**
 * @module e2e/tx/send-transfer
 * @description E2E tests for transaction sending and confirmation flow
 */

import { it, expect, beforeAll } from "vitest";
import { TEST_TRANSFER_AMOUNT } from "../fixtures/constants.js";
import { createTestContext, createRandomWallet } from "../setup/test-context.js";
import type { E2ETestContext } from "../setup/test-context.js";
import { describeE2E } from "../setup/describe-e2e.js";

describeE2E("Send Transfer", () => {
  let context: E2ETestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  describe("simple POD transfer", () => {
    it("should send a simple POD transfer", async () => {
      const recipient = createRandomWallet();
      const amount = TEST_TRANSFER_AMOUNT;

      const pending = await context.client.tx.sendTransaction(
        {
          to: recipient.address,
          value: amount,
        },
        context.fundedWallet
      );

      expect(pending.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

      const receipt = await pending.waitForReceipt();
      expect(receipt.status).toBe(true);
      expect(receipt.to?.toLowerCase()).toBe(recipient.address.toLowerCase());

      // Verify balance changed
      const newBalance = await context.client.rpc.getBalance(recipient.address);
      expect(newBalance).toBe(amount);
    });

    it("should auto-estimate gas when not provided", async () => {
      const recipient = createRandomWallet();

      const pending = await context.client.tx.sendTransaction(
        {
          to: recipient.address,
          value: TEST_TRANSFER_AMOUNT,
        },
        context.fundedWallet
      );

      const receipt = await pending.waitForReceipt();
      expect(receipt.status).toBe(true);
      // Gas should be at least 21000 for simple transfer
      expect(receipt.gasUsed).toBeGreaterThanOrEqual(21000n);
    });

    it("should use provided gas value", async () => {
      const recipient = createRandomWallet();
      const providedGas = 50000n;

      const pending = await context.client.tx.sendTransaction(
        {
          to: recipient.address,
          value: TEST_TRANSFER_AMOUNT,
          gas: providedGas,
        },
        context.fundedWallet
      );

      const receipt = await pending.waitForReceipt();
      expect(receipt.status).toBe(true);
    });
  });

  describe("waitForReceipt", () => {
    it("should return receipt with pod metadata", async () => {
      const recipient = createRandomWallet();

      const pending = await context.client.tx.sendTransaction(
        {
          to: recipient.address,
          value: TEST_TRANSFER_AMOUNT,
        },
        context.fundedWallet
      );

      const receipt = await pending.waitForReceipt();
      expect(receipt).toBeDefined();
      expect(receipt.transactionHash).toBe(pending.txHash);
      expect(receipt.blockNumber).toBeGreaterThan(0n);
    });

    it("should include gas information", async () => {
      const recipient = createRandomWallet();

      const pending = await context.client.tx.sendTransaction(
        {
          to: recipient.address,
          value: TEST_TRANSFER_AMOUNT,
        },
        context.fundedWallet
      );

      const receipt = await pending.waitForReceipt();
      expect(receipt.gasUsed).toBeGreaterThan(0n);
    });
  });

  describe("multiple sequential transactions", () => {
    it("should handle multiple sequential transactions", async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- test helper type inference
      const recipients = Array.from({ length: 3 }, () => createRandomWallet());

      for (const recipient of recipients) {
        const pending = await context.client.tx.sendTransaction(
          {
            to: recipient.address,
            value: TEST_TRANSFER_AMOUNT,
          },
          context.fundedWallet
        );

        const receipt = await pending.waitForReceipt();
        expect(receipt.status).toBe(true);

        const balance = await context.client.rpc.getBalance(recipient.address);
        expect(balance).toBe(TEST_TRANSFER_AMOUNT);
      }
    });

    it("should increment nonce automatically", async () => {
      const initialNonce = await context.client.rpc.getTransactionCount(
        context.fundedWallet.address
      );

      const recipient1 = createRandomWallet();
      const pending1 = await context.client.tx.sendTransaction(
        { to: recipient1.address, value: TEST_TRANSFER_AMOUNT },
        context.fundedWallet
      );
      await pending1.waitForReceipt();

      const recipient2 = createRandomWallet();
      const pending2 = await context.client.tx.sendTransaction(
        { to: recipient2.address, value: TEST_TRANSFER_AMOUNT },
        context.fundedWallet
      );
      await pending2.waitForReceipt();

      const finalNonce = await context.client.rpc.getTransactionCount(context.fundedWallet.address);
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands -- bigint arithmetic
      expect(finalNonce).toBe(initialNonce + 2n);
    });
  });

  describe("transaction with specific nonce", () => {
    it("should use provided nonce", async () => {
      const recipient = createRandomWallet();
      const currentNonce = await context.client.rpc.getTransactionCount(
        context.fundedWallet.address
      );

      const pending = await context.client.tx.sendTransaction(
        {
          to: recipient.address,
          value: TEST_TRANSFER_AMOUNT,
          nonce: currentNonce,
        },
        context.fundedWallet
      );

      const receipt = await pending.waitForReceipt();
      expect(receipt.status).toBe(true);
    });
  });

  describe("balance changes", () => {
    it("should deduct correct amount from sender", async () => {
      const recipient = createRandomWallet();
      const initialBalance = await context.client.rpc.getBalance(context.fundedWallet.address);

      const pending = await context.client.tx.sendTransaction(
        {
          to: recipient.address,
          value: TEST_TRANSFER_AMOUNT,
        },
        context.fundedWallet
      );

      const receipt = await pending.waitForReceipt();
      const finalBalance = await context.client.rpc.getBalance(context.fundedWallet.address);

      // Balance should decrease by transfer amount + gas fees
      const gasUsed = receipt.gasUsed;
      const gasPrice = receipt.effectiveGasPrice ?? 0n;
      const gasCost = gasUsed * gasPrice;
      const expectedBalance = initialBalance - TEST_TRANSFER_AMOUNT - gasCost;

      expect(finalBalance).toBe(expectedBalance);
    });
  });
});
