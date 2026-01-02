/**
 * Test setup file for @podnetwork/react
 */

// Cleanup after each test
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll, vi } from "vitest";

// Suppress React error boundary logging during tests
// React logs errors to console even when tests expect them
const originalConsoleError = console.error;

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Suppress expected React error boundary messages
    const message = args[0];
    if (
      typeof message === "string" &&
      (message.includes("Consider adding an error boundary") ||
        message.includes("The above error occurred in") ||
        message.includes("Error: Uncaught"))
    ) {
      return;
    }
    originalConsoleError(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
});
