// Unit tests for Committee schema validation

import { describe, it, expect } from "vitest";
import { CommitteeSchema } from "../../../src/schemas/committee.js";
import { keccak256 } from "../../../src/utils/crypto.js";

// Sample public keys from pod node documentation
const SAMPLE_PUBLIC_KEYS = [
  "01f63ebcf3e22985abef399b43966f409bba8c02a61141de1a96398b5ed0a4f5002eb5e9083d0f8bc5bfcf75f43fbe34dfc037492025d18e42942f9ed6c4b00205e30c48e09b4c030cfa588ea4ec104bd9977173d8ef7c16021fb5edf727c38a2e2f2605c8a87f80b7900b64be0cbad48239d0cf4c09375753d4fb0b7036abcc",
  "2f8848f3696c99d7bdc1c1fcda5792577afb5bcd93cfd4c7b6a20f99c4c2bf950d55a3057171c1d87add3d690d62206b398121e5e1335bd598f7728225b8c9d0001dd768a50542e7bbdaadd69f4739054a6b1a600a5545dc0603766ec50ad85b28f99ce9c100112a0020d106b8723567b23b6e0ac1ec7559b686e1c18607ff83",
  "0b6dfa0424d710ac6158c0055be1cf0a4c21df3c3a9ca3d5e8d3e580674bc35400caf4585df58ad603e527bcfc026669c9dcaf03ec8c80f278886d34a6cae2b405f64057067f53ae226c48a555a1d10aeec46ac92b5c98f36974206f0ff84f2413ec4b4de5bc56e5ddd5c1f5d768f1ecf748cb44bea6de4c55306e2bfd8c2fee",
];

/**
 * Helper to derive address from public key (same logic as schema).
 * Used to verify the schema's address derivation.
 */
function expectedAddress(publicKey: string): string {
  const pubKeyBytes = publicKey.startsWith("04") ? publicKey.slice(2) : publicKey;
  const hash = keccak256(`0x${pubKeyBytes}`);
  return `0x${hash.slice(-40)}`;
}

