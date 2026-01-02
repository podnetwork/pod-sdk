/**
 * @module e2e/ws/bids-sub
 * @description E2E tests for WebSocket bid event subscriptions
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createWsNamespace, type WsNamespace } from "@podnetwork/ws";
import type { Hash } from "@podnetwork/core";
import { LOCAL_WS_URL } from "../fixtures/constants.js";
import { describeE2E } from "../setup/describe-e2e.js";

describeE2E("WebSocket Bid Subscription", () => {
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

  describe("pod_subscribeBids", () => {
    it("should create subscription without error", async () => {
      const orderbookId = ("0x" + "a".repeat(64)) as Hash;
      const controller = new AbortController();

      setTimeout(() => {
        controller.abort();
      }, 100);

      try {
        for await (const event of ws.subscribeBids([orderbookId], {
          signal: controller.signal,
        })) {
          void event;
          controller.abort();
          break;
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.log("[e2e] Bid subscription error:", (error as Error).message);
        }
      }

      expect(ws.getState()).toBe("connected");
    });

    it("should handle abort signal correctly", async () => {
      const orderbookId = ("0x" + "b".repeat(64)) as Hash;
      const controller = new AbortController();

      setTimeout(() => {
        controller.abort();
      }, 50);

      let iterationCount = 0;

      try {
        for await (const event of ws.subscribeBids([orderbookId], {
          signal: controller.signal,
        })) {
          void event;
          iterationCount++;
        }
      } catch {
        // Expected
      }

      expect(iterationCount).toBe(0);
    });

    it("should support multiple orderbook IDs", async () => {
      const orderbookIds = [("0x" + "c".repeat(64)) as Hash, ("0x" + "d".repeat(64)) as Hash];
      const controller = new AbortController();

      setTimeout(() => {
        controller.abort();
      }, 100);

      try {
        for await (const event of ws.subscribeBids(orderbookIds, {
          signal: controller.signal,
        })) {
          void event;
          controller.abort();
          break;
        }
      } catch {
        // Expected
      }
    });
  });
});
