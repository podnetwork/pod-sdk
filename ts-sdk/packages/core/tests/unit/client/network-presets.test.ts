/**
 * Unit tests for network preset error behavior.
 * Verifies that testnet/mainnet throw helpful errors until those networks launch.
 */

import { describe, it, expect } from "vitest";
import { PodClient, TESTNET, MAINNET } from "../../../src/index.js";

describe("Network Presets", () => {
  describe("PodClient.testnet()", () => {
    it("throws error with helpful message", () => {
      expect(() => PodClient.testnet()).toThrow("pod testnet is not yet available");
    });

    it("suggests using dev() or chronosDev() instead", () => {
      expect(() => PodClient.testnet()).toThrow("PodClient.dev()");
    });

    it("includes link to pod.network for announcements", () => {
      expect(() => PodClient.testnet()).toThrow("pod.network");
    });
  });

  describe("PodClient.mainnet()", () => {
    it("throws error with helpful message", () => {
      expect(() => PodClient.mainnet()).toThrow("pod mainnet is not yet available");
    });

    it("suggests using dev() or chronosDev() instead", () => {
      expect(() => PodClient.mainnet()).toThrow("PodClient.dev()");
    });

    it("includes link to pod.network for announcements", () => {
      expect(() => PodClient.mainnet()).toThrow("pod.network");
    });
  });

  describe("TESTNET constant", () => {
    it("throws when accessing url", () => {
      expect(() => TESTNET.url).toThrow("pod testnet is not yet available");
    });

    it("throws when accessing wsUrl", () => {
      expect(() => TESTNET.wsUrl).toThrow("pod testnet is not yet available");
    });

    it("throws when accessing chainId", () => {
      expect(() => TESTNET.chainId).toThrow("pod testnet is not yet available");
    });

    it("suggests using DEV or CHRONOS_DEV instead", () => {
      expect(() => TESTNET.url).toThrow("DEV");
    });
  });

  describe("MAINNET constant", () => {
    it("throws when accessing url", () => {
      expect(() => MAINNET.url).toThrow("pod mainnet is not yet available");
    });

    it("throws when accessing wsUrl", () => {
      expect(() => MAINNET.wsUrl).toThrow("pod mainnet is not yet available");
    });

    it("throws when accessing chainId", () => {
      expect(() => MAINNET.chainId).toThrow("pod mainnet is not yet available");
    });

    it("suggests using DEV or CHRONOS_DEV instead", () => {
      expect(() => MAINNET.url).toThrow("DEV");
    });
  });

  describe("Available network presets work correctly", () => {
    it("PodClient.dev() returns a valid client", () => {
      const client = PodClient.dev();
      expect(client).toBeInstanceOf(PodClient);
      expect(client.url).toBeDefined();
    });

    it("PodClient.chronosDev() returns a valid client", () => {
      const client = PodClient.chronosDev();
      expect(client).toBeInstanceOf(PodClient);
      expect(client.url).toBeDefined();
    });
  });
});
