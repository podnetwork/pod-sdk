// Unit tests for Wallet class

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Wallet } from "../../src/wallet.js";
import { Mnemonic } from "../../src/mnemonic.js";
import { resetBrowserWarning } from "../../src/browser-warning.js";
import { PodWalletError, parsePod } from "@podnetwork/core";
import { verifyMessage } from "ethers";

// Known test private key
const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const TEST_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

// Test mnemonic
const TEST_MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

describe("Wallet", () => {
  beforeEach(() => {
    resetBrowserWarning();
    vi.spyOn(console, "warn").mockImplementation((): void => {
      // Suppress browser warnings in tests
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generate", () => {
    it("should generate a random wallet", () => {
      // Act
      const wallet = Wallet.generate();

      // Assert
      expect(wallet.address).toBeDefined();
      expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it("should generate unique wallets", () => {
      // Act
      const wallet1 = Wallet.generate();
      const wallet2 = Wallet.generate();

      // Assert
      expect(wallet1.address).not.toBe(wallet2.address);
    });

    it("should have a 32-byte private key", () => {
      // Act
      const wallet = Wallet.generate();
      const keyBytes = wallet.privateKeyBytes();

      // Assert
      expect(keyBytes).toHaveLength(32);
    });
  });

  describe("fromPrivateKey", () => {
    it("should create wallet from valid private key with 0x prefix", () => {
      // Act
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);

      // Assert
      expect(wallet.address).toBe(TEST_ADDRESS);
    });

    it("should create wallet from valid private key without 0x prefix", () => {
      // Arrange
      const keyWithoutPrefix = TEST_PRIVATE_KEY.slice(2);

      // Act
      const wallet = Wallet.fromPrivateKey(keyWithoutPrefix);

      // Assert
      expect(wallet.address).toBe(TEST_ADDRESS);
    });

    it("should throw WalletError for invalid key length", () => {
      // Arrange
      const shortKey = "0x1234";

      // Act & Assert
      expect(() => Wallet.fromPrivateKey(shortKey)).toThrow(PodWalletError);
    });

    it("should throw WalletError for invalid hex characters", () => {
      // Arrange
      const invalidHex = "0xgg0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

      // Act & Assert
      expect(() => Wallet.fromPrivateKey(invalidHex)).toThrow(PodWalletError);
    });
  });

  describe("fromBytes", () => {
    it("should create wallet from 32-byte Uint8Array", () => {
      // Arrange
      const bytes = new Uint8Array(32);
      bytes.fill(0x01);

      // Act
      const wallet = Wallet.fromBytes(bytes);

      // Assert
      expect(wallet.address).toBeDefined();
      expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it("should throw WalletError for wrong byte length", () => {
      // Arrange
      const shortBytes = new Uint8Array(16);

      // Act & Assert
      expect(() => Wallet.fromBytes(shortBytes)).toThrow(PodWalletError);
      expect(() => Wallet.fromBytes(shortBytes)).toThrow(/Expected 32 bytes/);
    });
  });

  describe("fromMnemonic", () => {
    it("should derive wallet from mnemonic at index 0", () => {
      // Arrange
      const mnemonic = Mnemonic.fromPhrase(TEST_MNEMONIC);

      // Act
      const wallet = Wallet.fromMnemonic(mnemonic, 0);

      // Assert
      expect(wallet.address.toLowerCase()).toBe("0x9858effd232b4033e47d90003d41ec34ecaeda94");
    });

    it("should derive different wallets for different indices", () => {
      // Arrange
      const mnemonic = Mnemonic.fromPhrase(TEST_MNEMONIC);

      // Act
      const wallet0 = Wallet.fromMnemonic(mnemonic, 0);
      const wallet1 = Wallet.fromMnemonic(mnemonic, 1);

      // Assert
      expect(wallet0.address).not.toBe(wallet1.address);
    });

    it("should default to index 0", () => {
      // Arrange
      const mnemonic = Mnemonic.fromPhrase(TEST_MNEMONIC);

      // Act
      const walletDefault = Wallet.fromMnemonic(mnemonic);
      const wallet0 = Wallet.fromMnemonic(mnemonic, 0);

      // Assert
      expect(walletDefault.address).toBe(wallet0.address);
    });
  });

  describe("address property", () => {
    it("should return checksummed address", () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);

      // Assert - address should be checksummed
      expect(wallet.address).toBe(TEST_ADDRESS);
      // Check that it's not all lowercase
      expect(wallet.address).not.toBe(wallet.address.toLowerCase());
    });
  });

  describe("getAddress", () => {
    it("should return the same address as the property", async () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);

      // Act
      const asyncAddress = await wallet.getAddress();

      // Assert
      expect(asyncAddress).toBe(wallet.address);
    });
  });

  describe("signMessage", () => {
    it("should sign a string message", async () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);
      const message = "Hello, Pod Network!";

      // Act
      const signature = await wallet.signMessage(message);

      // Assert
      expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
    });

    it("should produce verifiable signatures", async () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);
      const message = "Test message";

      // Act
      const signature = await wallet.signMessage(message);
      const recoveredAddress = verifyMessage(message, signature);

      // Assert
      expect(recoveredAddress).toBe(wallet.address);
    });

    it("should sign Uint8Array messages", async () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);
      const message = new Uint8Array([1, 2, 3, 4, 5]);

      // Act
      const signature = await wallet.signMessage(message);

      // Assert
      expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
    });
  });

  describe("signTransaction", () => {
    it("should sign a simple transfer transaction", async () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);
      const tx = {
        to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}` & {
          readonly [Symbol.species]: true;
        },
        value: parsePod("1.0"),
        nonce: 0n,
        gas: 21000n,
        maxFeePerGas: 10_000_000_000n, // 10 gwei
        maxPriorityFeePerGas: 1_000_000_000n, // 1 gwei
      };

      // Act
      const signedTx = await wallet.signTransaction(tx, 1293n);

      // Assert
      expect(signedTx).toMatch(/^0x/);
      expect(signedTx.length).toBeGreaterThan(100);
    });

    it("should sign a legacy transaction", async () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);
      const tx = {
        to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}` & {
          readonly [Symbol.species]: true;
        },
        value: parsePod("1.0"),
        nonce: 0n,
        gas: 21000n,
        gasPrice: 10_000_000_000n,
      };

      // Act
      const signedTx = await wallet.signTransaction(tx, 1293n);

      // Assert
      expect(signedTx).toMatch(/^0x/);
    });

    it("should produce different signatures for different chain IDs", async () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);
      const tx = {
        to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}` & {
          readonly [Symbol.species]: true;
        },
        value: parsePod("1.0"),
        nonce: 0n,
        gas: 21000n,
        maxFeePerGas: 10_000_000_000n,
        maxPriorityFeePerGas: 1_000_000_000n,
      };

      // Act
      const signedTx1 = await wallet.signTransaction(tx, 1n);
      const signedTx2 = await wallet.signTransaction(tx, 1293n);

      // Assert - EIP-155 replay protection means different chain IDs produce different signatures
      expect(signedTx1).not.toBe(signedTx2);
    });
  });

  describe("privateKeyHex", () => {
    it("should return the private key as hex", () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);

      // Act
      const key = wallet.privateKeyHex();

      // Assert
      expect(key).toBe(TEST_PRIVATE_KEY);
    });

    it("should return a 66-character hex string (0x + 64)", () => {
      // Arrange
      const wallet = Wallet.generate();

      // Act
      const key = wallet.privateKeyHex();

      // Assert
      expect(key).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe("privateKeyBytes", () => {
    it("should return 32 bytes", () => {
      // Arrange
      const wallet = Wallet.generate();

      // Act
      const bytes = wallet.privateKeyBytes();

      // Assert
      expect(bytes).toHaveLength(32);
      expect(bytes).toBeInstanceOf(Uint8Array);
    });

    it("should match the hex representation", () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);

      // Act
      const bytes = wallet.privateKeyBytes();
      const hex = wallet.privateKeyHex();

      // Assert - convert bytes back to hex and compare
      const bytesAsHex =
        "0x" +
        Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      expect(bytesAsHex).toBe(hex);
    });
  });

  describe("round-trip tests", () => {
    it("should recreate wallet from exported private key", () => {
      // Arrange
      const original = Wallet.generate();
      const exportedKey = original.privateKeyHex();

      // Act
      const restored = Wallet.fromPrivateKey(exportedKey);

      // Assert
      expect(restored.address).toBe(original.address);
    });

    it("should recreate wallet from exported bytes", () => {
      // Arrange
      const original = Wallet.generate();
      const exportedBytes = original.privateKeyBytes();

      // Act
      const restored = Wallet.fromBytes(exportedBytes);

      // Assert
      expect(restored.address).toBe(original.address);
    });
  });

  describe("toEthers", () => {
    it("should return an ethers-compatible wallet", () => {
      // Arrange
      const wallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);

      // Act
      const ethersWallet = wallet.toEthers();

      // Assert
      expect(ethersWallet.address).toBe(wallet.address);
      expect(ethersWallet.privateKey).toBe(wallet.privateKeyHex());
    });
  });
});
