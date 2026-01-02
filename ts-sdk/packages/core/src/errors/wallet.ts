/**
 * @module errors/wallet
 * @description Wallet-related errors (keys, signing, browser wallet)
 */

import { ERROR_CODE_METADATA, type PodErrorCategory, POD_ERRORS } from "./codes.js";
import { PodError, type PodErrorJson, type PodErrorOptions } from "./pod-error.js";

/**
 * Wallet error codes (4xxx range).
 */
export type PodWalletErrorCode =
  | typeof POD_ERRORS.WALLET_INVALID_KEY
  | typeof POD_ERRORS.WALLET_INVALID_MNEMONIC
  | typeof POD_ERRORS.WALLET_DERIVATION_ERROR
  | typeof POD_ERRORS.WALLET_KEYSTORE_ERROR
  | typeof POD_ERRORS.WALLET_INVALID_PASSWORD
  | typeof POD_ERRORS.WALLET_SIGNING_FAILED
  | typeof POD_ERRORS.WALLET_NOT_CONNECTED
  | typeof POD_ERRORS.WALLET_CHAIN_MISMATCH
  | typeof POD_ERRORS.WALLET_USER_REJECTED;

/**
 * Wallet-related errors.
 *
 * These errors occur when there are issues with wallet operations,
 * such as key management, signing, and browser wallet interactions.
 * Wallet errors are generally not retryable as they require user intervention.
 *
 * @example
 * ```typescript
 * import { PodWalletError } from '@podnetwork/core';
 *
 * try {
 *   const wallet = await Wallet.fromMnemonic('invalid words');
 * } catch (error) {
 *   if (error instanceof PodWalletError) {
 *     console.log(error.code);     // "POD_4002"
 *     console.log(error.suggestion); // "The mnemonic phrase is invalid..."
 *   }
 * }
 * ```
 */
export class PodWalletError extends PodError {
  readonly code: PodWalletErrorCode;
  readonly isRetryable = false;
  override readonly category: PodErrorCategory = "WALLET";

  /** Expected chain ID, for chain mismatch errors */
  readonly expectedChainId?: bigint;

  /** Actual chain ID, for chain mismatch errors */
  readonly actualChainId?: bigint;

  /** Derivation path, for derivation errors */
  readonly derivationPath?: string;

  private constructor(
    message: string,
    code: PodWalletErrorCode,
    options?: PodErrorOptions & {
      expectedChainId?: bigint;
      actualChainId?: bigint;
      derivationPath?: string;
    }
  ) {
    const metadata = ERROR_CODE_METADATA[code];
    super(message, {
      ...options,
      severity: options?.severity ?? metadata.severity,
      suggestion: options?.suggestion ?? metadata.suggestion,
    });
    this.code = code;
    if (options?.expectedChainId !== undefined) this.expectedChainId = options.expectedChainId;
    if (options?.actualChainId !== undefined) this.actualChainId = options.actualChainId;
    if (options?.derivationPath !== undefined) this.derivationPath = options.derivationPath;
  }

  /**
   * Create an invalid key error.
   *
   * @param reason - The reason the key is invalid
   * @returns A new PodWalletError
   *
   * @example
   * ```typescript
   * throw PodWalletError.invalidKey('Key must be 32 bytes');
   * ```
   */
  static invalidKey(reason?: string): PodWalletError {
    const message =
      reason !== undefined && reason !== ""
        ? `Invalid private key: ${reason}`
        : "Invalid private key format";
    return new PodWalletError(message, POD_ERRORS.WALLET_INVALID_KEY);
  }

  /**
   * Create an invalid mnemonic error.
   *
   * @param reason - The reason the mnemonic is invalid
   * @returns A new PodWalletError
   *
   * @example
   * ```typescript
   * throw PodWalletError.invalidMnemonic('Must be 12 or 24 words');
   * ```
   */
  static invalidMnemonic(reason?: string): PodWalletError {
    const message =
      reason !== undefined && reason !== ""
        ? `Invalid mnemonic: ${reason}`
        : "Invalid mnemonic phrase";
    return new PodWalletError(message, POD_ERRORS.WALLET_INVALID_MNEMONIC);
  }

