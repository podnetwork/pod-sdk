/**
 * @module errors/execution
 * @description Execution-related errors (transaction, validation, RPC, WebSocket, contract)
 */

import type { Hash } from "../types/hash.js";
import { ERROR_CODE_METADATA, type PodErrorCategory, POD_ERRORS } from "./codes.js";
import { PodError, type PodErrorJson, type PodErrorOptions } from "./pod-error.js";

/**
 * Execution error codes (3xxx range).
 */
export type PodExecutionErrorCode =
  // Transaction errors (3001-3009)
  | typeof POD_ERRORS.TX_CONFIRMATION_TIMEOUT
  | typeof POD_ERRORS.TX_POLLING_TIMEOUT
  | typeof POD_ERRORS.TX_REVERTED
  | typeof POD_ERRORS.NONCE_TOO_LOW
  | typeof POD_ERRORS.NONCE_TOO_HIGH
  | typeof POD_ERRORS.TX_ALREADY_KNOWN
  // Validation errors (3010-3019)
  | typeof POD_ERRORS.MISSING_PARAMETER
  | typeof POD_ERRORS.INVALID_PARAMETER
  | typeof POD_ERRORS.VALIDATION_FAILED
  // RPC errors (3020-3029)
  | typeof POD_ERRORS.RPC_INVALID_RESPONSE
  | typeof POD_ERRORS.RPC_METHOD_NOT_FOUND
  | typeof POD_ERRORS.RPC_INVALID_PARAMS
  | typeof POD_ERRORS.RPC_INTERNAL_ERROR
  | typeof POD_ERRORS.RPC_PARSE_ERROR
  // Contract errors (3030-3039)
  | typeof POD_ERRORS.CONTRACT_REVERT
  | typeof POD_ERRORS.CONTRACT_DECODE_FAILED
  // WebSocket errors (3040-3049)
  | typeof POD_ERRORS.WS_CONNECTION_FAILED
  | typeof POD_ERRORS.WS_SEND_ERROR
  | typeof POD_ERRORS.WS_RECEIVE_ERROR
  | typeof POD_ERRORS.WS_SERVER_ERROR
  | typeof POD_ERRORS.WS_SUBSCRIPTION_LIMIT
  | typeof POD_ERRORS.WS_SUBSCRIPTION_FAILED
  | typeof POD_ERRORS.WS_NOT_CONNECTED;

/**
 * Retryable execution error codes.
 */
const RETRYABLE_EXECUTION_CODES = new Set<PodExecutionErrorCode>([
  POD_ERRORS.NONCE_TOO_LOW,
  POD_ERRORS.NONCE_TOO_HIGH,
  POD_ERRORS.RPC_INVALID_RESPONSE,
  POD_ERRORS.RPC_INTERNAL_ERROR,
  POD_ERRORS.WS_CONNECTION_FAILED,
  POD_ERRORS.WS_SEND_ERROR,
  POD_ERRORS.WS_RECEIVE_ERROR,
  POD_ERRORS.WS_SERVER_ERROR,
]);

/**
 * Execution-related errors.
 *
 * These errors occur during transaction execution, validation, RPC calls,
 * WebSocket operations, and contract interactions.
 *
 * @example
 * ```typescript
 * import { PodExecutionError } from '@podnetwork/core';
 *
 * try {
 *   await client.tx.sendTransaction(tx, wallet);
 * } catch (error) {
 *   if (error instanceof PodExecutionError) {
 *     console.log(error.code);     // "POD_3003"
 *     console.log(error.txHash);   // "0x..."
 *     console.log(error.revertReason); // "ERC20: insufficient balance"
 *   }
 * }
 * ```
 */
export class PodExecutionError extends PodError {
  readonly code: PodExecutionErrorCode;
  readonly isRetryable: boolean;
  override readonly category: PodErrorCategory = "EXECUTION";

  /** Transaction hash, if available */
  readonly txHash?: Hash;

  /** Number of polling attempts, if applicable */
  readonly attempts?: number;

  /** Revert reason, if available */
  readonly revertReason?: string;

  /** Parameter name, for validation errors */
  readonly parameter?: string;

  /** Validation reason */
  readonly reason?: string;

  /** RPC error code from server */
  readonly rpcCode?: number;

  /** RPC error message from server */
  readonly rpcMessage?: string;

  /** RPC error data from server */
  readonly rpcData?: unknown;

  /** WebSocket URL */
  readonly wsUrl?: string;

