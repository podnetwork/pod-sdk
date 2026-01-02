/**
 * @module e2e/faucet/request-tokens
 * @description E2E tests for faucet REST API
 *
 * Note: The pod faucet uses a REST API at /fund, not JSON-RPC.
 * This test validates the actual faucet behavior.
 */

import { it, expect, beforeAll } from "vitest";
import { PodClient } from "@podnetwork/core";
import type { Address } from "@podnetwork/core";
import { LOCAL_FAUCET_URL } from "../fixtures/constants.js";
import { createRandomWallet } from "../setup/test-context.js";
import { describeE2E } from "../setup/describe-e2e.js";

/**
 * Faucet REST API response.
 */
interface FaucetFundResponse {
  jsonrpc: string;
  id: number;
  result: string;
  tx_hashes: string[];
}

/**
 * Request tokens from the faucet REST API.
 */
async function requestFaucetTokens(address: Address): Promise<FaucetFundResponse> {
  const response = await fetch(`${LOCAL_FAUCET_URL}/fund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });

  if (!response.ok) {
    throw new Error(`Faucet request failed: HTTP ${String(response.status)}`);
  }

  return response.json();
}

describeE2E("Faucet REST API (Local)", () => {
  let client: PodClient;

  beforeAll(() => {
    client = PodClient.local();
  });

  describe("/fund endpoint", () => {
    it("should fund a new address with tokens", async () => {
      const wallet = createRandomWallet();

      // Check initial balance
      const initialBalance = await client.rpc.getBalance(wallet.address);
      expect(initialBalance).toBe(0n);

      // Request tokens from faucet
      const response = await requestFaucetTokens(wallet.address);

      expect(response.result).toBe("Funding successful");
      expect(response.tx_hashes).toBeInstanceOf(Array);
      expect(response.tx_hashes.length).toBeGreaterThan(0);

      // Validate transaction hash format
      for (const txHash of response.tx_hashes) {
        expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      }

      console.log(
        `[e2e] Faucet funded ${String(wallet.address)} with ${String(response.tx_hashes.length)} transactions`
      );

      // Wait for transaction to be processed by polling balance
      let finalBalance = 0n;
      const maxAttempts = 30;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        finalBalance = await client.rpc.getBalance(wallet.address);
        if (finalBalance > 0n) break;
      }

      // Verify balance increased
      expect(finalBalance).toBeGreaterThan(0n);

      console.log(
        `[e2e] Final balance: ${String(finalBalance)} wei (${String(Number(finalBalance) / 1e18)} POD)`
      );
    });

    it("should return multiple transaction hashes (native + ERC20)", async () => {
      const wallet = createRandomWallet();

      const response = await requestFaucetTokens(wallet.address);

      expect(response.result).toBe("Funding successful");
      // The faucet sends both native tokens and USDT by default
      expect(response.tx_hashes.length).toBeGreaterThanOrEqual(2);

      console.log(`[e2e] Received ${String(response.tx_hashes.length)} funding transactions`);
    });

    it("should handle consecutive requests to same address", async () => {
      const wallet = createRandomWallet();

      // First request
      const response1 = await requestFaucetTokens(wallet.address);
      expect(response1.result).toBe("Funding successful");

      // Second request - should also succeed (no rate limiting on this faucet)
      const response2 = await requestFaucetTokens(wallet.address);
      expect(response2.result).toBe("Funding successful");

      console.log("[e2e] Consecutive requests handled successfully");
    });
  });
});
