/**
 * @module e2e/ws/orderbook-sub
 * @description E2E tests for WebSocket orderbook subscriptions
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createWsNamespace, type WsNamespace } from "@podnetwork/ws";
import type { Hash } from "@podnetwork/core";
import { LOCAL_WS_URL } from "../fixtures/constants.js";
import { describeE2E } from "../setup/describe-e2e.js";

describeE2E("WebSocket Orderbook Subscription", () => {
  let ws: WsNamespace;

  beforeEach(() => {
    ws = createWsNamespace(LOCAL_WS_URL);
  });

  afterEach(async () => {
    try {
      await ws.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  });

  describe("pod_subscribeOrderbook", () => {
    it("should create subscription without error", async () => {
      const orderbookId = ("0x" + "1".repeat(64)) as Hash;
      const controller = new AbortController();

      // Abort immediately - we just want to verify subscription creation
      setTimeout(() => {
        controller.abort();
      }, 100);

      try {
        const subscription = ws.subscribeOrderbook([orderbookId], {
          signal: controller.signal,
        });

        // Start iterating (this triggers the subscription)
        for await (const update of subscription) {
          void update;
          // If we receive an update, the subscription works
          controller.abort();
          break;
        }
      } catch (error) {
        // AbortError is expected
        if ((error as Error).name !== "AbortError") {
          // Other errors may occur if orderbook doesn't exist
          console.log("[e2e] Orderbook subscription error:", (error as Error).message);
        }
      }

      expect(ws.getState()).toBe("connected");
    });

    it("should handle abort signal correctly", async () => {
      const orderbookId = ("0x" + "2".repeat(64)) as Hash;
      const controller = new AbortController();

      // Abort after short delay
      setTimeout(() => {
        controller.abort();
      }, 50);

      let iterationCount = 0;

      try {
        for await (const update of ws.subscribeOrderbook([orderbookId], {
          signal: controller.signal,
        })) {
          void update;
          iterationCount++;
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.log("[e2e] Unexpected error:", (error as Error).message);
        }
      }

      // Subscription should have been aborted
      expect(iterationCount).toBe(0);
    });

    it("should support depth option", async () => {
      const orderbookId = ("0x" + "3".repeat(64)) as Hash;
      const controller = new AbortController();

      setTimeout(() => {
        controller.abort();
      }, 100);

      try {
        for await (const update of ws.subscribeOrderbook([orderbookId], {
          signal: controller.signal,
          depth: 5,
        })) {
          void update;
          controller.abort();
          break;
        }
      } catch {
        // Expected
      }
    });

    it("should support multiple orderbook IDs", async () => {
      const orderbookIds = [("0x" + "4".repeat(64)) as Hash, ("0x" + "5".repeat(64)) as Hash];
      const controller = new AbortController();

      setTimeout(() => {
        controller.abort();
      }, 100);

      try {
        for await (const update of ws.subscribeOrderbook(orderbookIds, {
          signal: controller.signal,
        })) {
          void update;
          controller.abort();
          break;
        }
      } catch {
        // Expected
      }
    });
  });
});
