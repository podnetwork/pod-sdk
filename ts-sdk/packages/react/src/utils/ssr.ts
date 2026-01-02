/**
 * @module utils/ssr
 * @description Utilities for SSR compatibility
 */

/**
 * Check if code is running in a server-side rendering environment.
 *
 * @returns true if running on server (no window), false if in browser
 *
 * @example
 * ```typescript
 * if (isSSR()) {
 *   // Skip browser-only operations
 *   return null;
 * }
 * // Safe to use browser APIs
 * ```
 */
export function isSSR(): boolean {
  return typeof window === "undefined";
}

/**
 * Check if the Clipboard API is available.
 *
 * @returns true if clipboard is available, false otherwise
 *
 * @example
 * ```typescript
 * if (!isClipboardAvailable()) {
 *   // Show fallback UI or disable copy button
 * }
 * ```
 */
export function isClipboardAvailable(): boolean {
  return (
    !isSSR() &&
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard !== "undefined" &&
    typeof navigator.clipboard.writeText === "function"
  );
}

/**
 * Check if WebSocket is available.
 *
 * @returns true if WebSocket is available, false otherwise
 */
export function isWebSocketAvailable(): boolean {
  return !isSSR() && typeof WebSocket !== "undefined";
}

/**
 * Safe wrapper to execute code only in browser environment.
 *
 * @param fn - Function to execute in browser
 * @param fallback - Value to return in SSR environment
 * @returns Result of fn in browser, fallback in SSR
 *
 * @example
 * ```typescript
 * const devicePixelRatio = browserOnly(
 *   () => window.devicePixelRatio,
 *   1
 * );
 * ```
 */
export function browserOnly<T>(fn: () => T, fallback: T): T {
  if (isSSR()) {
    return fallback;
  }
  return fn();
}
