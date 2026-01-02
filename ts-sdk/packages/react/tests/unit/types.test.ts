/**
 * Tests for type definitions
 */

import { describe, it, expect } from "vitest";
import type {
  ErrorCode,
  HookError,
  RetryConfig,
  RetryState,
  DataHookResult,
  SubscriptionHookResult,
} from "../../src/types.js";
import { DEFAULT_RETRY_CONFIG } from "../../src/types.js";

describe("HookError", () => {
  describe("ErrorCode type", () => {
    it("should define all required error codes", () => {
      const validCodes: ErrorCode[] = [
        "NETWORK_ERROR",
        "INVALID_PARAMS",
        "NOT_FOUND",
        "UNAUTHORIZED",
        "RATE_LIMITED",
        "TIMEOUT",
        "UNKNOWN",
      ];

      // Type check - these should compile without error
      validCodes.forEach((code) => {
        const error: HookError = {
          code,
          message: "Test error",
          retryable: false,
        };
        expect(error.code).toBe(code);
      });
    });

    it("should include NETWORK_ERROR for connection failures", () => {
      const error: HookError = {
        code: "NETWORK_ERROR",
        message: "Failed to connect",
        retryable: true,
      };
      expect(error.code).toBe("NETWORK_ERROR");
    });

    it("should include INVALID_PARAMS for bad arguments", () => {
      const error: HookError = {
        code: "INVALID_PARAMS",
        message: "Invalid address format",
        retryable: false,
      };
      expect(error.code).toBe("INVALID_PARAMS");
    });

    it("should include TIMEOUT for operation timeouts", () => {
      const error: HookError = {
        code: "TIMEOUT",
        message: "Request timed out",
        retryable: true,
      };
      expect(error.code).toBe("TIMEOUT");
    });
  });

  describe("HookError structure", () => {
    it("should require code field", () => {
      const error: HookError = {
        code: "NETWORK_ERROR",
        message: "Test",
        retryable: true,
      };
      expect(error.code).toBeDefined();
      expect(typeof error.code).toBe("string");
    });

    it("should require message field", () => {
      const error: HookError = {
        code: "UNKNOWN",
        message: "Human readable message",
        retryable: false,
      };
      expect(error.message).toBeDefined();
      expect(typeof error.message).toBe("string");
    });

    it("should require retryable field", () => {
      const retryableError: HookError = {
        code: "NETWORK_ERROR",
        message: "Network error",
        retryable: true,
      };
      const nonRetryableError: HookError = {
        code: "INVALID_PARAMS",
        message: "Bad params",
        retryable: false,
      };

      expect(retryableError.retryable).toBe(true);
      expect(nonRetryableError.retryable).toBe(false);
    });

    it("should be readonly", () => {
      const error: HookError = {
        code: "NETWORK_ERROR",
        message: "Test",
        retryable: true,
      };

      // TypeScript should prevent mutation (compile-time check)
      // Runtime we just verify the structure exists
      const errorKeys = Object.keys(error as Record<string, unknown>);
      expect(errorKeys).toContain("code");
      expect(errorKeys).toContain("message");
      expect(errorKeys).toContain("retryable");
    });
  });

  describe("Optional details field", () => {
    it("should allow omitting details", () => {
      const error: HookError = {
        code: "NETWORK_ERROR",
        message: "Network error",
        retryable: true,
      };
      expect(error.details).toBeUndefined();
    });

    it("should allow details with HTTP status", () => {
      const error: HookError = {
        code: "NETWORK_ERROR",
        message: "Server error",
        retryable: true,
        details: { status: 500 },
      };
      expect(error.details?.status).toBe(500);
    });

    it("should allow details with original error", () => {
      const originalError = new Error("Original");
      const error: HookError = {
        code: "UNKNOWN",
        message: "Wrapped error",
        retryable: false,
        details: { originalError: originalError.message },
      };
      expect(error.details?.originalError).toBe("Original");
    });

    it("should allow arbitrary context in details", () => {
      const error: HookError = {
        code: "RATE_LIMITED",
        message: "Too many requests",
        retryable: true,
        details: {
          retryAfter: 30000,
          endpoint: "/api/balance",
          requestId: "req-123",
        },
      };
      expect(error.details?.retryAfter).toBe(30000);
      expect(error.details?.endpoint).toBe("/api/balance");
    });

    it("should be readonly record", () => {
      const error: HookError = {
        code: "NETWORK_ERROR",
        message: "Test",
        retryable: true,
        details: { key: "value" },
      };

      // Verify it's an object with expected properties
      expect(typeof error.details).toBe("object");
      expect(error.details?.key).toBe("value");
    });
  });
});

