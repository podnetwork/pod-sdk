/**
 * @module logging
 * @description LogTape-based logging for Pod Network SDK
 *
 * This module follows LogTape's library author best practices:
 * - Never calls configure() - that's the application's responsibility
 * - Uses consistent logger categories for filtering
 * - Never logs sensitive data (private keys, passwords)
 *
 * @example
 * ```typescript
 * // Application-side configuration (not in SDK code)
 * import { configure, getConsoleSink } from "@logtape/logtape";
 *
 * await configure({
 *   sinks: { console: getConsoleSink() },
 *   loggers: [
 *     { category: ["pod-sdk"], sinks: ["console"], lowestLevel: "debug" },
 *   ],
 * });
 * ```
 */

import { getLogger as getLogTapeLogger, type Logger } from "@logtape/logtape";

/**
 * Logger category prefix for all Pod SDK loggers.
 */
const SDK_CATEGORY = "pod-sdk";

/**
 * Logger categories used in the SDK.
 *
 * Use these to filter logs by component:
 *
 * @example
 * ```typescript
 * // Enable only RPC logs
 * { category: ["pod-sdk", "rpc"], sinks: ["console"], lowestLevel: "debug" }
 *
 * // Enable all SDK logs
 * { category: ["pod-sdk"], sinks: ["console"], lowestLevel: "info" }
 * ```
 */
export const LoggerCategory = {
  /** Core SDK operations */
  CORE: [SDK_CATEGORY] as const,
  /** RPC namespace operations */
  RPC: [SDK_CATEGORY, "rpc"] as const,
  /** Transaction namespace operations */
  TX: [SDK_CATEGORY, "tx"] as const,
  /** WebSocket operations */
  WS: [SDK_CATEGORY, "ws"] as const,
  /** Wallet operations (never logs sensitive data) */
  WALLET: [SDK_CATEGORY, "wallet"] as const,
  /** Orderbook operations */
  ORDERBOOK: [SDK_CATEGORY, "orderbook"] as const,
  /** Auction operations */
  AUCTION: [SDK_CATEGORY, "auction"] as const,
  /** Faucet operations */
  FAUCET: [SDK_CATEGORY, "faucet"] as const,
} as const;

/**
 * Logger category type.
 */
export type LoggerCategoryType = (typeof LoggerCategory)[keyof typeof LoggerCategory];

/**
 * Gets a logger for the specified category.
 *
 * This is the primary way to create loggers in the SDK.
 * The returned logger follows LogTape conventions and will
 * only produce output if the application has configured LogTape.
 *
 * @param category - The logger category (from LoggerCategory or custom)
 * @returns A LogTape logger instance
 *
 * @example
 * ```typescript
 * import { getLogger, LoggerCategory } from '@podnetwork/core';
 *
 * const logger = getLogger(LoggerCategory.RPC);
 * logger.debug('Sending request', { method: 'eth_getBalance' });
 * ```
 */
export function getLogger(category: readonly string[]): Logger {
  return getLogTapeLogger(category);
}

/**
 * Creates a child logger with an additional category segment.
 *
 * @param parent - The parent logger category
 * @param child - The child category segment
 * @returns A new logger with the combined category
 *
 * @example
 * ```typescript
 * const rpcLogger = getLogger(LoggerCategory.RPC);
 * const methodLogger = getChildLogger(LoggerCategory.RPC, 'getBalance');
 * // Category: ["pod-sdk", "rpc", "getBalance"]
 * ```
 */
export function getChildLogger(parent: readonly string[], child: string): Logger {
  return getLogTapeLogger([...parent, child]);
}

/**
 * Re-export Logger type from LogTape for convenience.
 */
export type { Logger } from "@logtape/logtape";
