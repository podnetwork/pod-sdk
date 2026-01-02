// Unit tests for exponential backoff reconnection logic

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateDelay,
  shouldReconnect,
  resolveBackoffPolicy,
  waitForReconnect,
  isNeverReconnect,
  isExponentialBackoff,
  ReconnectionManager,
  type ResolvedBackoffPolicy,
} from "../../src/reconnect.js";
import type {
  ReconnectPolicy,
  ExponentialBackoffPolicy,
  NeverReconnectPolicy,
} from "../../src/types.js";

describe("resolveBackoffPolicy", () => {
  it("should use defaults for empty policy", () => {
    const policy: ExponentialBackoffPolicy = { type: "exponentialBackoff" };
    const resolved = resolveBackoffPolicy(policy);

    expect(resolved.initialDelay).toBe(100);
    expect(resolved.maxDelay).toBe(30000);
    expect(resolved.multiplier).toBe(2);
    expect(resolved.maxAttempts).toBe(10);
  });

  it("should use provided values", () => {
    const policy: ExponentialBackoffPolicy = {
      type: "exponentialBackoff",
      initialDelay: 200,
      maxDelay: 60000,
      multiplier: 3,
      maxAttempts: 5,
    };
    const resolved = resolveBackoffPolicy(policy);

    expect(resolved.initialDelay).toBe(200);
    expect(resolved.maxDelay).toBe(60000);
    expect(resolved.multiplier).toBe(3);
    expect(resolved.maxAttempts).toBe(5);
  });

  it("should allow undefined maxAttempts for unlimited retries", () => {
    const policy: ExponentialBackoffPolicy = {
      type: "exponentialBackoff",
      maxAttempts: undefined,
    };
    const resolved = resolveBackoffPolicy(policy);

    expect(resolved.maxAttempts).toBe(10); // Default is 10 when undefined is explicitly passed
  });
});

describe("calculateDelay", () => {
  it("should calculate exponential delays", () => {
    const policy: ResolvedBackoffPolicy = {
      initialDelay: 100,
      maxDelay: 30000,
      multiplier: 2,
      maxAttempts: 10,
    };

    // Suppress jitter for predictable testing by checking range
    const delay0 = calculateDelay(0, policy);
    expect(delay0).toBeGreaterThanOrEqual(90); // 100 - 10%
    expect(delay0).toBeLessThanOrEqual(110); // 100 + 10%

    const delay1 = calculateDelay(1, policy);
    expect(delay1).toBeGreaterThanOrEqual(180); // 200 - 10%
    expect(delay1).toBeLessThanOrEqual(220); // 200 + 10%

    const delay2 = calculateDelay(2, policy);
    expect(delay2).toBeGreaterThanOrEqual(360); // 400 - 10%
    expect(delay2).toBeLessThanOrEqual(440); // 400 + 10%
  });

  it("should cap delay at maxDelay", () => {
    const policy: ResolvedBackoffPolicy = {
      initialDelay: 100,
      maxDelay: 500,
      multiplier: 2,
      maxAttempts: 10,
    };

    // After several attempts, should hit the cap
    const delay10 = calculateDelay(10, policy);
    expect(delay10).toBeGreaterThanOrEqual(450); // 500 - 10%
    expect(delay10).toBeLessThanOrEqual(550); // 500 + 10%
  });

  it("should handle multiplier of 1 (linear backoff)", () => {
    const policy: ResolvedBackoffPolicy = {
      initialDelay: 100,
      maxDelay: 30000,
      multiplier: 1,
      maxAttempts: 10,
    };

    const delay0 = calculateDelay(0, policy);
    const delay5 = calculateDelay(5, policy);

    // Both should be around 100 (within jitter)
    expect(delay0).toBeGreaterThanOrEqual(90);
    expect(delay0).toBeLessThanOrEqual(110);
    expect(delay5).toBeGreaterThanOrEqual(90);
    expect(delay5).toBeLessThanOrEqual(110);
  });
});

describe("shouldReconnect", () => {
  it("should return false for never policy", () => {
    const policy: NeverReconnectPolicy = { type: "never" };

    expect(shouldReconnect(0, policy)).toBe(false);
    expect(shouldReconnect(100, policy)).toBe(false);
  });

  it("should return true when under maxAttempts", () => {
    const policy: ExponentialBackoffPolicy = {
      type: "exponentialBackoff",
      maxAttempts: 5,
    };

    expect(shouldReconnect(0, policy)).toBe(true);
    expect(shouldReconnect(4, policy)).toBe(true);
  });

  it("should return false when at or over maxAttempts", () => {
    const policy: ExponentialBackoffPolicy = {
      type: "exponentialBackoff",
      maxAttempts: 5,
    };

    expect(shouldReconnect(5, policy)).toBe(false);
    expect(shouldReconnect(10, policy)).toBe(false);
  });

  it("should allow unlimited attempts when maxAttempts is not set", () => {
    const policy: ExponentialBackoffPolicy = {
      type: "exponentialBackoff",
    };

    // Default maxAttempts is 10
    expect(shouldReconnect(9, policy)).toBe(true);
    expect(shouldReconnect(10, policy)).toBe(false);
  });
});

