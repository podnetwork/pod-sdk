/**
 * @module utils/environment
 * @description Runtime environment detection utilities
 */

/**
 * Detect if code is running in a browser environment.
 *
 * Uses feature detection to check for browser-specific globals
 * (`window` and `document`) via `globalThis`.
 *
 * @returns True if running in a browser, false for Node.js/other runtimes
 *
 * @example
 * ```typescript
 * import { isBrowser } from '@podnetwork/core';
 *
 * if (isBrowser()) {
 *   // Use browser-specific APIs
 *   console.warn('Running in browser environment');
 * } else {
 *   // Use Node.js APIs
 *   console.log('Running in Node.js');
 * }
 * ```
 */
export function isBrowser(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    typeof (globalThis as { window?: unknown }).window !== "undefined" &&
    typeof (globalThis as { document?: unknown }).document !== "undefined"
  );
}