  /** Current subscription count (for limit errors) */
  readonly currentSubscriptions?: number;

  /** Maximum allowed subscriptions (for limit errors) */
  readonly maxSubscriptions?: number;

  private constructor(
    message: string,
    code: PodExecutionErrorCode,
    options?: PodErrorOptions & {
      txHash?: Hash;
      attempts?: number;
      revertReason?: string;
      parameter?: string;
      reason?: string;
      rpcCode?: number;
      rpcMessage?: string;
      rpcData?: unknown;
      wsUrl?: string;
      currentSubscriptions?: number;
      maxSubscriptions?: number;
    }
  ) {
    const metadata = ERROR_CODE_METADATA[code];
    super(message, {
      ...options,
      severity: options?.severity ?? metadata.severity,
      suggestion: options?.suggestion ?? metadata.suggestion,
    });
    this.code = code;
    this.isRetryable = RETRYABLE_EXECUTION_CODES.has(code);
    if (options?.txHash !== undefined) this.txHash = options.txHash;
    if (options?.attempts !== undefined) this.attempts = options.attempts;
    if (options?.revertReason !== undefined) this.revertReason = options.revertReason;
    if (options?.parameter !== undefined) this.parameter = options.parameter;
    if (options?.reason !== undefined) this.reason = options.reason;
    if (options?.rpcCode !== undefined) this.rpcCode = options.rpcCode;
    if (options?.rpcMessage !== undefined) this.rpcMessage = options.rpcMessage;
    if (options?.rpcData !== undefined) this.rpcData = options.rpcData;
    if (options?.wsUrl !== undefined) this.wsUrl = options.wsUrl;
    if (options?.currentSubscriptions !== undefined)
      this.currentSubscriptions = options.currentSubscriptions;
    if (options?.maxSubscriptions !== undefined) this.maxSubscriptions = options.maxSubscriptions;
  }

  // ============================================
  // Transaction Errors
  // ============================================

  /**
   * Create a transaction confirmation timeout error.
   */
  static confirmationTimeout(
    txHash: Hash,
    timeoutMs: number,
    attempts?: number
  ): PodExecutionError {
    const opts: { txHash: Hash; attempts?: number } = { txHash };
    if (attempts !== undefined) opts.attempts = attempts;
    return new PodExecutionError(
      `Transaction ${txHash} not confirmed after ${String(timeoutMs)}ms`,
      POD_ERRORS.TX_CONFIRMATION_TIMEOUT,
      opts
    );
  }

  /**
   * Create a transaction polling timeout error.
   */
  static pollingTimeout(txHash: Hash, maxAttempts: number): PodExecutionError {
    return new PodExecutionError(
      `Transaction ${txHash} not found after ${String(maxAttempts)} polling attempts`,
      POD_ERRORS.TX_POLLING_TIMEOUT,
      { txHash, attempts: maxAttempts }
    );
  }

  /**
   * Create a transaction reverted error.
   */
  static reverted(txHash: Hash, reason?: string): PodExecutionError {
    const message =
      reason !== undefined && reason !== ""
        ? `Transaction ${txHash} reverted: ${reason}`
        : `Transaction ${txHash} reverted`;
    const opts: { txHash: Hash; revertReason?: string } = { txHash };
    if (reason !== undefined) opts.revertReason = reason;
    return new PodExecutionError(message, POD_ERRORS.TX_REVERTED, opts);
  }

  /**
   * Create a nonce too low error.
   */
  static nonceTooLow(nonce: bigint, expected?: bigint): PodExecutionError {
    let message = `Nonce ${String(nonce)} is too low (already used)`;
    if (expected !== undefined) {
      message = `Nonce ${String(nonce)} is too low, expected ${String(expected)}`;
    }
    return new PodExecutionError(message, POD_ERRORS.NONCE_TOO_LOW);
  }

  /**
   * Create a nonce too high error.
   */
  static nonceTooHigh(nonce: bigint, expected?: bigint): PodExecutionError {
    let message = `Nonce ${String(nonce)} is too high`;
    if (expected !== undefined) {
      message = `Nonce ${String(nonce)} is too high, expected ${String(expected)}`;
    }
    return new PodExecutionError(message, POD_ERRORS.NONCE_TOO_HIGH);
  }

