/**
 * @module mnemonic
 * @description BIP-39 mnemonic phrase generation and validation
 */

import { Mnemonic as EthersMnemonic, HDNodeWallet } from "ethers";
import { PodWalletError } from "@podnetwork/core";

/**
 * Valid word counts for BIP-39 mnemonics.
 */
export type MnemonicWordCount = 12 | 24;

/**
 * Default BIP-44 derivation path for Ethereum-compatible chains.
 *
 * Format: m/44'/60'/0'/0/{index}
 * - 44' = BIP-44 purpose
 * - 60' = Ethereum coin type
 * - 0' = First account
 * - 0 = External chain
 * - {index} = Address index
 */
export const DEFAULT_DERIVATION_PATH = "m/44'/60'/0'/0";

/**
 * BIP-39 mnemonic phrase for HD wallet derivation.
 *
 * A mnemonic is a human-readable representation of wallet entropy.
 * It can be used to derive multiple wallet addresses deterministically.
 *
 * **Security Warning**: Mnemonics should be stored securely and never
 * shared. Anyone with access to the mnemonic can derive all associated
 * private keys.
 *
 * @example
 * ```typescript
 * // Generate a new 12-word mnemonic
 * const mnemonic = Mnemonic.generate();
 * console.log(mnemonic.phrase()); // "abandon ability able ..."
 *
 * // Or a 24-word mnemonic for higher security
 * const mnemonic24 = Mnemonic.generate(24);
 *
 * // Import an existing mnemonic
 * const imported = Mnemonic.fromPhrase('abandon abandon abandon ...');
 *
 * // Use with Wallet
 * const wallet = Wallet.fromMnemonic(mnemonic, 0);
 * ```
 */
export class Mnemonic {
  /** The underlying ethers.js Mnemonic instance */
  private readonly _mnemonic: EthersMnemonic;

  /**
   * Private constructor - use static factory methods instead.
   */
  private constructor(mnemonic: EthersMnemonic) {
    this._mnemonic = mnemonic;
  }

  /**
   * Generate a new random mnemonic phrase.
   *
   * Uses cryptographically secure random number generation.
   *
   * @param wordCount - Number of words (12 or 24). Default is 12.
   * @returns A new Mnemonic instance
   * @throws {WalletError} If generation fails
   *
   * @example
   * ```typescript
   * // Generate 12-word mnemonic (128 bits of entropy)
   * const mnemonic12 = Mnemonic.generate();
   *
   * // Generate 24-word mnemonic (256 bits of entropy)
   * const mnemonic24 = Mnemonic.generate(24);
   *
   * console.log(mnemonic12.wordCount()); // 12
   * ```
   */
  static generate(wordCount: MnemonicWordCount = 12): Mnemonic {
    try {
      // Convert word count to entropy bits
      // 12 words = 128 bits, 24 words = 256 bits
      const entropyBits = wordCount === 12 ? 128 : 256;

      // Generate random entropy
      const entropy = new Uint8Array(entropyBits / 8);
      crypto.getRandomValues(entropy);

      // Create mnemonic from entropy
      const mnemonic = EthersMnemonic.fromEntropy(entropy);

      return new Mnemonic(mnemonic);
    } catch (error) {
      throw PodWalletError.invalidMnemonic(
        `Failed to generate mnemonic: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create a Mnemonic from an existing phrase.
   *
   * Validates the phrase against the BIP-39 wordlist and checksum.
   *
   * @param phrase - Space-separated mnemonic words
   * @returns A Mnemonic instance
   * @throws {WalletError} If the phrase is invalid
   *
   * @example
   * ```typescript
   * const mnemonic = Mnemonic.fromPhrase(
   *   'abandon abandon abandon abandon abandon abandon ' +
   *   'abandon abandon abandon abandon abandon about'
   * );
   *
   * // Derive first wallet
   * const wallet = Wallet.fromMnemonic(mnemonic, 0);
   * ```
   */
  static fromPhrase(phrase: string): Mnemonic {
    try {
      // Normalize whitespace
      const normalized = phrase.trim().replace(/\s+/g, " ");

      // Validate word count
      const words = normalized.split(" ");
      if (words.length !== 12 && words.length !== 24) {
        throw PodWalletError.invalidMnemonic(
          `Invalid word count: expected 12 or 24, got ${String(words.length)}`
        );
      }

      // Create and validate mnemonic
      const mnemonic = EthersMnemonic.fromPhrase(normalized);

      return new Mnemonic(mnemonic);
    } catch (error) {
      if (error instanceof PodWalletError) {
        throw error;
      }
      throw PodWalletError.invalidMnemonic(
        error instanceof Error ? error.message : "Invalid mnemonic phrase"
      );
    }
  }

  /**
   * Check if a phrase is a valid BIP-39 mnemonic.
   *
   * @param phrase - The phrase to validate
   * @returns True if the phrase is a valid mnemonic
   *
   * @example
   * ```typescript
   * const valid = Mnemonic.isValid('abandon abandon abandon ...');
   * console.log(valid); // true or false
   * ```
   */
  static isValid(phrase: string): boolean {
    try {
      const normalized = phrase.trim().replace(/\s+/g, " ");
      EthersMnemonic.fromPhrase(normalized);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the mnemonic phrase as a space-separated string.
   *
   * **Security Warning**: Be careful when displaying or logging this value.
   *
   * @returns The mnemonic phrase
   *
   * @example
   * ```typescript
   * const mnemonic = Mnemonic.generate();
   * const phrase = mnemonic.phrase();
   * // Store securely - never log in production!
   * ```
   */
  phrase(): string {
    return this._mnemonic.phrase;
  }

  /**
   * Get the number of words in the mnemonic.
   *
   * @returns 12 or 24
   *
   * @example
   * ```typescript
   * const mnemonic = Mnemonic.generate(24);
   * console.log(mnemonic.wordCount()); // 24
   * ```
   */
  wordCount(): MnemonicWordCount {
    const count = this._mnemonic.phrase.split(" ").length;
    return count === 24 ? 24 : 12;
  }

  /**
   * Derive an HD wallet at the given index.
   *
   * Uses the default Ethereum derivation path: m/44'/60'/0'/0/{index}
   *
   * @param index - The address index (0, 1, 2, ...)
   * @returns The derived HD wallet
   * @throws {WalletError} If derivation fails
   * @internal
   */
  deriveWallet(index: number): HDNodeWallet {
    if (index < 0 || !Number.isInteger(index)) {
      throw PodWalletError.derivationError(
        `${DEFAULT_DERIVATION_PATH}/${String(index)}`,
        new Error("Index must be a non-negative integer")
      );
    }

    try {
      const path = `${DEFAULT_DERIVATION_PATH}/${String(index)}`;
      return HDNodeWallet.fromMnemonic(this._mnemonic, path);
    } catch (error) {
      throw PodWalletError.derivationError(
        `${DEFAULT_DERIVATION_PATH}/${String(index)}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get the underlying ethers.js Mnemonic for advanced usage.
   *
   * @returns The ethers.js Mnemonic instance
   * @internal
   */
  toEthers(): EthersMnemonic {
    return this._mnemonic;
  }
}