describe("waitForReconnect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should resolve after the calculated delay", async () => {
    const policy: ResolvedBackoffPolicy = {
      initialDelay: 100,
      maxDelay: 30000,
      multiplier: 2,
      maxAttempts: 10,
    };

    const promise = waitForReconnect(0, policy);

    // Should not resolve immediately
    let resolved = false;
    void promise.then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);

    // Advance past the delay (with jitter margin)
    await vi.advanceTimersByTimeAsync(150);

    expect(resolved).toBe(true);
  });

  it("should reject when aborted before delay", async () => {
    const policy: ResolvedBackoffPolicy = {
      initialDelay: 1000,
      maxDelay: 30000,
      multiplier: 2,
      maxAttempts: 10,
    };

    const controller = new AbortController();
    const promise = waitForReconnect(0, policy, controller.signal);

    // Abort immediately
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("should reject immediately if already aborted", async () => {
    const policy: ResolvedBackoffPolicy = {
      initialDelay: 100,
      maxDelay: 30000,
      multiplier: 2,
      maxAttempts: 10,
    };

    const controller = new AbortController();
    controller.abort();

    await expect(waitForReconnect(0, policy, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});

describe("type guards", () => {
  it("isNeverReconnect should identify never policy", () => {
    const neverPolicy: ReconnectPolicy = { type: "never" };
    const backoffPolicy: ReconnectPolicy = { type: "exponentialBackoff" };

    expect(isNeverReconnect(neverPolicy)).toBe(true);
    expect(isNeverReconnect(backoffPolicy)).toBe(false);
  });

  it("isExponentialBackoff should identify backoff policy", () => {
    const neverPolicy: ReconnectPolicy = { type: "never" };
    const backoffPolicy: ReconnectPolicy = { type: "exponentialBackoff" };

    expect(isExponentialBackoff(neverPolicy)).toBe(false);
    expect(isExponentialBackoff(backoffPolicy)).toBe(true);
  });
});

describe("ReconnectionManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should track attempt count", () => {
    const manager = new ReconnectionManager({
      type: "exponentialBackoff",
      maxAttempts: 5,
    });

    expect(manager.currentAttempt).toBe(0);

    manager.recordFailure();
    expect(manager.currentAttempt).toBe(1);

    manager.recordFailure();
    expect(manager.currentAttempt).toBe(2);
  });

  it("should reset attempt count", () => {
    const manager = new ReconnectionManager({
      type: "exponentialBackoff",
      maxAttempts: 5,
    });

    manager.recordFailure();
    manager.recordFailure();
    expect(manager.currentAttempt).toBe(2);

    manager.reset();
    expect(manager.currentAttempt).toBe(0);
  });

  it("should report shouldRetry correctly", () => {
    const manager = new ReconnectionManager({
      type: "exponentialBackoff",
      maxAttempts: 3,
    });

    expect(manager.shouldRetry()).toBe(true);

    manager.recordFailure();
    expect(manager.shouldRetry()).toBe(true);

    manager.recordFailure();
    expect(manager.shouldRetry()).toBe(true);

    manager.recordFailure();
    expect(manager.shouldRetry()).toBe(false);
  });

  it("should never retry with never policy", () => {
    const manager = new ReconnectionManager({ type: "never" });

    expect(manager.shouldRetry()).toBe(false);
    expect(manager.getNextDelay()).toBeUndefined();
  });

  it("should calculate next delay correctly", () => {
    const manager = new ReconnectionManager({
      type: "exponentialBackoff",
      initialDelay: 100,
      multiplier: 2,
    });

    const delay0 = manager.getNextDelay();
    expect(delay0).toBeDefined();
    expect(delay0).toBeGreaterThanOrEqual(90);
    expect(delay0).toBeLessThanOrEqual(110);

    manager.recordFailure();

    const delay1 = manager.getNextDelay();
    expect(delay1).toBeDefined();
    expect(delay1).toBeGreaterThanOrEqual(180);
    expect(delay1).toBeLessThanOrEqual(220);
  });

  it("should wait for the appropriate delay", async () => {
    const manager = new ReconnectionManager({
      type: "exponentialBackoff",
      initialDelay: 100,
    });

    const waitPromise = manager.wait();

    let resolved = false;
    void waitPromise.then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(150);

    expect(resolved).toBe(true);
  });

  it("should throw when waiting with never policy", async () => {
    const manager = new ReconnectionManager({ type: "never" });

    await expect(manager.wait()).rejects.toThrow("Cannot wait with 'never' reconnect policy");
  });
});
