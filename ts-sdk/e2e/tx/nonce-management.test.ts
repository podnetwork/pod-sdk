/**
 * @module e2e/tx/nonce-management
 * @description E2E tests for nonce management
 */

import { it, expect, beforeAll } from "vitest";
import { TEST_TRANSFER_AMOUNT } from "../fixtures/constants.js";
import { createTestContext, createRandomWallet } from "../setup/test-context.js";
import type { E2ETestContext } from "../setup/test-context.js";
import { describeE2E } from "../setup/describe-e2e.js";

describeE2E("Nonce Management", () => {
  let context: E2ETestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  describe("automatic nonce handling", () => {
    it("should auto-fetch nonce when not provided", async () => {
      const recipient = createRandomWallet();
      const initialNonce = await context.client.rpc.getTransactionCount(
        context.fundedWallet.address
      );

      const pending = await context.client.tx.sendTransaction(
        {
          to: recipient.address,
          value: TEST_TRANSFER_AMOUNT,
        },
        context.fundedWallet
      );

      await pending.waitForReceipt();

      const tx = await context.client.rpc.getTransaction(pending.txHash);
      expect(tx).toBeDefined();
      expect(tx!.nonce).toBe(initialNonce);
    });

    it("should use pending nonce for queued transactions", async () => {
      const recipient1 = createRandomWallet();
      const recipient2 = createRandomWallet();

      // Send first transaction
      const pending1 = await context.client.tx.sendTransaction(
        { to: recipient1.address, value: TEST_TRANSFER_AMOUNT },
        context.fundedWallet
      );

      // Send second transaction immediately (before first confirms)
      const pending2 = await context.client.tx.sendTransaction(
        { to: recipient2.address, value: TEST_TRANSFER_AMOUNT },
        context.fundedWallet
      );

      // Wait for both
      await Promise.all([pending1.waitForReceipt(), pending2.waitForReceipt()]);

      // Both should succeed
      const receipt1 = await context.client.rpc.getTransactionReceipt(pending1.txHash);
      const receipt2 = await context.client.rpc.getTransactionReceipt(pending2.txHash);

      expect(receipt1!.status).toBe(true);
      expect(receipt2!.status).toBe(true);

      // Second transaction should have nonce = first + 1
      const tx1 = await context.client.rpc.getTransaction(pending1.txHash);
      const tx2 = await context.client.rpc.getTransaction(pending2.txHash);
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands -- bigint arithmetic
      expect(tx2!.nonce).toBe(tx1!.nonce + 1n);
    });
  });

  describe("explicit nonce", () => {
    it("should use explicitly provided nonce", async () => {
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

      await pending.waitForReceipt();

      const tx = await context.client.rpc.getTransaction(pending.txHash);
      expect(tx!.nonce).toBe(currentNonce);
    });
  });

  describe("nonce consistency", () => {
    it("should have consistent nonce before and after transaction", async () => {
      const recipient = createRandomWallet();
      const initialNonce = await context.client.rpc.getTransactionCount(
        context.fundedWallet.address
      );

      const pending = await context.client.tx.sendTransaction(
        { to: recipient.address, value: TEST_TRANSFER_AMOUNT },
        context.fundedWallet
      );

      await pending.waitForReceipt();

      const finalNonce = await context.client.rpc.getTransactionCount(context.fundedWallet.address);

      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands -- bigint arithmetic
      expect(finalNonce).toBe(initialNonce + 1n);
    });
  });
});
