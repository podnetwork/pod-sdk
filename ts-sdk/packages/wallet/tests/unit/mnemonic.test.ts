// Unit tests for Mnemonic class

import { describe, it, expect, beforeEach } from "vitest";
import { Mnemonic, DEFAULT_DERIVATION_PATH } from "../../src/mnemonic.js";
import { PodWalletError } from "@podnetwork/core";

describe("Mnemonic", () => {
  describe("generate", () => {
    it("should generate a valid 12-word mnemonic by default", () => {
      // Arrange & Act
      const mnemonic = Mnemonic.generate();

      // Assert
      expect(mnemonic.wordCount()).toBe(12);
      expect(mnemonic.phrase().split(" ")).toHaveLength(12);
    });

    it("should generate a valid 24-word mnemonic when specified", () => {
      // Arrange & Act
      const mnemonic = Mnemonic.generate(24);

      // Assert
      expect(mnemonic.wordCount()).toBe(24);
      expect(mnemonic.phrase().split(" ")).toHaveLength(24);
    });

    it("should generate unique mnemonics", () => {
      // Arrange & Act
      const mnemonic1 = Mnemonic.generate();
      const mnemonic2 = Mnemonic.generate();

      // Assert
      expect(mnemonic1.phrase()).not.toBe(mnemonic2.phrase());
    });
  });

  describe("fromPhrase", () => {
    // Standard test mnemonic from BIP-39
    const VALID_12_WORDS =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

    it("should parse a valid 12-word mnemonic", () => {
      // Arrange & Act
      const mnemonic = Mnemonic.fromPhrase(VALID_12_WORDS);

      // Assert
      expect(mnemonic.wordCount()).toBe(12);
      expect(mnemonic.phrase()).toBe(VALID_12_WORDS);
    });

    it("should normalize whitespace in mnemonic", () => {
      // Arrange
      const phraseWithExtraSpaces =
        "  abandon   abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about  ";

      // Act
      const mnemonic = Mnemonic.fromPhrase(phraseWithExtraSpaces);

      // Assert
      expect(mnemonic.phrase()).toBe(VALID_12_WORDS);
    });

    it("should throw WalletError for invalid word count", () => {
      // Arrange
      const invalidPhrase = "abandon abandon abandon";

      // Act & Assert
      expect(() => Mnemonic.fromPhrase(invalidPhrase)).toThrow(PodWalletError);
      expect(() => Mnemonic.fromPhrase(invalidPhrase)).toThrow(/Invalid word count/);
    });

    it("should throw WalletError for invalid checksum", () => {
      // Arrange - valid words but invalid checksum
      const invalidChecksum =
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon";

      // Act & Assert
      expect(() => Mnemonic.fromPhrase(invalidChecksum)).toThrow(PodWalletError);
    });

    it("should throw WalletError for invalid words", () => {
      // Arrange
      const invalidWords =
        "invalid notaword abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

      // Act & Assert
      expect(() => Mnemonic.fromPhrase(invalidWords)).toThrow(PodWalletError);
    });
  });

  describe("isValid", () => {
    const VALID_12_WORDS =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

    it("should return true for valid mnemonic", () => {
      expect(Mnemonic.isValid(VALID_12_WORDS)).toBe(true);
    });

    it("should return false for invalid mnemonic", () => {
      expect(Mnemonic.isValid("not a valid mnemonic")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(Mnemonic.isValid("")).toBe(false);
    });

    it("should return false for invalid checksum", () => {
      const invalidChecksum =
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon";
      expect(Mnemonic.isValid(invalidChecksum)).toBe(false);
    });
  });

  describe("deriveWallet", () => {
    let mnemonic: Mnemonic;

    beforeEach(() => {
      mnemonic = Mnemonic.fromPhrase(
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
      );
    });

    it("should derive wallet at index 0", () => {
      // Act
      const wallet = mnemonic.deriveWallet(0);

      // Assert
      expect(wallet.address).toBeDefined();
      expect(wallet.privateKey).toBeDefined();
    });

    it("should derive different wallets for different indices", () => {
      // Arrange & Act
      const wallet0 = mnemonic.deriveWallet(0);
      const wallet1 = mnemonic.deriveWallet(1);
      const wallet2 = mnemonic.deriveWallet(2);

      // Assert
      expect(wallet0.address).not.toBe(wallet1.address);
      expect(wallet1.address).not.toBe(wallet2.address);
      expect(wallet0.address).not.toBe(wallet2.address);
    });

    it("should derive the same wallet for the same index", () => {
      // Arrange & Act
      const wallet1 = mnemonic.deriveWallet(0);
      const wallet2 = mnemonic.deriveWallet(0);

      // Assert
      expect(wallet1.address).toBe(wallet2.address);
      expect(wallet1.privateKey).toBe(wallet2.privateKey);
    });

    it("should throw WalletError for negative index", () => {
      // Act & Assert
      expect(() => mnemonic.deriveWallet(-1)).toThrow(PodWalletError);
    });

    it("should throw WalletError for non-integer index", () => {
      // Act & Assert
      expect(() => mnemonic.deriveWallet(1.5)).toThrow(PodWalletError);
    });

    it("should derive a known address for test mnemonic", () => {
      // The standard test mnemonic should derive to a known address
      // This tests compatibility with other implementations
      const wallet = mnemonic.deriveWallet(0);

      // Standard address for "abandon..." mnemonic at m/44'/60'/0'/0/0
      expect(wallet.address.toLowerCase()).toBe("0x9858effd232b4033e47d90003d41ec34ecaeda94");
    });
  });

  describe("DEFAULT_DERIVATION_PATH", () => {
    it("should be the standard Ethereum derivation path", () => {
      expect(DEFAULT_DERIVATION_PATH).toBe("m/44'/60'/0'/0");
    });
  });
});