  /**
   * Create a transaction already known error.
   */
  static alreadyKnown(txHash?: Hash): PodExecutionError {
    const message =
      txHash !== undefined
        ? `Transaction ${txHash} is already in the mempool`
        : "Transaction is already known";
    return new PodExecutionError(
      message,
      POD_ERRORS.TX_ALREADY_KNOWN,
      txHash !== undefined ? { txHash } : undefined
    );
  }

  // ============================================
  // Validation Errors
  // ============================================

  /**
   * Create a missing parameter error.
   */
  static missingParameter(parameter: string): PodExecutionError {
    return new PodExecutionError(
      `Missing required parameter: ${parameter}`,
      POD_ERRORS.MISSING_PARAMETER,
      { parameter }
    );
  }

  /**
   * Create an invalid parameter error.
   */
  static invalidParameter(parameter: string, reason: string, value?: unknown): PodExecutionError {
    let message = `Invalid parameter '${parameter}': ${reason}`;
    if (value !== undefined) {
      message += ` (got ${JSON.stringify(value)})`;
    }
    return new PodExecutionError(message, POD_ERRORS.INVALID_PARAMETER, {
      parameter,
      reason,
    });
  }

  /**
   * Create a validation failed error.
   */
  static validationFailed(message: string): PodExecutionError {
    return new PodExecutionError(message, POD_ERRORS.VALIDATION_FAILED);
  }

  // ============================================
  // RPC Errors
  // ============================================

  /**
   * Create an invalid RPC response error.
   */
  static invalidResponse(details: string): PodExecutionError {
    return new PodExecutionError(
      `Invalid RPC response: ${details}`,
      POD_ERRORS.RPC_INVALID_RESPONSE
    );
  }

  /**
   * Create a method not found error.
   */
  static methodNotFound(method: string): PodExecutionError {
    return new PodExecutionError(
      `RPC method not found: ${method}`,
      POD_ERRORS.RPC_METHOD_NOT_FOUND
    );
  }

  /**
   * Create an invalid params error.
   */
  static invalidParams(message: string): PodExecutionError {
    return new PodExecutionError(
      `Invalid RPC parameters: ${message}`,
      POD_ERRORS.RPC_INVALID_PARAMS
    );
  }

  /**
   * Create an RPC internal error.
   */
  static rpcInternalError(message: string): PodExecutionError {
    return new PodExecutionError(`RPC internal error: ${message}`, POD_ERRORS.RPC_INTERNAL_ERROR);
  }

  /**
   * Create a parse error.
   */
  static parseError(message: string): PodExecutionError {
    return new PodExecutionError(`RPC parse error: ${message}`, POD_ERRORS.RPC_PARSE_ERROR);
  }

  /**
   * Create an RPC error from a JSON-RPC error response.
   */
  static fromRpcError(response: {
    code: number;
    message: string;
    data?: unknown;
  }): PodExecutionError {
    const { code: rpcCode, message: rpcMessage, data } = response;

    // Map RPC codes to our error codes
    let errorCode: PodExecutionErrorCode;
    switch (rpcCode) {
      case -32700:
        errorCode = POD_ERRORS.RPC_PARSE_ERROR;
        break;
      case -32600:
        errorCode = POD_ERRORS.RPC_INVALID_RESPONSE;
        break;
      case -32601:
        errorCode = POD_ERRORS.RPC_METHOD_NOT_FOUND;
        break;
      case -32602:
        errorCode = POD_ERRORS.RPC_INVALID_PARAMS;
        break;
      case -32603:
        errorCode = POD_ERRORS.RPC_INTERNAL_ERROR;
        break;
      default:
        // Server errors (-32000 to -32099) are internal errors
        if (rpcCode >= -32099 && rpcCode <= -32000) {
          errorCode = POD_ERRORS.RPC_INTERNAL_ERROR;
        } else {
          errorCode = POD_ERRORS.RPC_INVALID_RESPONSE;
        }
    }

    return new PodExecutionError(`RPC error ${String(rpcCode)}: ${rpcMessage}`, errorCode, {
      rpcCode,
      rpcMessage,
      rpcData: data,
    });
  }

  // ============================================
  // Contract Errors
  // ============================================

  /**
   * Create a contract revert error.
   */
  static contractRevert(reason?: string, txHash?: Hash): PodExecutionError {
    const message =
      reason !== undefined && reason !== ""
        ? `Contract reverted: ${reason}`
        : "Contract execution reverted";
    const opts: { txHash?: Hash; revertReason?: string } = {};
    if (txHash !== undefined) opts.txHash = txHash;
    if (reason !== undefined && reason !== "") opts.revertReason = reason;
    return new PodExecutionError(
      message,
      POD_ERRORS.CONTRACT_REVERT,
      Object.keys(opts).length > 0 ? opts : undefined
    );
  }

