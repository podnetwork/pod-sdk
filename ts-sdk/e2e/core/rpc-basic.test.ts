/**
 * @module e2e/core/rpc-basic
 * @description E2E tests for basic RPC methods
 */

import { it, expect, beforeAll } from "vitest";
import { PodClient, formatPod } from "@podnetwork/core";
import { LOCAL_CHAIN_ID, TEST_ADDRESS, ONE_POD } from "../fixtures/constants.js";
import { createRandomWallet } from "../setup/test-context.js";
import { describeE2E } from "../setup/describe-e2e.js";

describeE2E("RPC Basic Methods", () => {
  let client: PodClient;

  beforeAll(() => {
    client = PodClient.local();
  });

  describe("eth_chainId", () => {
    it("should return the local chain ID", async () => {
      const chainId = await client.rpc.getChainId();
      expect(chainId).toBe(LOCAL_CHAIN_ID);
    });
  });

  describe("eth_gasPrice", () => {
    it("should return a positive gas price", async () => {
      const gasPrice = await client.rpc.getGasPrice();
      expect(gasPrice).toBeGreaterThan(0n);
    });

    it("should return a reasonable gas price (under 1000 Gwei)", async () => {
      const gasPrice = await client.rpc.getGasPrice();
      const maxGasPrice = 1000n * 10n ** 9n; // 1000 Gwei
      expect(gasPrice).toBeLessThan(maxGasPrice);
    });
  });

  describe("eth_getBalance", () => {
    it("should return balance for test account", async () => {
      const balance = await client.rpc.getBalance(TEST_ADDRESS);
      // Test account may or may not be funded on local server
      expect(typeof balance).toBe("bigint");
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- formatPod returns string
      console.log(`[e2e] Test account balance: ${formatPod(balance)} POD`);
    });

    it("should return zero for new random account", async () => {
      const randomWallet = createRandomWallet();
      const balance = await client.rpc.getBalance(randomWallet.address);
      expect(balance).toBe(0n);
    });

    it("should support 'latest' block parameter", async () => {
      const balance = await client.rpc.getBalance(TEST_ADDRESS, "latest");
      expect(typeof balance).toBe("bigint");
    });

    it("should support 'pending' block parameter", async () => {
      const balance = await client.rpc.getBalance(TEST_ADDRESS, "pending");
      expect(typeof balance).toBe("bigint");
    });
  });

  describe("eth_getTransactionCount", () => {
    it("should return nonce for test account", async () => {
      const nonce = await client.rpc.getTransactionCount(TEST_ADDRESS);
      expect(typeof nonce).toBe("bigint");
      expect(nonce).toBeGreaterThanOrEqual(0n);
    });

    it("should return zero for new random account", async () => {
      const randomWallet = createRandomWallet();
      const nonce = await client.rpc.getTransactionCount(randomWallet.address);
      expect(nonce).toBe(0n);
    });

    it("should support 'pending' block parameter", async () => {
      const nonce = await client.rpc.getTransactionCount(TEST_ADDRESS, "pending");
      expect(typeof nonce).toBe("bigint");
    });
  });

  describe("eth_estimateGas", () => {
    it("should estimate gas for simple transfer", async () => {
      const randomRecipient = createRandomWallet();
      const gas = await client.rpc.estimateGas({
        from: TEST_ADDRESS,
        to: randomRecipient.address,
        value: ONE_POD,
      });
      // pod may use different gas costs than Ethereum
      expect(gas).toBeGreaterThan(0n);
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- bigint display
      console.log(`[e2e] Gas estimate for transfer: ${gas}`);
    });

    it("should estimate gas without 'from' address", async () => {
      const randomRecipient = createRandomWallet();
      const gas = await client.rpc.estimateGas({
        to: randomRecipient.address,
        value: ONE_POD,
      });
      expect(gas).toBeGreaterThan(0n);
    });
  });

  describe("eth_call", () => {
    it("should execute a simple call", async () => {
      const result = await client.rpc.call({
        to: TEST_ADDRESS,
        data: "0x",
      });
      // Empty call to EOA returns empty data
      expect(result).toBe("0x");
    });
  });
});
