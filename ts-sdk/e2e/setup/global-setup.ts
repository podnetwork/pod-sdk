/**
 * @module e2e/setup/global-setup
 * @description Global setup for e2e tests - validates server availability
 */

import { LOCAL_RPC_URL, LOCAL_CHAIN_ID } from "../fixtures/constants.js";
import { E2E_ENABLED } from "./describe-e2e.js";

/**
 * Global setup function that runs before all e2e tests.
 * Validates that the local pod server is running and accessible.
 *
 * Skips validation when POD_E2E is not set, since tests will be skipped anyway.
 */
export async function setup(): Promise<void> {
  if (!E2E_ENABLED) {
    console.log("\n[e2e] E2E tests disabled (set POD_E2E=1 to enable)");
    return;
  }

  console.log("\n[e2e] Starting global setup...");
  console.log(`[e2e] Checking server at ${LOCAL_RPC_URL}`);

  try {
    const response = await fetch(LOCAL_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: [],
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${String(response.status)}: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      jsonrpc: string;
      id: number;
      result?: string;
      error?: { code: number; message: string };
    };

    if (data.error) {
      throw new Error(`RPC Error: ${data.error.message}`);
    }

    const chainId = BigInt(data.result ?? "0x0");
    console.log(`[e2e] Connected to chain ID: ${String(chainId)}`);

    if (chainId !== LOCAL_CHAIN_ID) {
      console.warn(
        `[e2e] Warning: Expected chain ID ${String(LOCAL_CHAIN_ID)}, got ${String(chainId)}`
      );
    }

    console.log("[e2e] Global setup complete\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";

    console.error("\n[e2e] ❌ Failed to connect to local pod server");
    console.error(`[e2e] URL: ${LOCAL_RPC_URL}`);
    console.error(`[e2e] Error: ${message}`);
    console.error("\n[e2e] Please ensure the local pod server is running:");
    console.error("[e2e]   - HTTP RPC at http://127.0.0.1:10600");
    console.error("[e2e]   - WebSocket at ws://127.0.0.1:9002\n");

    throw new Error(
      `Local pod server not available at ${LOCAL_RPC_URL}. ` +
        `Please start the server before running e2e tests. ` +
        `Error: ${message}`
    );
  }
}

/**
 * Global teardown function that runs after all e2e tests.
 */
export function teardown(): void {
  console.log("\n[e2e] Global teardown complete");
}
