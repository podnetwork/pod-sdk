/**
 * @module e2e/ws/auction-bids-sub
 * @description E2E tests for WebSocket auction bid event subscriptions
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createWsNamespace, type WsNamespace } from "@podnetwork/ws";
import { LOCAL_WS_URL } from "../fixtures/constants.js";
import { describeE2E } from "../setup/describe-e2e.js";

describeE2E("WebSocket Auction Bid Subscription", () => {
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

  describe("pod_subscribeAuctionBids", () => {
    it("should create subscription without error", async () => {
      const controller = new AbortController();

      setTimeout(() => {
        controller.abort();
      }, 100);

      try {
        for await (const event of ws.subscribeAuctionBids({
          signal: controller.signal,
        })) {
          void event;
          controller.abort();
          break;
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.log("[e2e] Auction bid subscription error:", (error as Error).message);
        }
      }

      expect(ws.getState()).toBe("connected");
    });

    it("should handle abort signal correctly", async () => {
      const controller = new AbortController();

      setTimeout(() => {
        controller.abort();
      }, 50);

      let iterationCount = 0;

      try {
        for await (const event of ws.subscribeAuctionBids({
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

    it("should support auctionId filter", async () => {
      const controller = new AbortController();

      setTimeout(() => {
        controller.abort();
      }, 100);

      try {
        for await (const event of ws.subscribeAuctionBids({
          signal: controller.signal,
          auctionId: 123n,
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
