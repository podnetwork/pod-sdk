/**
 * @module errors/normalizer
 * @description Error normalization for converting unknown errors to PodError
 */

import type { Hash } from "../types/hash.js";
import { PodError, PodUnknownError } from "./pod-error.js";
import { PodNetworkError } from "./network.js";
import { PodFundingError } from "./funding.js";
import { PodExecutionError } from "./execution.js";
import { PodWalletError } from "./wallet.js";

/** Zero hash placeholder for errors where hash is unknown */
const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000" as Hash;

/**
 * Normalize an unknown error to a PodError.
 *
 * This function analyzes error messages and properties to determine
 * the most appropriate PodError subclass.
 *
 * @param error - The error to normalize
 * @param requestId - Optional request ID for tracing
 * @returns A PodError instance
 *
 * @example
 * ```typescript
 * try {
 *   await fetch(url);
 * } catch (err) {
 *   throw normalizeError(err);
 * }
 * ```
 */
export function normalizeError(error: unknown, requestId?: string): PodError {
  // Already a PodError - return as-is
  if (error instanceof PodError) {
    return error;
  }

  // Handle Error objects
  if (error instanceof Error) {
    return normalizeErrorInstance(error, requestId);
  }

  // Handle string errors
  if (typeof error === "string") {
    return new PodUnknownError(error, requestId !== undefined ? { requestId } : undefined);
  }

  // Handle objects with message property
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String((error as { message: unknown }).message);
    return normalizeErrorInstance(new Error(message), requestId);
  }

  // Fallback for unknown types
  return new PodUnknownError(
    "An unknown error occurred",
    requestId !== undefined ? { requestId } : undefined
  );
}

/**
 * Normalize an Error instance to a PodError.
 */
function normalizeErrorInstance(error: Error, requestId?: string): PodError {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Check for RPC error response format
  if (isRpcErrorLike(error)) {
    return normalizeRpcError(error as RpcErrorLike, requestId);
  }

  // Network errors
  if (isNetworkError(message, name)) {
    return normalizeNetworkError(error, message, requestId);
  }

  // Wallet errors (from ethers or browser wallets)
  if (isWalletError(message, name)) {
    return normalizeWalletError(error, message, requestId);
  }

  // Funding/gas errors
  if (isFundingError(message)) {
    return normalizeFundingError(error, message, requestId);
  }

  // Transaction errors
  if (isTransactionError(message)) {
    return normalizeTransactionError(error, message, requestId);
  }

  // Validation errors
  if (isValidationError(message)) {
    return normalizeValidationError(error, message, requestId);
  }

  // Fallback to unknown error
  return PodUnknownError.fromError(error, requestId);
}

// ============================================
// Error Detection Functions
// ============================================

interface RpcErrorLike {
  code?: number;
  message: string;
  data?: unknown;
}

function isRpcErrorLike(error: unknown): error is RpcErrorLike {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as RpcErrorLike).code === "number"
  );
}

function isNetworkError(message: string, name: string): boolean {
  return (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("socket hang up") ||
    (name === "typeerror" && message.includes("failed to fetch")) ||
    name === "aborterror"
  );
}

function isWalletError(message: string, _name: string): boolean {
  return (
    message.includes("private key") ||
    message.includes("mnemonic") ||
    message.includes("invalid signature") ||
    message.includes("signing") ||
    message.includes("user rejected") ||
    message.includes("user denied") ||
    message.includes("rejected by user") ||
    message.includes("wallet not connected") ||
    message.includes("no browser wallet") ||
    message.includes("install metamask") ||
    message.includes("install a wallet") ||
    message.includes("wrong chain") ||
    message.includes("chain mismatch") ||
    message.includes("switch network")
  );
}

function isFundingError(message: string): boolean {
  return (
    message.includes("insufficient funds") ||
    message.includes("insufficient balance") ||
    message.includes("gas too low") ||
    message.includes("intrinsic gas too low") ||
    message.includes("underpriced") ||
    message.includes("replacement transaction underpriced") ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("429")
  );
}

function isTransactionError(message: string): boolean {
  return (
    message.includes("nonce too low") ||
    message.includes("nonce too high") ||
    message.includes("already known") ||
    message.includes("transaction reverted") ||
    message.includes("execution reverted") ||
    message.includes("revert") ||
    message.includes("confirmation timeout") ||
    message.includes("polling timeout")
  );
}

function isValidationError(message: string): boolean {
  return (
    message.includes("invalid") ||
    message.includes("missing") ||
    message.includes("required") ||
    message.includes("validation") ||
    message.includes("bad request") ||
    message.includes("400")
  );
}

// ============================================
// Error Normalization Functions
// ============================================

