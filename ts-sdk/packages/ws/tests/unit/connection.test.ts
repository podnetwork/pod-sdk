// Unit tests for WebSocket connection manager and subscription limits

import { describe, it, expect, vi } from "vitest";
import { WebSocketConnection } from "../../src/connection.js";
import { PodExecutionError, POD_ERRORS } from "@podnetwork/core";

// These tests focus on the synchronous aspects of subscription limit tracking
// Full integration tests would require actual WebSocket connections

describe("WebSocketConnection", () => {
  describe("subscription limit configuration", () => {
    it("should use default max subscriptions of 10", () => {
      const connection = new WebSocketConnection({
        url: "wss://test.example.com",
      });

      expect(connection.getMaxSubscriptions()).toBe(10);
    });

    it("should use custom max subscriptions", () => {
      const connection = new WebSocketConnection({
        url: "wss://test.example.com",
        maxSubscriptions: 5,
      });

      expect(connection.getMaxSubscriptions()).toBe(5);
    });
  });

  describe("connection state", () => {
    it("should start disconnected", () => {
      const connection = new WebSocketConnection({
        url: "wss://test.example.com",
      });

      expect(connection.getState()).toBe("disconnected");
    });

    it("should report 0 subscriptions initially", () => {
      const connection = new WebSocketConnection({
        url: "wss://test.example.com",
      });

      expect(connection.getSubscriptionCount()).toBe(0);
    });

    it("should report canSubscribe as true initially", () => {
      const connection = new WebSocketConnection({
        url: "wss://test.example.com",
      });

      expect(connection.canSubscribe()).toBe(true);
    });
  });

  describe("event listeners", () => {
    it("should add event listeners", () => {
      const connection = new WebSocketConnection({
        url: "wss://test.example.com",
      });

      const callback = (): void => {
        // Intentionally empty
      };

      connection.addEventListener(callback);
      // Just testing that it doesn't throw
      expect(() => {
        connection.removeEventListener(callback);
      }).not.toThrow();
    });

    it("should remove event listeners without error", () => {
      const connection = new WebSocketConnection({
        url: "wss://test.example.com",
      });

      const callback = vi.fn();

      // Add and remove listener - should not throw
      connection.addEventListener(callback);
      connection.removeEventListener(callback);

      // Removing again should not throw (idempotent)
      expect(() => {
        connection.removeEventListener(callback);
      }).not.toThrow();

      // Verify callback was created but never called (no connection = no events)
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("subscription limit", () => {
    it("should report correct canSubscribe based on max", () => {
      const connection = new WebSocketConnection({
        url: "wss://test.example.com",
        maxSubscriptions: 2,
      });

      // Initially can subscribe
      expect(connection.canSubscribe()).toBe(true);
      expect(connection.getSubscriptionCount()).toBe(0);
      expect(connection.getMaxSubscriptions()).toBe(2);
    });
  });
});

describe("PodExecutionError.wsSubscriptionLimit", () => {
  it("should create error with correct details", () => {
    const error = PodExecutionError.wsSubscriptionLimit(10, 10);

    expect(error).toBeInstanceOf(PodExecutionError);
    expect(error.code).toBe(POD_ERRORS.WS_SUBSCRIPTION_LIMIT);
    expect(error.message).toContain("10");
  });

  it("should include current and max in message", () => {
    const error = PodExecutionError.wsSubscriptionLimit(5, 5);

    expect(error.message).toContain("5");
  });
});