describe("RetryConfig", () => {
  describe("default configuration", () => {
    it("should have default maxRetries of 5", () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(5);
    });

    it("should have default baseDelay of 1000ms", () => {
      expect(DEFAULT_RETRY_CONFIG.baseDelay).toBe(1000);
    });

    it("should have default maxDelay of 32000ms", () => {
      expect(DEFAULT_RETRY_CONFIG.maxDelay).toBe(32000);
    });

    it("should have default backoffFactor of 2", () => {
      expect(DEFAULT_RETRY_CONFIG.backoffFactor).toBe(2);
    });

    it("should have default jitter of 0.1", () => {
      expect(DEFAULT_RETRY_CONFIG.jitter).toBe(0.1);
    });
  });

  describe("RetryConfig interface", () => {
    it("should allow partial configuration", () => {
      const partialConfig: RetryConfig = {
        maxRetries: 3,
      };
      expect(partialConfig.maxRetries).toBe(3);
      expect(partialConfig.baseDelay).toBeUndefined();
    });

    it("should allow full configuration", () => {
      const fullConfig: RetryConfig = {
        maxRetries: 10,
        baseDelay: 500,
        maxDelay: 16000,
        backoffFactor: 1.5,
        jitter: 0.2,
      };
      expect(fullConfig.maxRetries).toBe(10);
      expect(fullConfig.baseDelay).toBe(500);
      expect(fullConfig.maxDelay).toBe(16000);
      expect(fullConfig.backoffFactor).toBe(1.5);
      expect(fullConfig.jitter).toBe(0.2);
    });
  });
});

describe("RetryState", () => {
  it("should have attempt number starting at 0", () => {
    const state: RetryState = {
      attempt: 0,
      nextRetryAt: null,
      isRetrying: false,
    };
    expect(state.attempt).toBe(0);
  });

  it("should have nextRetryAt as Date when retrying", () => {
    const retryTime = new Date();
    const state: RetryState = {
      attempt: 1,
      nextRetryAt: retryTime,
      isRetrying: true,
    };
    expect(state.nextRetryAt).toBeInstanceOf(Date);
  });

  it("should have isRetrying boolean", () => {
    const notRetrying: RetryState = {
      attempt: 0,
      nextRetryAt: null,
      isRetrying: false,
    };
    const retrying: RetryState = {
      attempt: 1,
      nextRetryAt: new Date(),
      isRetrying: true,
    };
    expect(notRetrying.isRetrying).toBe(false);
    expect(retrying.isRetrying).toBe(true);
  });
});

describe("DataHookResult", () => {
  it("should have all required fields", () => {
    const result: DataHookResult<string> = {
      data: "test",
      isLoading: false,
      isRefreshing: false,
      error: null,
      retry: {
        attempt: 0,
        nextRetryAt: null,
        isRetrying: false,
      },
      refresh: () => {},
    };

    expect(result.data).toBe("test");
    expect(result.isLoading).toBe(false);
    expect(result.isRefreshing).toBe(false);
    expect(result.error).toBeNull();
    expect(result.retry.attempt).toBe(0);
    expect(typeof result.refresh).toBe("function");
  });

  it("should allow null data", () => {
    const result: DataHookResult<number> = {
      data: null,
      isLoading: true,
      isRefreshing: false,
      error: null,
      retry: {
        attempt: 0,
        nextRetryAt: null,
        isRetrying: false,
      },
      refresh: () => {},
    };
    expect(result.data).toBeNull();
  });

  it("should include error when present", () => {
    const result: DataHookResult<string> = {
      data: null,
      isLoading: false,
      isRefreshing: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Failed to fetch",
        retryable: true,
      },
      retry: {
        attempt: 1,
        nextRetryAt: null,
        isRetrying: false,
      },
      refresh: () => {},
    };
    expect(result.error?.code).toBe("NETWORK_ERROR");
  });
});

describe("SubscriptionHookResult", () => {
  it("should extend DataHookResult with connection state", () => {
    const result: SubscriptionHookResult<string[]> = {
      data: ["item1", "item2"],
      isLoading: false,
      isRefreshing: false,
      error: null,
      retry: {
        attempt: 0,
        nextRetryAt: null,
        isRetrying: false,
      },
      refresh: () => {},
      connectionState: "connected",
      lastUpdate: new Date(),
    };

    expect(result.connectionState).toBe("connected");
    expect(result.lastUpdate).toBeInstanceOf(Date);
  });

  it("should allow all connection states", () => {
    const states: SubscriptionHookResult<null>["connectionState"][] = [
      "connecting",
      "connected",
      "disconnected",
      "error",
    ];

    states.forEach((state) => {
      const result: SubscriptionHookResult<null> = {
        data: null,
        isLoading: false,
        isRefreshing: false,
        error: null,
        retry: {
          attempt: 0,
          nextRetryAt: null,
          isRetrying: false,
        },
        refresh: () => {},
        connectionState: state,
        lastUpdate: null,
      };
      expect(result.connectionState).toBe(state);
    });
  });
});