  /**
   * Create a derivation error.
   *
   * @param path - The derivation path that failed
   * @param cause - The original error, if any
   * @returns A new PodWalletError
   *
   * @example
   * ```typescript
   * throw PodWalletError.derivationError("m/44'/60'/0'/0/0");
   * ```
   */
  static derivationError(path: string, cause?: Error): PodWalletError {
    const opts: PodErrorOptions & { derivationPath: string } = { derivationPath: path };
    if (cause !== undefined) opts.cause = cause;
    return new PodWalletError(
      `HD wallet derivation failed for path: ${path}`,
      POD_ERRORS.WALLET_DERIVATION_ERROR,
      opts
    );
  }

  /**
   * Create a keystore error.
   *
   * @param reason - The reason the keystore operation failed
   * @param cause - The original error, if any
   * @returns A new PodWalletError
   *
   * @example
   * ```typescript
   * throw PodWalletError.keystoreError('Failed to decrypt keystore');
   * ```
   */
  static keystoreError(reason: string, cause?: Error): PodWalletError {
    return new PodWalletError(
      `Keystore error: ${reason}`,
      POD_ERRORS.WALLET_KEYSTORE_ERROR,
      cause !== undefined ? { cause } : undefined
    );
  }

  /**
   * Create an invalid password error.
   *
   * @returns A new PodWalletError
   *
   * @example
   * ```typescript
   * throw PodWalletError.invalidPassword();
   * ```
   */
  static invalidPassword(): PodWalletError {
    return new PodWalletError("Invalid keystore password", POD_ERRORS.WALLET_INVALID_PASSWORD);
  }

  /**
   * Create a signing failed error.
   *
   * @param reason - The reason signing failed
   * @param cause - The original error, if any
   * @returns A new PodWalletError
   *
   * @example
   * ```typescript
   * throw PodWalletError.signingFailed('Transaction data invalid');
   * ```
   */
  static signingFailed(reason: string, cause?: Error): PodWalletError {
    return new PodWalletError(
      `Signing failed: ${reason}`,
      POD_ERRORS.WALLET_SIGNING_FAILED,
      cause !== undefined ? { cause } : undefined
    );
  }

  /**
   * Create a not connected error.
   *
   * @returns A new PodWalletError
   *
   * @example
   * ```typescript
   * throw PodWalletError.notConnected();
   * ```
   */
  static notConnected(): PodWalletError {
    return new PodWalletError("Browser wallet is not connected", POD_ERRORS.WALLET_NOT_CONNECTED);
  }

  /**
   * Create a chain mismatch error.
   *
   * @param expected - The expected chain ID
   * @param actual - The actual chain ID
   * @returns A new PodWalletError
   *
   * @example
   * ```typescript
   * throw PodWalletError.chainMismatch(1n, 5n);
   * ```
   */
  static chainMismatch(expected: bigint, actual: bigint): PodWalletError {
    return new PodWalletError(
      `Wallet is on chain ${String(actual)}, expected chain ${String(expected)}. Please switch networks in your wallet.`,
      POD_ERRORS.WALLET_CHAIN_MISMATCH,
      { expectedChainId: expected, actualChainId: actual }
    );
  }

  /**
   * Create a user rejected error.
   *
   * @returns A new PodWalletError
   *
   * @example
   * ```typescript
   * throw PodWalletError.userRejected();
   * ```
   */
  static userRejected(): PodWalletError {
    return new PodWalletError(
      "User rejected the request in their wallet",
      POD_ERRORS.WALLET_USER_REJECTED,
      { severity: "info" }
    );
  }

  override toJSON(): PodErrorJson {
    const json = super.toJSON() as Record<string, unknown>;
    if (this.expectedChainId !== undefined) json["expectedChainId"] = String(this.expectedChainId);
    if (this.actualChainId !== undefined) json["actualChainId"] = String(this.actualChainId);
    if (this.derivationPath !== undefined) json["derivationPath"] = this.derivationPath;
    return json as PodErrorJson;
  }
}
