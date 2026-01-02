/**
 * @module e2e/ws/connection
 * @description E2E tests for WebSocket connection lifecycle
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createWsNamespace, type WsNamespace } from "@podnetwork/ws";
import { LOCAL_WS_URL } from "../fixtures/constants.js";
import { sleep } from "../helpers/wait.js";
import { describeE2E } from "../setup/describe-e2e.js";

describeE2E("WebSocket Connection", () => {
  let ws: WsNamespace;

  beforeEach(() => {
    ws = createWsNamespace(LOCAL_WS_URL);
  });

  afterEach(async () => {
    try {
      await ws.disconnect();
    } catch {
      // Ignore disconnect errors in cleanup
    }
  });

  describe("connection lifecycle", () => {
    it("should start in disconnected state", () => {
      expect(ws.getState()).toBe("disconnected");
    });

    it("should connect successfully", async () => {
      await ws.connect();
      expect(ws.getState()).toBe("connected");
    });

    it("should disconnect cleanly", async () => {
      await ws.connect();
      expect(ws.getState()).toBe("connected");

      await ws.disconnect();
      expect(ws.getState()).toBe("disconnected");
    });

    it("should handle multiple connect calls", async () => {
      await ws.connect();
      await ws.connect(); // Should be idempotent
      expect(ws.getState()).toBe("connected");
    });

    it("should handle disconnect when not connected", async () => {
      // Should not throw
      await ws.disconnect();
      expect(ws.getState()).toBe("disconnected");
    });
  });

  describe("connection events", () => {
    it("should emit connected event", async () => {
      const events: string[] = [];

      ws.addEventListener((event: { type: string }) => {
        events.push(event.type);
      });

      await ws.connect();

      // Wait a bit for event propagation
      await sleep(100);

      expect(events).toContain("connected");
    });

    it("should emit disconnected event", async () => {
      const events: string[] = [];

      ws.addEventListener((event: { type: string }) => {
        events.push(event.type);
      });

      await ws.connect();
      await ws.disconnect();

      // Wait a bit for event propagation
      await sleep(100);

      expect(events).toContain("disconnected");
    });

    it("should support removing event listeners", async () => {
      const events: string[] = [];
      const listener = (event: { type: string }) => {
        events.push(event.type);
      };

      ws.addEventListener(listener);
      await ws.connect();

      // Verify listener received the connected event
      await sleep(100);
      expect(events).toContain("connected");
      const eventsAfterConnect = events.length;

      // Remove listener before disconnect
      ws.removeEventListener(listener);
      await ws.disconnect();

      // Wait for potential event propagation
      await sleep(100);

      // After removal, no new events should be captured
      // The listener should NOT have received the disconnected event
      expect(events.length).toBe(eventsAfterConnect);
      expect(events).not.toContain("disconnected");
    });
  });

  describe("subscription limits", () => {
    it("should report max subscriptions", () => {
      const maxSubs = ws.getMaxSubscriptions();
      expect(maxSubs).toBeGreaterThan(0);
      expect(maxSubs).toBe(10); // Default is 10
    });

    it("should report zero active subscriptions initially", () => {
      expect(ws.getSubscriptionCount()).toBe(0);
    });

    it("should report can subscribe when under limit", () => {
      expect(ws.canSubscribe()).toBe(true);
    });
  });
});