function normalizeRpcError(error: RpcErrorLike, requestId?: string): PodError {
  const { code, message, data } = error;

  if (code !== undefined) {
    return PodExecutionError.fromRpcError({ code, message, data });
  }

  return new PodUnknownError(message, requestId !== undefined ? { requestId } : undefined);
}

function normalizeNetworkError(error: Error, message: string, _requestId?: string): PodError {
  // Extract URL if present
  const urlMatch = /https?:\/\/[^\s]+/.exec(message);
  const url = urlMatch?.[0] ?? "unknown";

  if (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("etimedout")
  ) {
    return PodNetworkError.timeout(url, 0);
  }

  if (message.includes("econnreset") || message.includes("socket hang up")) {
    return PodNetworkError.connectionReset(url, error);
  }

  if (message.includes("enotfound") || message.includes("dns")) {
    return PodNetworkError.dnsFailure(url, error);
  }

  return PodNetworkError.connectionFailed(url, error);
}

function normalizeWalletError(error: Error, message: string, _requestId?: string): PodError {
  if (message.includes("private key")) {
    return PodWalletError.invalidKey(error.message);
  }

  if (message.includes("mnemonic")) {
    return PodWalletError.invalidMnemonic(error.message);
  }

  if (
    message.includes("user rejected") ||
    message.includes("user denied") ||
    message.includes("rejected by user")
  ) {
    return PodWalletError.userRejected();
  }

  if (
    message.includes("wallet not connected") ||
    message.includes("no browser wallet") ||
    message.includes("install metamask") ||
    message.includes("install a wallet")
  ) {
    return PodWalletError.notConnected();
  }

  if (
    message.includes("wrong chain") ||
    message.includes("chain mismatch") ||
    message.includes("switch network")
  ) {
    // Try to extract chain IDs
    const chainMatch = message.match(/chain (\d+)/gi);
    if (chainMatch !== null && chainMatch.length >= 2 && chainMatch[1] !== undefined) {
      const expected = BigInt(chainMatch[0].replace(/\D/g, ""));
      const actual = BigInt(chainMatch[1].replace(/\D/g, ""));
      return PodWalletError.chainMismatch(expected, actual);
    }
    return PodWalletError.chainMismatch(0n, 0n);
  }

  if (message.includes("signing") || message.includes("signature")) {
    return PodWalletError.signingFailed(error.message, error);
  }

  // Fallback to generic wallet error
  return PodWalletError.signingFailed(error.message, error);
}

function normalizeFundingError(_error: Error, message: string, _requestId?: string): PodError {
  if (message.includes("insufficient funds") || message.includes("insufficient balance")) {
    return PodFundingError.insufficientFunds();
  }

  if (message.includes("gas too low") || message.includes("intrinsic gas too low")) {
    return PodFundingError.gasTooLow();
  }

  if (message.includes("replacement transaction underpriced")) {
    return PodFundingError.replacementUnderpriced();
  }

  if (message.includes("underpriced")) {
    return PodFundingError.underpriced();
  }

  if (
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("429")
  ) {
    // Default to 1 hour wait time if not specified
    return PodFundingError.rateLimited(3600000);
  }

  return PodFundingError.insufficientFunds();
}

function normalizeTransactionError(_error: Error, message: string, _requestId?: string): PodError {
  if (message.includes("nonce too low")) {
    return PodExecutionError.nonceTooLow(0n);
  }

  if (message.includes("nonce too high")) {
    return PodExecutionError.nonceTooHigh(0n);
  }

  if (message.includes("already known")) {
    return PodExecutionError.alreadyKnown();
  }

  if (
    message.includes("transaction reverted") ||
    message.includes("execution reverted") ||
    message.includes("revert")
  ) {
    // Try to extract revert reason
    const reasonMatch = /revert(?:ed)?:?\s*(.+)/i.exec(message);
    const reason = reasonMatch?.[1]?.trim();
    return PodExecutionError.reverted(ZERO_HASH, reason);
  }

  if (message.includes("confirmation timeout")) {
    return PodExecutionError.confirmationTimeout(ZERO_HASH, 0);
  }

  if (message.includes("polling timeout")) {
    return PodExecutionError.pollingTimeout(ZERO_HASH, 0);
  }

  return PodExecutionError.reverted(ZERO_HASH);
}

function normalizeValidationError(_error: Error, message: string, _requestId?: string): PodError {
  // Try to extract parameter name
  const paramMatch = /(?:invalid|missing)\s+(?:parameter\s+)?['"]?(\w+)['"]?/i.exec(message);
  const param = paramMatch?.[1];

  if (message.includes("missing") && param !== undefined && param !== "") {
    return PodExecutionError.missingParameter(param);
  }

  if (message.includes("invalid") && param !== undefined && param !== "") {
    return PodExecutionError.invalidParameter(param, message);
  }

  return PodExecutionError.validationFailed(message);
}
