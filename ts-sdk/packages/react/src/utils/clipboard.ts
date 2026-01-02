/**
 * @module utils/clipboard
 * @description Utilities for clipboard operations
 */

import { isClipboardAvailable } from "./ssr.js";

/**
 * Copy text to clipboard.
 *
 * @param text - The text to copy
 * @returns Promise that resolves when copy succeeds, rejects on failure
 *
 * @example
 * ```typescript
 * try {
 *   await copyToClipboard('0x1234...');
 *   // Show success feedback
 * } catch (error) {
 *   // Handle error
 * }
 * ```
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (!isClipboardAvailable()) {
    throw new Error("Clipboard API is not available");
  }

  await navigator.clipboard.writeText(text);
}

// Re-export for convenience
export { isClipboardAvailable };
