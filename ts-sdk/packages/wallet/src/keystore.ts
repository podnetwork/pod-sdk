/**
 * @module keystore
 * @description Web3 Secret Storage Definition (V3) keystore support
 */

import {
  encryptKeystoreJson,
  decryptKeystoreJson,
  isKeystoreJson,
  type EncryptOptions,
  type ProgressCallback,
} from "ethers";
import { PodWalletError, type Address, toAddress } from "@podnetwork/core";
import type { Wallet } from "./wallet.js";

/**
 * Web3 Secret Storage Definition V3 keystore format.
 *
 * This is the standard Ethereum keystore format compatible with
 * geth, MetaMask, and other Ethereum wallets.
 */
export interface KeystoreV3 {
  /** Keystore version (always 3) */
  readonly version: 3;
  /** Unique identifier for this keystore */
  readonly id: string;
  /** Account address (without 0x prefix in standard format) */
  readonly address: string;
  /** Encrypted data and key derivation parameters */
  readonly crypto: {
    readonly cipher: string;
    readonly ciphertext: string;
    readonly cipherparams: {
      readonly iv: string;
    };
    readonly kdf: string;
    readonly kdfparams: Record<string, unknown>;
    readonly mac: string;
  };
}

/**
 * Options for keystore encryption.
 */
export interface KeystoreOptions {
  /**
   * Progress callback for the encryption process.
   * Useful for showing progress to users during the slow scrypt computation.
   */
  onProgress?: ProgressCallback;

  /**
   * Scrypt parameters. Higher values are more secure but slower.
   * Default is N=131072, r=8, p=1 (ethers default).
   */
  scrypt?: {
    N?: number;
    r?: number;
    p?: number;
  };
}

/**
 * Save a wallet to encrypted keystore JSON.
 *
 * Uses the Web3 Secret Storage Definition V3 format with scrypt
 * key derivation for password-based encryption.
 *
 * @param wallet - The wallet to encrypt
 * @param password - The password for encryption
 * @param options - Optional encryption options
 * @returns The encrypted keystore as a JSON string
 * @throws {WalletError} If encryption fails
 *
 * @example
 * ```typescript
 * import { Wallet, saveKeystore } from '@podnetwork/wallet';
 *
 * const wallet = Wallet.generate();
 *
 * // Encrypt with progress callback
 * const keystore = await saveKeystore(wallet, 'my-secure-password', {
 *   onProgress: (percent) => console.log(`Encrypting: ${percent * 100}%`),
 * });
 *
 * // Save to file (Node.js)
 * import { writeFile } from 'fs/promises';
 * await writeFile(`${wallet.address}.json`, keystore);
 * ```
 */
export async function saveKeystore(
  wallet: Wallet,
  password: string,
  options?: KeystoreOptions
): Promise<string> {
  if (password === "") {
    throw PodWalletError.keystoreError("Password cannot be empty");
  }

  try {
    const ethersWallet = wallet.toEthers();

    // Build encrypt options
    const encryptOptions: EncryptOptions = {};

    if (options?.onProgress != null) {
      encryptOptions.progressCallback = options.onProgress;
    }

    if (options?.scrypt != null) {
      encryptOptions.scrypt = options.scrypt;
    }

    // Encrypt the wallet
    const json = await encryptKeystoreJson(
      { address: ethersWallet.address, privateKey: ethersWallet.privateKey },
      password,
      encryptOptions
    );

    return json;
  } catch (error) {
    if (error instanceof PodWalletError) {
      throw error;
    }
    throw PodWalletError.keystoreError(
      error instanceof Error ? error.message : "Failed to encrypt keystore",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Load a wallet from encrypted keystore JSON.
 *
 * @param json - The keystore JSON string
 * @param password - The decryption password
 * @param onProgress - Optional progress callback
 * @returns A promise that resolves to wallet data
 * @throws {WalletError} If decryption fails or password is wrong
 *
 * @example
 * ```typescript
 * import { loadKeystore, Wallet } from '@podnetwork/wallet';
 *
 * // Load from file (Node.js)
 * import { readFile } from 'fs/promises';
 * const json = await readFile('my-wallet.json', 'utf8');
 *
 * // Decrypt with progress callback
 * const { address, privateKey } = await loadKeystore(json, 'my-password', {
 *   onProgress: (percent) => console.log(`Decrypting: ${percent * 100}%`),
 * });
 *
 * // Create wallet from decrypted key
 * const wallet = Wallet.fromPrivateKey(privateKey);
 * ```
 */
export async function loadKeystore(
  json: string,
  password: string,
  options?: { onProgress?: ProgressCallback }
): Promise<{ address: Address; privateKey: `0x${string}` }> {
  if (password === "") {
    throw PodWalletError.keystoreError("Password cannot be empty");
  }

  // Validate JSON format
  try {
    JSON.parse(json);
  } catch {
    throw PodWalletError.keystoreError("Invalid keystore JSON");
  }

  // Validate keystore structure
  if (!isKeystoreJson(json)) {
    throw PodWalletError.keystoreError("Invalid keystore format");
  }

  try {
    // Decrypt the keystore
    const account = await decryptKeystoreJson(json, password, options?.onProgress);

    return {
      address: toAddress(account.address),
      privateKey: account.privateKey as `0x${string}`,
    };
  } catch (error) {
    // Check for wrong password
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : "";
    if (
      errorMessage.includes("invalid password") ||
      errorMessage.includes("bad mac") ||
      errorMessage.includes("decryption failed")
    ) {
      throw PodWalletError.invalidPassword();
    }

    throw PodWalletError.keystoreError(
      error instanceof Error ? error.message : "Failed to decrypt keystore",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Check if a string is valid keystore JSON.
 *
 * @param json - The string to check
 * @returns True if the string is valid keystore JSON
 *
 * @example
 * ```typescript
 * import { isValidKeystore } from '@podnetwork/wallet';
 *
 * const valid = isValidKeystore(jsonString);
 * if (valid) {
 *   // Safe to call loadKeystore
 * }
 * ```
 */
export function isValidKeystore(json: string): boolean {
  try {
    return isKeystoreJson(json);
  } catch {
    return false;
  }
}

/**
 * Extract the address from a keystore without decrypting.
 *
 * @param json - The keystore JSON string
 * @returns The wallet address
 * @throws {WalletError} If the keystore is invalid
 *
 * @example
 * ```typescript
 * import { getKeystoreAddress } from '@podnetwork/wallet';
 *
 * const address = getKeystoreAddress(keystoreJson);
 * console.log(`Wallet address: ${address}`);
 * ```
 */
export function getKeystoreAddress(json: string): Address {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw PodWalletError.keystoreError("Invalid keystore JSON");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("address" in parsed) ||
    typeof (parsed as { address?: unknown }).address !== "string"
  ) {
    throw PodWalletError.keystoreError("Keystore missing address field");
  }

  const addressStr = (parsed as { address: string }).address;

  // Address in keystore may or may not have 0x prefix
  const normalized = addressStr.startsWith("0x") ? addressStr : `0x${addressStr}`;

  try {
    return toAddress(normalized);
  } catch {
    throw PodWalletError.keystoreError("Invalid address in keystore");
  }
}