describe("CommitteeSchema", () => {
  describe("valid committee responses", () => {
    it("should parse committee with multiple validators", () => {
      const rpcResponse = {
        validators: SAMPLE_PUBLIC_KEYS,
        quorum_size: 3,
        low_quorum_size: 1,
        solver_quorum_size: 2,
      };

      const result = CommitteeSchema.safeParse(rpcResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.validators).toHaveLength(3);
        expect(result.data.validatorCount).toBe(3);
        expect(result.data.quorumSize).toBe(3);
        expect(result.data.lowQuorumSize).toBe(1);
        expect(result.data.solverQuorumSize).toBe(2);
      }
    });

    it("should parse empty validators array", () => {
      const rpcResponse = {
        validators: [],
        quorum_size: 0,
        low_quorum_size: 0,
        solver_quorum_size: 0,
      };

      const result = CommitteeSchema.safeParse(rpcResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.validators).toHaveLength(0);
        expect(result.data.validatorCount).toBe(0);
      }
    });

    it("should parse single validator", () => {
      const rpcResponse = {
        validators: [SAMPLE_PUBLIC_KEYS[0]],
        quorum_size: 1,
        low_quorum_size: 1,
        solver_quorum_size: 1,
      };

      const result = CommitteeSchema.safeParse(rpcResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.validators).toHaveLength(1);
        expect(result.data.validators[0].publicKey).toBe(SAMPLE_PUBLIC_KEYS[0]);
        expect(result.data.validators[0].index).toBe(0);
      }
    });
  });

  describe("snake_case to camelCase transformation", () => {
    it("should transform snake_case fields to camelCase", () => {
      const rpcResponse = {
        validators: [],
        quorum_size: 5,
        low_quorum_size: 2,
        solver_quorum_size: 3,
      };

      const result = CommitteeSchema.safeParse(rpcResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.validatorCount).toBe(0);
        expect(result.data.quorumSize).toBe(5);
        expect(result.data.lowQuorumSize).toBe(2);
        expect(result.data.solverQuorumSize).toBe(3);
        // Verify snake_case fields don't exist on result
        expect((result.data as unknown as Record<string, unknown>)["quorum_size"]).toBeUndefined();
      }
    });
  });

  describe("validator index assignment", () => {
    it("should assign indices based on array position", () => {
      const rpcResponse = {
        validators: SAMPLE_PUBLIC_KEYS,
        quorum_size: 3,
        low_quorum_size: 1,
        solver_quorum_size: 2,
      };

      const result = CommitteeSchema.safeParse(rpcResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        result.data.validators.forEach((validator, i) => {
          expect(validator.index).toBe(i);
        });
      }
    });
  });

  describe("address derivation", () => {
    it("should derive correct addresses from public keys", () => {
      const rpcResponse = {
        validators: SAMPLE_PUBLIC_KEYS,
        quorum_size: 3,
        low_quorum_size: 1,
        solver_quorum_size: 2,
      };

      const result = CommitteeSchema.safeParse(rpcResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        result.data.validators.forEach((validator, i) => {
          const expected = expectedAddress(SAMPLE_PUBLIC_KEYS[i]);
          expect(validator.address.toLowerCase()).toBe(expected.toLowerCase());
        });
      }
    });

    it("should handle public key without 04 prefix", () => {
      // 128-char hex string (no 04 prefix)
      const pubKeyWithoutPrefix = SAMPLE_PUBLIC_KEYS[0];

      const rpcResponse = {
        validators: [pubKeyWithoutPrefix],
        quorum_size: 1,
        low_quorum_size: 1,
        solver_quorum_size: 1,
      };

      const result = CommitteeSchema.safeParse(rpcResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        // Address should be derived correctly
        expect(result.data.validators[0].address).toBeDefined();
        expect(result.data.validators[0].address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      }
    });

    it("should handle public key with 04 prefix", () => {
      // Add 04 prefix to simulate uncompressed format marker
      const pubKeyWithPrefix = `04${SAMPLE_PUBLIC_KEYS[0] ?? ""}`;

      const rpcResponse = {
        validators: [pubKeyWithPrefix],
        quorum_size: 1,
        low_quorum_size: 1,
        solver_quorum_size: 1,
      };

      const result = CommitteeSchema.safeParse(rpcResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        // Address should be the same whether prefix is present or not
        const expectedAddr = expectedAddress(SAMPLE_PUBLIC_KEYS[0]);
        expect(result.data.validators[0].address.toLowerCase()).toBe(expectedAddr.toLowerCase());
      }
    });
  });

  describe("validator structure", () => {
    it("should include publicKey, address, and index in each validator", () => {
      const rpcResponse = {
        validators: [SAMPLE_PUBLIC_KEYS[0]],
        quorum_size: 1,
        low_quorum_size: 1,
        solver_quorum_size: 1,
      };

      const result = CommitteeSchema.safeParse(rpcResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        const validator = result.data.validators[0];
        expect(validator).toHaveProperty("publicKey");
        expect(validator).toHaveProperty("address");
        expect(validator).toHaveProperty("index");
        expect(typeof validator.publicKey).toBe("string");
        expect(typeof validator.address).toBe("string");
        expect(typeof validator.index).toBe("number");
      }
    });
  });

  describe("invalid committee responses", () => {
    it("should reject missing validators field", () => {
      const rpcResponse = {
        quorum_size: 3,
        low_quorum_size: 1,
        solver_quorum_size: 2,
      };

      const result = CommitteeSchema.safeParse(rpcResponse);
      expect(result.success).toBe(false);
    });

    it("should reject missing quorum_size field", () => {
      const rpcResponse = {
        validators: [],
        low_quorum_size: 1,
        solver_quorum_size: 1,
      };

      const result = CommitteeSchema.safeParse(rpcResponse);
      expect(result.success).toBe(false);
    });

    it("should reject non-string validators", () => {
      const rpcResponse = {
        validators: [123, 456], // Wrong format - should be strings
        quorum_size: 2,
        low_quorum_size: 1,
        solver_quorum_size: 1,
      };

      const result = CommitteeSchema.safeParse(rpcResponse);
      expect(result.success).toBe(false);
    });

    it("should reject non-number quorum_size field", () => {
      const rpcResponse = {
        validators: [],
        quorum_size: "3",
        low_quorum_size: 1,
        solver_quorum_size: 2,
      };

      const result = CommitteeSchema.safeParse(rpcResponse);
      expect(result.success).toBe(false);
    });
  });
});
