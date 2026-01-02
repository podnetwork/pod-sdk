/**
 * Tests for clipboard utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { copyToClipboard, isClipboardAvailable } from "../../../src/utils/clipboard.js";

describe("copyToClipboard", () => {
  let originalClipboard: typeof navigator.clipboard;

  beforeEach(() => {
    originalClipboard = navigator.clipboard;
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  it("should copy text to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    await copyToClipboard("test text");

    expect(writeText).toHaveBeenCalledWith("test text");
  });

  it("should handle empty string", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    await copyToClipboard("");

    expect(writeText).toHaveBeenCalledWith("");
  });

  it("should reject when clipboard API fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    await expect(copyToClipboard("test")).rejects.toThrow("Permission denied");
  });

  it("should throw when clipboard is not available", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    await expect(copyToClipboard("test")).rejects.toThrow("Clipboard API is not available");
  });
});

describe("isClipboardAvailable", () => {
  let originalClipboard: typeof navigator.clipboard;

  beforeEach(() => {
    originalClipboard = navigator.clipboard;
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  it("should return true when clipboard API is available", () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn() },
      writable: true,
      configurable: true,
    });

    expect(isClipboardAvailable()).toBe(true);
  });

  it("should return false when clipboard is undefined", () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    expect(isClipboardAvailable()).toBe(false);
  });

  it("should return false when writeText is not a function", () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: "not a function" },
      writable: true,
      configurable: true,
    });

    expect(isClipboardAvailable()).toBe(false);
  });
});
