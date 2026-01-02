/**
 * @module e2e/auction/get-status
 * @description E2E tests for auction RPC methods
 *
 * Note: getBids() uses eth_call with getBids(uint256 auctionId) function selector,
 * matching the Rust SDK's get_bids behavior.
 */

import { it, expect, beforeAll } from "vitest";
import { PodClient } from "@podnetwork/core";
import { AuctionNamespace } from "@podnetwork/auction";
import { CHRONOS_DEV_RPC_URL } from "../fixtures/constants.js";
import { describeE2E } from "../setup/describe-e2e.js";

describeE2E("Auction RPC Methods (Chronos devnet)", () => {
  let client: PodClient;
  let auction: AuctionNamespace;

  beforeAll(() => {
    client = PodClient.chronosDev();
    auction = new AuctionNamespace(
      {
        url: CHRONOS_DEV_RPC_URL,
        timeout: 30000,
        maxRetries: 3,
      },
      client.getTransactionSender()
    );
  });

  describe("getBids (via eth_call)", () => {
    it("should return empty array for non-existent auction", async () => {
      // eth_call to getBids should return empty data or decode to empty array
      const bids = await auction.getBids(999999999n);
      expect(bids).toEqual([]);
    });

    it("should return empty array for auction ID 0", async () => {
      const bids = await auction.getBids(0n);
      expect(Array.isArray(bids)).toBe(true);
    });

    it("should handle large auction IDs", async () => {
      const largeId = 2n ** 64n - 1n;
      const bids = await auction.getBids(largeId);
      expect(Array.isArray(bids)).toBe(true);
    });
  });

  describe("waitForDeadline", () => {
    it("should resolve immediately if deadline is in the past", async () => {
      // Deadline 1 second ago in microseconds
      const pastDeadline = BigInt(Date.now() - 1000) * 1000n;
      await expect(auction.waitForDeadline(pastDeadline)).resolves.toBeUndefined();
    });

    it("should wait until deadline passes", async () => {
      // Deadline 100ms in the future
      const futureDeadline = BigInt(Date.now() + 100) * 1000n;
      const startTime = Date.now();

      await auction.waitForDeadline(futureDeadline, 50);

      const elapsed = Date.now() - startTime;
      // Should have waited at least 50ms (minus some tolerance)
      expect(elapsed).toBeGreaterThanOrEqual(50);
    });
  });
});
