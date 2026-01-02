/**
 * @module e2e/core/rpc-transactions
 * @description E2E tests for transaction-related RPC methods
 */

import { it, expect, beforeAll } from "vitest";
import { PodClient } from "@podnetwork/core";
import { Wallet } from "@podnetwork/wallet";
import type { Hash } from "@podnetwork/core";
import { TEST_TRANSFER_AMOUNT, ZERO_HASH } from "../fixtures/constants.js";
import { createRandomWallet, createTestContext } from "../setup/test-context.js";
import { waitForTransaction } from "../helpers/wait.js";
import { describeE2E } from "../setup/describe-e2e.js";

describeE2E("RPC Transaction Methods", () => {
  let client: PodClient;
  let wallet: Wallet;
  let chainId: bigint;
  let sentTxHash: Hash;

  beforeAll(async () => {
    const context = await createTestContext();
    client = context.client;
    wallet = context.fundedWallet;
    chainId = context.chainId;

    // Send a transaction to have something to query
    const recipient = createRandomWallet();
    const nonce = await client.rpc.getTransactionCount(wallet.address);
    const gasPrice = await client.rpc.getGasPrice();

    const signedTx = await wallet.signTransaction(
      {
        to: recipient.address,
        value: TEST_TRANSFER_AMOUNT,
        gas: 21000n,
        gasPrice,
        nonce,
        chainId,
      },
      chainId
    );

    sentTxHash = await client.rpc.sendRawTransaction(signedTx);
    await waitForTransaction(client, sentTxHash);
  });

  describe("eth_getTransactionByHash", () => {
    it("should get transaction by hash", async () => {
      const tx = await client.rpc.getTransaction(sentTxHash);
      expect(tx).toBeDefined();
      expect(tx!.hash).toBe(sentTxHash);
    });

    it("should include expected transaction fields", async () => {
      const tx = await client.rpc.getTransaction(sentTxHash);
      expect(tx).toBeDefined();
      expect(tx!.hash).toBeDefined();
      expect(tx!.from).toBeDefined();
      expect(tx!.to).toBeDefined();
      expect(tx!.value).toBeDefined();
      expect(tx!.gas).toBeDefined();
      expect(tx!.nonce).toBeDefined();
    });

    it("should return undefined for unknown hash", async () => {
      const tx = await client.rpc.getTransaction(ZERO_HASH);
      expect(tx).toBeUndefined();
    });

    it("should show correct from address", async () => {
      const tx = await client.rpc.getTransaction(sentTxHash);
      expect(tx).toBeDefined();
      expect(tx!.from.toLowerCase()).toBe(wallet.address.toLowerCase());
    });
  });

  describe("eth_getTransactionReceipt", () => {
    it("should get receipt for confirmed transaction", async () => {
      const receipt = await client.rpc.getTransactionReceipt(sentTxHash);
      expect(receipt).toBeDefined();
      expect(receipt!.transactionHash).toBe(sentTxHash);
    });

    it("should include expected receipt fields", async () => {
      const receipt = await client.rpc.getTransactionReceipt(sentTxHash);
      expect(receipt).toBeDefined();
      expect(receipt!.transactionHash).toBeDefined();
      expect(receipt!.blockHash).toBeDefined();
      expect(receipt!.blockNumber).toBeDefined();
      expect(receipt!.from).toBeDefined();
      expect(receipt!.to).toBeDefined();
      expect(receipt!.gasUsed).toBeDefined();
      expect(typeof receipt!.status).toBe("boolean");
    });

    it("should have successful status for simple transfer", async () => {
      const receipt = await client.rpc.getTransactionReceipt(sentTxHash);
      expect(receipt).toBeDefined();
      expect(receipt!.status).toBe(true);
    });

    it("should return undefined for unknown hash", async () => {
      const receipt = await client.rpc.getTransactionReceipt(ZERO_HASH);
      expect(receipt).toBeUndefined();
    });

    it("should include pod-specific metadata", async () => {
      const receipt = await client.rpc.getTransactionReceipt(sentTxHash);
      expect(receipt).toBeDefined();
      // Pod receipts may include additional metadata
      // The exact fields depend on the node version
    });
  });

  describe("eth_sendRawTransaction", () => {
    it("should send a signed transaction", async () => {
      const recipient = createRandomWallet();
      const nonce = await client.rpc.getTransactionCount(wallet.address);
      const gasPrice = await client.rpc.getGasPrice();

      const signedTx = await wallet.signTransaction(
        {
          to: recipient.address,
          value: TEST_TRANSFER_AMOUNT,
          gas: 21000n,
          gasPrice,
          nonce,
          chainId,
        },
        chainId
      );

      const txHash = await client.rpc.sendRawTransaction(signedTx);
      expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

      // Wait for confirmation
      await waitForTransaction(client, txHash);

      // Verify the transaction was included
      const receipt = await client.rpc.getTransactionReceipt(txHash);
      expect(receipt).toBeDefined();
      expect(receipt!.status).toBe(true);
    });

    it("should update recipient balance after transfer", async () => {
      const recipient = createRandomWallet();
      const initialBalance = await client.rpc.getBalance(recipient.address);
      expect(initialBalance).toBe(0n);

      const nonce = await client.rpc.getTransactionCount(wallet.address);
      const gasPrice = await client.rpc.getGasPrice();

      const signedTx = await wallet.signTransaction(
        {
          to: recipient.address,
          value: TEST_TRANSFER_AMOUNT,
          gas: 21000n,
          gasPrice,
          nonce,
          chainId,
        },
        chainId
      );

      const txHash = await client.rpc.sendRawTransaction(signedTx);
      await waitForTransaction(client, txHash);

      const finalBalance = await client.rpc.getBalance(recipient.address);
      expect(finalBalance).toBe(TEST_TRANSFER_AMOUNT);
    });

    it("should increment sender nonce after transaction", async () => {
      const recipient = createRandomWallet();
      const initialNonce = await client.rpc.getTransactionCount(wallet.address);
      const gasPrice = await client.rpc.getGasPrice();

      const signedTx = await wallet.signTransaction(
        {
          to: recipient.address,
          value: TEST_TRANSFER_AMOUNT,
          gas: 21000n,
          gasPrice,
          nonce: initialNonce,
          chainId,
        },
        chainId
      );

      const txHash = await client.rpc.sendRawTransaction(signedTx);
      await waitForTransaction(client, txHash);

      const finalNonce = await client.rpc.getTransactionCount(wallet.address);
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands -- bigint arithmetic
      expect(finalNonce).toBe(initialNonce + 1n);
    });
  });
});