  /**
   * Create a contract decode failed error.
   */
  static decodeFailed(details: string): PodExecutionError {
    return new PodExecutionError(
      `Failed to decode contract response: ${details}`,
      POD_ERRORS.CONTRACT_DECODE_FAILED
    );
  }

  // ============================================
  // WebSocket Errors
  // ============================================

  /**
   * Create a WebSocket connection failed error.
   */
  static wsConnectionFailed(url: string, cause?: Error): PodExecutionError {
    const opts: { wsUrl: string; cause?: Error } = { wsUrl: url };
    if (cause !== undefined) opts.cause = cause;
    return new PodExecutionError(
      `WebSocket connection failed to ${url}`,
      POD_ERRORS.WS_CONNECTION_FAILED,
      opts
    );
  }

  /**
   * Create a WebSocket send error.
   */
  static wsSendError(reason: string, cause?: Error): PodExecutionError {
    const opts: { reason: string; cause?: Error } = { reason };
    if (cause !== undefined) opts.cause = cause;
    return new PodExecutionError(
      `Failed to send WebSocket message: ${reason}`,
      POD_ERRORS.WS_SEND_ERROR,
      opts
    );
  }

  /**
   * Create a WebSocket receive error.
   */
  static wsReceiveError(reason: string, cause?: Error): PodExecutionError {
    const opts: { reason: string; cause?: Error } = { reason };
    if (cause !== undefined) opts.cause = cause;
    return new PodExecutionError(
      `Failed to receive WebSocket message: ${reason}`,
      POD_ERRORS.WS_RECEIVE_ERROR,
      opts
    );
  }

  /**
   * Create a WebSocket server error.
   */
  static wsServerError(code: number, message: string): PodExecutionError {
    return new PodExecutionError(
      `WebSocket server error ${String(code)}: ${message}`,
      POD_ERRORS.WS_SERVER_ERROR,
      { rpcCode: code, rpcMessage: message }
    );
  }

  /**
   * Create a WebSocket subscription limit error.
   */
  static wsSubscriptionLimit(current: number, max: number): PodExecutionError {
    return new PodExecutionError(
      `WebSocket subscription limit exceeded: ${String(current)}/${String(max)}`,
      POD_ERRORS.WS_SUBSCRIPTION_LIMIT,
      { currentSubscriptions: current, maxSubscriptions: max }
    );
  }

  /**
   * Create a WebSocket subscription failed error.
   */
  static wsSubscriptionFailed(subscription: string, reason?: string): PodExecutionError {
    const message =
      reason !== undefined && reason !== ""
        ? `Subscription '${subscription}' failed: ${reason}`
        : `Subscription '${subscription}' failed`;
    return new PodExecutionError(
      message,
      POD_ERRORS.WS_SUBSCRIPTION_FAILED,
      reason !== undefined && reason !== "" ? { reason } : undefined
    );
  }

  /**
   * Create a WebSocket not connected error.
   */
  static wsNotConnected(): PodExecutionError {
    return new PodExecutionError("WebSocket is not connected", POD_ERRORS.WS_NOT_CONNECTED);
  }

  override toJSON(): PodErrorJson {
    const json = super.toJSON() as Record<string, unknown>;
    if (this.txHash !== undefined) json["txHash"] = this.txHash;
    if (this.attempts !== undefined) json["attempts"] = this.attempts;
    if (this.revertReason !== undefined) json["revertReason"] = this.revertReason;
    if (this.parameter !== undefined) json["parameter"] = this.parameter;
    if (this.reason !== undefined) json["reason"] = this.reason;
    if (this.rpcCode !== undefined) json["rpcCode"] = this.rpcCode;
    if (this.rpcMessage !== undefined) json["rpcMessage"] = this.rpcMessage;
    if (this.rpcData !== undefined) json["rpcData"] = this.rpcData;
    if (this.wsUrl !== undefined) json["wsUrl"] = this.wsUrl;
    if (this.currentSubscriptions !== undefined)
      json["currentSubscriptions"] = this.currentSubscriptions;
    if (this.maxSubscriptions !== undefined) json["maxSubscriptions"] = this.maxSubscriptions;
    return json as PodErrorJson;
  }
}
