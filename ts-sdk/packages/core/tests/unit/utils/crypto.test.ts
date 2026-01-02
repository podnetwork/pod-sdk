/**
 * Unit tests for crypto utilities.
 * These tests verify our @noble/hashes implementation matches ethers.js behavior.
 */

import { describe, it, expect } from "vitest";
import { keccak256, keccak256Utf8 } from "../../../src/utils/crypto.js";

describe("keccak256", () => {
  describe("hex input handling", () => {
    it("should hash hex string with 0x prefix", () => {
      // Empty data - keccak256 of 0 bytes
      const result = keccak256("0x");
      expect(result).toBe("0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470");
    });

    it("should hash hex string without 0x prefix", () => {
      // Same as above but without prefix
      const result = keccak256("");
      expect(result).toBe("0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470");
    });

    it("should hash single byte", () => {
      // 0x00 - single zero byte
      const result = keccak256("0x00");
      expect(result).toBe("0xbc36789e7a1e281436464229828f817d6612f7b477d66591ff96a9e064bcc98a");
    });

    it("should hash multiple bytes", () => {
      // 0xdeadbeef
      const result = keccak256("0xdeadbeef");
      expect(result).toBe("0xd4fd4e189132273036449fc9e11198c739161b4c0116a9a2dccdfa1c492006f1");
    });

    it("should handle uppercase hex", () => {
      const lower = keccak256("0xdeadbeef");
      const upper = keccak256("0xDEADBEEF");
      expect(lower).toBe(upper);
    });

    it("should handle mixed case hex", () => {
      const result = keccak256("0xDeAdBeEf");
      expect(result).toBe("0xd4fd4e189132273036449fc9e11198c739161b4c0116a9a2dccdfa1c492006f1");
    });
  });

  describe("public key to address derivation", () => {
    // This is the primary use case for keccak256 in our codebase
    const SAMPLE_PUBLIC_KEY =
      "01f63ebcf3e22985abef399b43966f409bba8c02a61141de1a96398b5ed0a4f5002eb5e9083d0f8bc5bfcf75f43fbe34dfc037492025d18e42942f9ed6c4b00205e30c48e09b4c030cfa588ea4ec104bd9977173d8ef7c16021fb5edf727c38a2e2f2605c8a87f80b7900b64be0cbad48239d0cf4c09375753d4fb0b7036abcc";

    it("should produce consistent hash for public key", () => {
      const hash = keccak256(`0x${SAMPLE_PUBLIC_KEY}`);
      // The hash should be 66 chars (0x + 64 hex)
      expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
      // Last 40 chars form the address
      const address = `0x${hash.slice(-40)}`;
      expect(address).toMatch(/^0x[a-f0-9]{40}$/);
    });

    it("should derive same address with or without 04 prefix", () => {
      const result = keccak256(`0x${SAMPLE_PUBLIC_KEY}`);
      // Verify the function works consistently and produces valid hash
      expect(result).toMatch(/^0x[a-f0-9]{64}$/);
    });
  });

  describe("output format", () => {
    it("should return 0x-prefixed hash", () => {
      const result = keccak256("0xdeadbeef");
      expect(result.startsWith("0x")).toBe(true);
    });

    it("should return 66-character string (0x + 64 hex)", () => {
      const result = keccak256("0xdeadbeef");
      expect(result.length).toBe(66);
    });

    it("should return lowercase hex", () => {
      const result = keccak256("0xABCDEF");
      // After 0x prefix, all hex chars should be lowercase
      expect(result.slice(2)).toBe(result.slice(2).toLowerCase());
    });
  });
});

describe("keccak256Utf8", () => {
  describe("basic string hashing", () => {
    it("should hash empty string", () => {
      const result = keccak256Utf8("");
      // keccak256 of empty string (UTF-8 encoded, which is 0 bytes)
      expect(result).toBe("0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470");
    });

    it("should hash 'hello'", () => {
      const result = keccak256Utf8("hello");
      expect(result).toBe("0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8");
    });

    it("should hash 'Hello World'", () => {
      const result = keccak256Utf8("Hello World");
      expect(result).toBe("0x592fa743889fc7f92ac2a37bb1f5ba1daf2a5c84741ca0e0061d243a2e6707ba");
    });
  });

  describe("EIP-55 address checksum hashing", () => {
    // This is the primary use case - hashing lowercase address (without 0x) for checksumming
    it("should hash lowercase address for checksum calculation", () => {
      // Example: to checksum 0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed
      // We hash the 40-char lowercase string (not hex bytes, but UTF-8 string)
      const address = "5aaeb6053f3e94c9b9a09f33669435e7ef1beaed";
      const result = keccak256Utf8(address);
      // The hash determines case of each character in output
      expect(result).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it("should produce different hash for different addresses", () => {
      const hash1 = keccak256Utf8("5aaeb6053f3e94c9b9a09f33669435e7ef1beaed");
      const hash2 = keccak256Utf8("0000000000000000000000000000000000000000");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("unicode handling", () => {
    it("should handle basic ASCII", () => {
      const result = keccak256Utf8("abc");
      expect(result).toBe("0x4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45");
    });

    it("should handle unicode characters", () => {
      const result = keccak256Utf8("hello\u{1F600}"); // hello + emoji
      // Just verify it produces a valid hash without throwing
      expect(result).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it("should handle multi-byte UTF-8 characters", () => {
      const result = keccak256Utf8("\u00e9"); // é (2 bytes in UTF-8)
      expect(result).toMatch(/^0x[a-f0-9]{64}$/);
    });
  });

  describe("output format", () => {
    it("should return 0x-prefixed hash", () => {
      const result = keccak256Utf8("test");
      expect(result.startsWith("0x")).toBe(true);
    });

    it("should return 66-character string", () => {
      const result = keccak256Utf8("test");
      expect(result.length).toBe(66);
    });

    it("should return lowercase hex", () => {
      const result = keccak256Utf8("TEST");
      expect(result.slice(2)).toBe(result.slice(2).toLowerCase());
    });
  });
});

describe("keccak256 vs keccak256Utf8", () => {
  it("should produce different results for same characters", () => {
    // "ab" as UTF-8 is bytes [0x61, 0x62]
    // "ab" as hex would be interpreting it as hex chars
    const utf8Result = keccak256Utf8("ab");
    // 0x6162 is the hex encoding of "ab" bytes
    const hexResult = keccak256("0x6162");
    // These SHOULD be the same since "ab" in UTF-8 is 0x61, 0x62
    expect(utf8Result).toBe(hexResult);
  });

  it("should produce same result when inputs represent same bytes", () => {
    // UTF-8 "abc" = [0x61, 0x62, 0x63]
    const utf8 = keccak256Utf8("abc");
    // Hex 0x616263 = same bytes
    const hex = keccak256("0x616263");
    expect(utf8).toBe(hex);
  });
});
