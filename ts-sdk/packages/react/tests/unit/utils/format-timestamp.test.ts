/**
 * Tests for formatTimestamp, relativeTime, and formatDuration utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatTimestamp,
  relativeTime,
  formatDuration,
} from "../../../src/utils/format-timestamp.js";

describe("formatTimestamp", () => {
  const FIXED_NOW = new Date("2024-01-15T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("relative formatting (default)", () => {
    it("should format timestamp from seconds ago", () => {
      const thirtySecondsAgo = new Date(FIXED_NOW.getTime() - 30000);
      const result = formatTimestamp(thirtySecondsAgo);
      expect(result).toBe("30 seconds ago");
    });

    it("should format timestamp from minutes ago", () => {
      const fiveMinutesAgo = new Date(FIXED_NOW.getTime() - 5 * 60 * 1000);
      const result = formatTimestamp(fiveMinutesAgo);
      expect(result).toBe("5 minutes ago");
    });

    it("should format timestamp from hours ago", () => {
      const twoHoursAgo = new Date(FIXED_NOW.getTime() - 2 * 60 * 60 * 1000);
      const result = formatTimestamp(twoHoursAgo);
      expect(result).toBe("2 hours ago");
    });

    it("should format timestamp from days ago", () => {
      const threeDaysAgo = new Date(FIXED_NOW.getTime() - 3 * 24 * 60 * 60 * 1000);
      const result = formatTimestamp(threeDaysAgo);
      expect(result).toBe("3 days ago");
    });

    it("should handle future timestamps", () => {
      const inOneHour = new Date(FIXED_NOW.getTime() + 60 * 60 * 1000);
      const result = formatTimestamp(inOneHour);
      expect(result).toBe("in 1 hour");
    });
  });

  describe("absolute formatting", () => {
    it("should format with short date and time style by default", () => {
      const timestamp = new Date("2024-01-15T14:30:00Z");
      const result = formatTimestamp(timestamp, {
        format: "absolute",
        locale: "en-US",
        timezone: "UTC",
      });
      // Format varies by locale, but should contain date and time
      expect(result).toMatch(/1\/15\/24/);
    });

    it("should respect custom date and time styles", () => {
      const timestamp = new Date("2024-01-15T14:30:00Z");
      const result = formatTimestamp(timestamp, {
        format: "absolute",
        dateStyle: "long",
        timeStyle: "short",
        locale: "en-US",
        timezone: "UTC",
      });
      expect(result).toMatch(/January 15, 2024/);
    });
  });

  describe("input types", () => {
    it("should handle Unix timestamp in seconds", () => {
      const unixSeconds = Math.floor((FIXED_NOW.getTime() - 60 * 1000) / 1000);
      const result = formatTimestamp(unixSeconds);
      expect(result).toBe("1 minute ago");
    });

    it("should handle Unix timestamp in milliseconds", () => {
      const unixMs = FIXED_NOW.getTime() - 60 * 1000;
      const result = formatTimestamp(unixMs);
      expect(result).toBe("1 minute ago");
    });

    it("should handle bigint timestamp", () => {
      const bigintTs = BigInt(Math.floor(FIXED_NOW.getTime() / 1000) - 60);
      const result = formatTimestamp(bigintTs);
      expect(result).toBe("1 minute ago");
    });

    it("should handle Date object", () => {
      const date = new Date(FIXED_NOW.getTime() - 60 * 1000);
      const result = formatTimestamp(date);
      expect(result).toBe("1 minute ago");
    });
  });

  describe("relativeTo option", () => {
    it("should format relative to custom reference date", () => {
      const timestamp = new Date("2024-01-15T10:00:00Z");
      const reference = new Date("2024-01-15T11:00:00Z");
      const result = formatTimestamp(timestamp, { relativeTo: reference });
      expect(result).toBe("1 hour ago");
    });

    it("should accept relativeTo as number", () => {
      const timestamp = new Date("2024-01-15T10:00:00Z");
      const reference = new Date("2024-01-15T11:00:00Z").getTime();
      const result = formatTimestamp(timestamp, { relativeTo: reference });
      expect(result).toBe("1 hour ago");
    });
  });
});

describe("relativeTime", () => {
  const FIXED_NOW = new Date("2024-01-15T12:00:00Z");

  it("should format seconds ago", () => {
    const date = new Date(FIXED_NOW.getTime() - 45 * 1000);
    expect(relativeTime(date, FIXED_NOW)).toBe("45 seconds ago");
  });

  it("should format minutes ago", () => {
    const date = new Date(FIXED_NOW.getTime() - 10 * 60 * 1000);
    expect(relativeTime(date, FIXED_NOW)).toBe("10 minutes ago");
  });

  it("should format hours ago", () => {
    const date = new Date(FIXED_NOW.getTime() - 3 * 60 * 60 * 1000);
    expect(relativeTime(date, FIXED_NOW)).toBe("3 hours ago");
  });

  it("should format days ago", () => {
    const date = new Date(FIXED_NOW.getTime() - 5 * 24 * 60 * 60 * 1000);
    expect(relativeTime(date, FIXED_NOW)).toBe("5 days ago");
  });

  it("should format weeks ago", () => {
    const date = new Date(FIXED_NOW.getTime() - 2 * 7 * 24 * 60 * 60 * 1000);
    expect(relativeTime(date, FIXED_NOW)).toBe("2 weeks ago");
  });

  it("should format months ago", () => {
    const date = new Date(FIXED_NOW.getTime() - 60 * 24 * 60 * 60 * 1000);
    expect(relativeTime(date, FIXED_NOW)).toBe("2 months ago");
  });

  it("should format years ago", () => {
    const date = new Date(FIXED_NOW.getTime() - 400 * 24 * 60 * 60 * 1000);
    // Intl.RelativeTimeFormat with numeric: "auto" produces "last year" for 1 year ago
    expect(relativeTime(date, FIXED_NOW)).toBe("last year");
  });

  it("should format future time", () => {
    const date = new Date(FIXED_NOW.getTime() + 2 * 60 * 60 * 1000);
    expect(relativeTime(date, FIXED_NOW)).toBe("in 2 hours");
  });

  it("should use 'now' for very small differences", () => {
    const date = new Date(FIXED_NOW.getTime());
    expect(relativeTime(date, FIXED_NOW)).toBe("now");
  });
});

describe("formatDuration", () => {
  describe("sub-millisecond", () => {
    it("should format sub-millisecond values", () => {
      expect(formatDuration(0.03)).toBe("0.03ms");
    });

    it("should respect precision option", () => {
      expect(formatDuration(0.123456, { precision: 4 })).toBe("0.1235ms");
    });
  });

  describe("milliseconds", () => {
    it("should format millisecond values", () => {
      expect(formatDuration(150)).toBe("150.00ms");
    });

    it("should format fractional milliseconds", () => {
      expect(formatDuration(150.5)).toBe("150.50ms");
    });
  });

  describe("seconds", () => {
    it("should format as seconds when >= 1000ms", () => {
      expect(formatDuration(1500)).toBe("1.50s");
    });

    it("should format whole seconds", () => {
      expect(formatDuration(5000)).toBe("5.00s");
    });
  });

  describe("minutes", () => {
    it("should format as minutes and seconds when >= 60s", () => {
      expect(formatDuration(65000)).toBe("1m 5s");
    });

    it("should format whole minutes", () => {
      expect(formatDuration(120000)).toBe("2m");
    });

    it("should format minutes with remaining seconds", () => {
      expect(formatDuration(150000)).toBe("2m 30s");
    });
  });

  describe("options", () => {
    it("should exclude unit when includeUnit is false", () => {
      expect(formatDuration(1500, { includeUnit: false })).toBe("1.50");
    });

    it("should use long format when compact is false", () => {
      expect(formatDuration(1500, { compact: false })).toBe("1.50 seconds");
    });

    it("should format minutes in long format", () => {
      expect(formatDuration(120000, { compact: false })).toBe("2 minutes");
    });

    it("should handle singular unit in long format", () => {
      expect(formatDuration(60000, { compact: false })).toBe("1 minute");
    });

    it("should format minutes and seconds in long format", () => {
      expect(formatDuration(61000, { compact: false })).toBe("1 minute 1 second");
    });
  });

  describe("precision", () => {
    it("should respect custom precision for milliseconds", () => {
      // Test with value < 1000ms to stay in milliseconds range
      expect(formatDuration(123.4567, { precision: 0 })).toBe("123ms");
    });

    it("should use default precision of 2 for milliseconds", () => {
      // Test with value < 1000ms to stay in milliseconds range
      expect(formatDuration(123.4567)).toBe("123.46ms");
    });

    it("should format seconds with precision", () => {
      // Values >= 1000ms are converted to seconds
      expect(formatDuration(1234.5678)).toBe("1.23s");
    });
  });
});
