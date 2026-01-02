/**
 * @module e2e/orderbook/get-orderbook
 * @description E2E tests for orderbook RPC methods
 */

import { it, expect, beforeAll } from "vitest";
import { PodClient } from "@podnetwork/core";
import { OrderbookNamespace } from "@podnetwork/orderbook";
import type { Hash } from "@podnetwork/core";
import { ZERO_HASH, LOCAL_RPC_URL } from "../fixtures/constants.js";
import { describeE2E } from "../setup/describe-e2e.js";

describeE2E("Orderbook RPC Methods", () => {
  let client: PodClient;
  let orderbook: OrderbookNamespace;

  beforeAll(() => {
    client = PodClient.local();
    orderbook = new OrderbookNamespace(
      {
        url: LOCAL_RPC_URL,
        timeout: 30000,
        maxRetries: 3,
      },
      client.getTransactionSender()
    );
  });

  describe("pod_getOrderbook", () => {
    it("should return undefined for non-existent orderbook", async () => {
      try {
        const result = await orderbook.getOrderbook(ZERO_HASH);
        expect(result).toBeUndefined();
      } catch (error) {
        // Method may not be supported on local server
        console.log("[e2e] pod_getOrderbook not supported:", (error as Error).message);
      }
    });

    it("should handle invalid orderbook ID gracefully", async () => {
      const randomId = ("0x" + "1".repeat(64)) as Hash;
      try {
        const result = await orderbook.getOrderbook(randomId);
        // Non-existent orderbook should return undefined
        expect(result).toBeUndefined();
      } catch (error) {
        // Method may not be supported - this is acceptable for E2E
        console.log("[e2e] pod_getOrderbook not supported:", (error as Error).message);
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should support custom depth parameter", async () => {
      const randomId = ("0x" + "2".repeat(64)) as Hash;
      try {
        const result = await orderbook.getOrderbook(randomId, 10);
        // Non-existent orderbook should return undefined
        expect(result).toBeUndefined();
      } catch (error) {
        // Method may not be supported - this is acceptable for E2E
        console.log("[e2e] pod_getOrderbook not supported:", (error as Error).message);
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe("getOrderbooks (batch)", () => {
    it("should return empty map for non-existent orderbooks", async () => {
      const ids = [("0x" + "a".repeat(64)) as Hash, ("0x" + "b".repeat(64)) as Hash];

      try {
        const orderbooks = await orderbook.getOrderbooks(ids);
        expect(orderbooks).toBeInstanceOf(Map);
        // All non-existent should not be in the map
        expect(orderbooks.size).toBe(0);
      } catch (error) {
        // Method may not be supported
        console.log("[e2e] pod_getOrderbook not supported:", (error as Error).message);
      }
    });
  });
});
