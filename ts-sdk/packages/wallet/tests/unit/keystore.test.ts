// Unit tests for keystore functionality

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  saveKeystore,
  loadKeystore,
  isValidKeystore,
  getKeystoreAddress,
} from "../../src/keystore.js";
import { Wallet } from "../../src/wallet.js";
import { resetBrowserWarning } from "../../src/browser-warning.js";
import { PodWalletError } from "@podnetwork/core";

// Known test private key
const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const TEST_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

describe("Keystore", () => {
  beforeEach(() => {
    resetBrowserWarning();
    vi.spyOn(console, "warn").mockImplementation((): void => {
      // Suppress browser warnings in tests
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("saveKeystore", () => {
    it("should encrypt wallet to valid JSON", async () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);
      const password = "test-password";

      // Act
      const json = await saveKeystore(wallet, password);

      // Assert
      const parseJson = (): { version: number; Crypto?: unknown; crypto?: unknown } =>
        JSON.parse(json) as { version: number; Crypto?: unknown; crypto?: unknown };
      expect(parseJson).not.toThrow();
      const parsed = parseJson();
      expect(parsed.version).toBe(3);
      // ethers v6 uses "Crypto" (capital C) for the crypto field
      expect(parsed.Crypto ?? parsed.crypto).toBeDefined();
    });

    it("should include address in keystore", async () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);
      const password = "test-password";

      // Act
      const json = await saveKeystore(wallet, password);
      const parsed = JSON.parse(json);

      // Assert - address is stored without 0x prefix in standard format
      expect(parsed.address.toLowerCase()).toBe(TEST_ADDRESS.slice(2).toLowerCase());
    });

    it("should throw for empty password", async () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);

      // Act & Assert
      await expect(saveKeystore(wallet, "")).rejects.toThrow(PodWalletError);
      await expect(saveKeystore(wallet, "")).rejects.toThrow(/Password cannot be empty/);
    });

    it("should call progress callback", async () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);
      const password = "test-password";
      const progressFn = vi.fn();

      // Act
      await saveKeystore(wallet, password, {
        onProgress: progressFn,
        // Use faster scrypt params for testing
        scrypt: { N: 1024, r: 8, p: 1 },
      });

      // Assert
      expect(progressFn).toHaveBeenCalled();
      // Progress should be between 0 and 1
      const calls = progressFn.mock.calls;
      for (const [progress] of calls) {
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(1);
      }
    });
  }, 30000); // Increase timeout for encryption

  describe("loadKeystore", () => {
    it("should decrypt keystore with correct password", async () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);
      const password = "test-password";

      // Save with fast scrypt params
      const json = await saveKeystore(wallet, password, {
        scrypt: { N: 1024, r: 8, p: 1 },
      });

      // Act
      const result = await loadKeystore(json, password);

      // Assert
      expect(result.address).toBe(TEST_ADDRESS);
      expect(result.privateKey).toBe(TEST_PRIVATE_KEY);
    }, 30000);

    it("should throw WalletError for wrong password", async () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);
      const password = "correct-password";
      const wrongPassword = "wrong-password";

      const json = await saveKeystore(wallet, password, {
        scrypt: { N: 1024, r: 8, p: 1 },
      });

      // Act & Assert
      await expect(loadKeystore(json, wrongPassword)).rejects.toThrow(PodWalletError);
    }, 30000);

    it("should throw WalletError for empty password", async () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);
      const json = await saveKeystore(wallet, "password", {
        scrypt: { N: 1024, r: 8, p: 1 },
      });

      // Act & Assert
      await expect(loadKeystore(json, "")).rejects.toThrow(PodWalletError);
      await expect(loadKeystore(json, "")).rejects.toThrow(/Password cannot be empty/);
    }, 30000);

    it("should throw WalletError for invalid JSON", async () => {
      // Arrange
      const invalidJson = "not valid json {";

      // Act & Assert
      await expect(loadKeystore(invalidJson, "password")).rejects.toThrow(PodWalletError);
      await expect(loadKeystore(invalidJson, "password")).rejects.toThrow(/Invalid keystore JSON/);
    });

    it("should throw WalletError for invalid keystore format", async () => {
      // Arrange
      const invalidKeystore = JSON.stringify({ foo: "bar" });

      // Act & Assert
      await expect(loadKeystore(invalidKeystore, "password")).rejects.toThrow(PodWalletError);
      await expect(loadKeystore(invalidKeystore, "password")).rejects.toThrow(
        /Invalid keystore format/
      );
    });

    it("should call progress callback during decryption", async () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);
      const password = "test-password";
      const json = await saveKeystore(wallet, password, {
        scrypt: { N: 1024, r: 8, p: 1 },
      });

      const progressFn = vi.fn();

      // Act
      await loadKeystore(json, password, { onProgress: progressFn });

      // Assert
      expect(progressFn).toHaveBeenCalled();
    }, 30000);
  });

  describe("isValidKeystore", () => {
    it("should return true for valid keystore JSON", async () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);
      const json = await saveKeystore(wallet, "password", {
        scrypt: { N: 1024, r: 8, p: 1 },
      });

      // Act & Assert
      expect(isValidKeystore(json)).toBe(true);
    }, 30000);

    it("should return false for invalid JSON", () => {
      expect(isValidKeystore("not json")).toBe(false);
    });

    it("should return false for non-keystore JSON", () => {
      expect(isValidKeystore(JSON.stringify({ foo: "bar" }))).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidKeystore("")).toBe(false);
    });
  });

  describe("getKeystoreAddress", () => {
    it("should extract address from valid keystore", async () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);
      const json = await saveKeystore(wallet, "password", {
        scrypt: { N: 1024, r: 8, p: 1 },
      });

      // Act
      const address = getKeystoreAddress(json);

      // Assert
      expect(address).toBe(TEST_ADDRESS);
    }, 30000);

    it("should throw WalletError for invalid JSON", () => {
      expect(() => getKeystoreAddress("not json")).toThrow(PodWalletError);
    });

    it("should throw WalletError for missing address", () => {
      const noAddress = JSON.stringify({ version: 3, crypto: {} });
      expect(() => getKeystoreAddress(noAddress)).toThrow(PodWalletError);
    });

    it("should handle address with 0x prefix", () => {
      // Arrange - some keystores may have 0x prefix
      const json = JSON.stringify({
        version: 3,
        address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        crypto: {},
      });

      // Act
      const address = getKeystoreAddress(json);

      // Assert
      expect(address).toBe(TEST_ADDRESS);
    });

    it("should handle address without 0x prefix", () => {
      // Arrange - standard format without prefix
      const json = JSON.stringify({
        version: 3,
        address: "f39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        crypto: {},
      });

      // Act
      const address = getKeystoreAddress(json);

      // Assert
      expect(address).toBe(TEST_ADDRESS);
    });
  });

  describe("round-trip tests", () => {
    it("should fully recreate wallet after encrypt/decrypt", async () => {
      // Arrange
      const original = Wallet.generate();
      const password = "secure-password-123";

      // Act
      const encrypted = await saveKeystore(original, password, {
        scrypt: { N: 1024, r: 8, p: 1 },
      });
      const decrypted = await loadKeystore(encrypted, password);
      const restored = Wallet.fromPrivateKey(decrypted.privateKey);

      // Assert
      expect(restored.address).toBe(original.address);
      expect(restored.privateKeyHex()).toBe(original.privateKeyHex());
    }, 30000);

    it("should produce different ciphertext for same wallet", async () => {
      // Arrange - encryption should use random IV
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);
      const password = "password";

      // Act
      const json1 = await saveKeystore(wallet, password, {
        scrypt: { N: 1024, r: 8, p: 1 },
      });
      const json2 = await saveKeystore(wallet, password, {
        scrypt: { N: 1024, r: 8, p: 1 },
      });

      // Assert
      // ethers v6 uses "Crypto" (capital C) for the crypto field
      const parsed1 = JSON.parse(json1) as {
        Crypto?: { ciphertext: string };
        crypto?: { ciphertext: string };
      };
      const parsed2 = JSON.parse(json2) as {
        Crypto?: { ciphertext: string };
        crypto?: { ciphertext: string };
      };
      const crypto1 = parsed1.Crypto ?? parsed1.crypto;
      const crypto2 = parsed2.Crypto ?? parsed2.crypto;
      expect(crypto1?.ciphertext).not.toBe(crypto2?.ciphertext);
    }, 30000);
  });
});
