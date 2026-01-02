/**
 * @module e2e/setup/describe-e2e
 * @description Conditional E2E test wrapper that skips tests when POD_E2E is not set
 */

import { describe } from "vitest";

/**
 * Whether E2E tests are enabled via environment variable.
 *
 * Set POD_E2E=1 or POD_E2E=true to enable E2E tests.
 * Without this variable, E2E tests are skipped to avoid CI failures
 * when the local pod server is not available.
 */
export const E2E_ENABLED = process.env.POD_E2E === "1" || process.env.POD_E2E === "true";

/**
 * Wrapper for `describe` that skips E2E tests when POD_E2E is not set.
 *
 * This allows E2E tests to coexist with unit tests in the same test run
 * without failing when the local pod server is not available.
 *
 * @example
 * ```typescript
 * import { describeE2E } from "../setup/describe-e2e.js";
 *
 * describeE2E("RPC Basic Methods", () => {
 *   it("should return chain ID", async () => {
 *     // This test only runs when POD_E2E=1
 *   });
 * });
 * ```
 */
export const describeE2E = E2E_ENABLED ? describe : describe.skip;

/**
 * Logs E2E test status on module load (for debugging).
 */
if (process.env.DEBUG_E2E) {
  console.log(`[e2e] E2E tests ${E2E_ENABLED ? "ENABLED" : "DISABLED"}`);
  console.log(`[e2e] Set POD_E2E=1 to enable E2E tests`);
}
