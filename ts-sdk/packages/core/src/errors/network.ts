/**
 * @module errors/network
 * @description Network-related errors (connection, timeout, DNS)
 */

import { ERROR_CODE_METADATA, type PodErrorCategory, POD_ERRORS } from "./codes.js";
import { PodError, type PodErrorJson, type PodErrorOptions } from "./pod-error.js";

/**
 * Network error codes (1xxx range).
 */
export type PodNetworkErrorCode =
  | typeof POD_ERRORS.NETWORK_CONNECTION_FAILED
  | typeof POD_ERRORS.NETWORK_TIMEOUT
  | typeof POD_ERRORS.NETWORK_CONNECTION_RESET
  | typeof POD_ERRORS.NETWORK_DNS_FAILURE;

/**
 * Network-related errors.
 *
 * These errors occur when there are issues connecting to the network,
 * such as connection failures, timeouts, and DNS resolution problems.
 * All network errors are retryable.
 *
 * @example
 * ```typescript
 * import { PodNetworkError } from '@podnetwork/core';
 *
 * try {
 *   await client.rpc.call('eth_blockNumber');
 * } catch (error) {
 *   if (error instanceof PodNetworkError) {
 *     console.log(error.code);     // "POD_1001"
 *     console.log(error.url);      // "https://rpc.pod.network"
 *     console.log(error.isRetryable); // true
 *   }
 * }
 * ```
 */
export class PodNetworkError extends PodError {
  readonly code: PodNetworkErrorCode;
  readonly isRetryable = true;
  override readonly category: PodErrorCategory = "NETWORK";

  /** The URL that failed */
  readonly url: string;

  /** HTTP status code, if available */
  readonly statusCode?: number;

  private constructor(
    message: string,
    code: PodNetworkErrorCode,
    url: string,
    statusCode?: number,
    options?: PodErrorOptions
  ) {
    const metadata = ERROR_CODE_METADATA[code];
    super(message, {
      ...options,
      severity: options?.severity ?? metadata.severity,
      suggestion: options?.suggestion ?? metadata.suggestion,
    });
    this.code = code;
    this.url = url;
    if (statusCode !== undefined) this.statusCode = statusCode;
  }

  /**
   * Create a connection failed error.
   *
   * @param url - The URL that failed to connect
   * @param cause - The original error, if any
   * @returns A new PodNetworkError
   *
   * @example
   * ```typescript
   * throw PodNetworkError.connectionFailed('https://rpc.pod.network');
   * ```
   */
  static connectionFailed(url: string, cause?: Error): PodNetworkError {
    return new PodNetworkError(
      `Failed to connect to ${url}`,
      POD_ERRORS.NETWORK_CONNECTION_FAILED,
      url,
      undefined,
      cause !== undefined ? { cause } : undefined
    );
  }

  /**
   * Create a timeout error.
   *
   * @param url - The URL that timed out
   * @param timeoutMs - The timeout duration in milliseconds
   * @returns A new PodNetworkError
   *
   * @example
   * ```typescript
   * throw PodNetworkError.timeout('https://rpc.pod.network', 30000);
   * ```
   */
  static timeout(url: string, timeoutMs: number): PodNetworkError {
    return new PodNetworkError(
      `Request to ${url} timed out after ${String(timeoutMs)}ms`,
      POD_ERRORS.NETWORK_TIMEOUT,
      url
    );
  }

  /**
   * Create a connection reset error.
   *
   * @param url - The URL whose connection was reset
   * @param cause - The original error, if any
   * @returns A new PodNetworkError
   *
   * @example
   * ```typescript
   * throw PodNetworkError.connectionReset('https://rpc.pod.network');
   * ```
   */
  static connectionReset(url: string, cause?: Error): PodNetworkError {
    return new PodNetworkError(
      `Connection to ${url} was reset`,
      POD_ERRORS.NETWORK_CONNECTION_RESET,
      url,
      undefined,
      cause !== undefined ? { cause } : undefined
    );
  }

  /**
   * Create a DNS failure error.
   *
   * @param url - The URL with DNS resolution failure
   * @param cause - The original error, if any
   * @returns A new PodNetworkError
   *
   * @example
   * ```typescript
   * throw PodNetworkError.dnsFailure('https://invalid.pod.network');
   * ```
   */
  static dnsFailure(url: string, cause?: Error): PodNetworkError {
    return new PodNetworkError(
      `DNS resolution failed for ${url}`,
      POD_ERRORS.NETWORK_DNS_FAILURE,
      url,
      undefined,
      cause !== undefined ? { cause } : undefined
    );
  }

  /**
   * Create a network error from an HTTP status code.
   *
   * @param url - The URL that returned the error
   * @param statusCode - The HTTP status code
   * @param statusText - The HTTP status text
   * @returns A new PodNetworkError
   */
  static fromHttpStatus(url: string, statusCode: number, statusText?: string): PodNetworkError {
    const text = statusText !== undefined && statusText !== "" ? `: ${statusText}` : "";
    return new PodNetworkError(
      `HTTP ${String(statusCode)}${text} from ${url}`,
      POD_ERRORS.NETWORK_CONNECTION_FAILED,
      url,
      statusCode
    );
  }

  override toJSON(): PodErrorJson {
    const json = super.toJSON() as Record<string, unknown>;
    json["url"] = this.url;
    if (this.statusCode !== undefined) json["statusCode"] = this.statusCode;
    return json as PodErrorJson;
  }
}
