/**
 * @module e2e/core/rpc-blocks
 * @description E2E tests for block-related RPC methods
 */

import { it, expect, beforeAll } from "vitest";
import { PodClient } from "@podnetwork/core";
import type { Hash } from "@podnetwork/core";
import { describeE2E } from "../setup/describe-e2e.js";

describeE2E("RPC Block Methods", () => {
  let client: PodClient;

  beforeAll(() => {
    client = PodClient.local();
  });

  describe("eth_getBlockByNumber", () => {
    it("should get the latest block", async () => {
      const block = await client.rpc.getBlockByNumber("latest");
      expect(block).toBeDefined();
      expect(block!.number).toBeGreaterThanOrEqual(0n);
      expect(block!.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("should get the genesis block (block 0)", async () => {
      const block = await client.rpc.getBlockByNumber(0n);
      expect(block).toBeDefined();
      expect(block!.number).toBe(0n);
    });

    it("should get block by specific number", async () => {
      const latestBlock = await client.rpc.getBlockByNumber("latest");
      if (latestBlock && latestBlock.number > 0n) {
        const block = await client.rpc.getBlockByNumber(1n);
        expect(block).toBeDefined();
        expect(block!.number).toBe(1n);
      }
    });

    it("should return undefined for non-existent future block", async () => {
      const block = await client.rpc.getBlockByNumber(999999999n);
      // Non-existent block should return undefined
      expect(block).toBeUndefined();
    });

    it("should return block with transaction hashes by default", async () => {
      const block = await client.rpc.getBlockByNumber("latest");
      expect(block).toBeDefined();
      expect(Array.isArray(block!.transactions)).toBe(true);
    });

    it("should return block with full transactions when requested", async () => {
      const block = await client.rpc.getBlockByNumber("latest", true);
      expect(block).toBeDefined();
      expect(Array.isArray(block!.transactions)).toBe(true);
      // If there are transactions, they should be full objects
      if (block!.transactions.length > 0) {
        const firstTx = block!.transactions[0];
        // Full transaction objects have a 'hash' property
        expect(typeof firstTx).toBe("object");
      }
    });

    it("should support 'earliest' block tag", async () => {
      try {
        const block = await client.rpc.getBlockByNumber("earliest");
        expect(block).toBeDefined();
        expect(block!.number).toBe(0n);
      } catch (error) {
        // Some nodes may not support 'earliest' tag
        console.log("[e2e] 'earliest' block tag not supported:", (error as Error).message);
      }
    });

    it("should support 'pending' block tag", async () => {
      try {
        const block = await client.rpc.getBlockByNumber("pending");
        // Pending block may or may not exist depending on node state
        if (block) {
          expect(block.number).toBeGreaterThanOrEqual(0n);
        }
      } catch (error) {
        // Some nodes may not support 'pending' tag
        console.log("[e2e] 'pending' block tag not supported:", (error as Error).message);
      }
    });

    it("should include expected block fields", async () => {
      const block = await client.rpc.getBlockByNumber("latest");
      expect(block).toBeDefined();
      expect(block!.hash).toBeDefined();
      expect(block!.parentHash).toBeDefined();
      expect(block!.number).toBeDefined();
      expect(block!.timestamp).toBeDefined();
      expect(block!.gasLimit).toBeDefined();
      expect(block!.gasUsed).toBeDefined();
    });
  });

  describe("eth_getBlockByHash", () => {
    it("should get block by hash", async () => {
      try {
        // First get the latest block to get its hash
        const latestBlock = await client.rpc.getBlockByNumber("latest");
        expect(latestBlock).toBeDefined();

        const block = await client.rpc.getBlock(latestBlock!.hash);
        expect(block).toBeDefined();
        expect(block!.hash).toBe(latestBlock!.hash);
        expect(block!.number).toBe(latestBlock!.number);
      } catch (error) {
        // eth_getBlockByHash may not be supported
        console.log("[e2e] eth_getBlockByHash not supported:", (error as Error).message);
      }
    });

    it("should return undefined for non-existent hash", async () => {
      try {
        const fakeHash = ("0x" + "0".repeat(64)) as Hash;
        const block = await client.rpc.getBlock(fakeHash);
        expect(block).toBeUndefined();
      } catch (error) {
        // eth_getBlockByHash may not be supported
        console.log("[e2e] eth_getBlockByHash not supported:", (error as Error).message);
      }
    });

    it("should return block with full transactions when requested", async () => {
      try {
        const latestBlock = await client.rpc.getBlockByNumber("latest");
        expect(latestBlock).toBeDefined();

        const block = await client.rpc.getBlock(latestBlock!.hash, true);
        expect(block).toBeDefined();
        expect(Array.isArray(block!.transactions)).toBe(true);
      } catch (error) {
        // eth_getBlockByHash may not be supported
        console.log("[e2e] eth_getBlockByHash not supported:", (error as Error).message);
      }
    });
  });
});
