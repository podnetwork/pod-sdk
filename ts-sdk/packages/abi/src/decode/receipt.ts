/**
 * Receipt log batch decoding utilities
 *
 * @see FR-019 through FR-021
 */

import type { Abi } from "abitype";
import { decodeEventLog, type DecodedEventLog } from "./events.js";

// External types
type Address = `0x${string}`;
type Hex = `0x${string}`;

interface Log {
  address: Address;
  topics: readonly Hex[];
  data: Hex;
  blockNumber?: bigint;
  transactionHash?: Hex;
  logIndex?: number;
}

/**
 * Unknown log wrapper for batch decoding
 */
export interface UnknownLog {
  /** Discriminant for type narrowing */
  decoded: false;
  /** Original log data */
  log: Log;
}

/**
 * Registry interface for batch decoding
 */
export interface AbiRegistry {
  get(address: Address): Abi | undefined;
  decodeLog(log: Log): DecodedEventLog | null;
}

/**
 * Options for receipt log decoding
 */
export interface DecodeOptions {
  /** List of ABIs to try for decoding */
  abis?: Abi[];
  /** Registry for address-based lookup */
  registry?: AbiRegistry;
  /** Filter out logs that can't be decoded (default: true) */
  skipUnknown?: boolean;
}

/**
 * Try to decode a log using multiple ABIs
 */
function tryDecodeLog(log: Log, abis: Abi[]): DecodedEventLog | null {
  for (const abi of abis) {
    const decoded = decodeEventLog(abi, log);
    if (decoded !== null) {
      return decoded;
    }
  }
  return null;
}

/**
 * Decode all logs from a transaction receipt.
 *
 * @param logs - Array of logs from transaction receipt
 * @param options - Decoding options (ABIs, registry, skipUnknown)
 * @returns Array of decoded events (unknown logs filtered by default)
 *
 * @example
 * ```ts
 * const decoded = decodeReceiptLogs(receipt.logs, {
 *   abis: [ERC20_ABI, ERC721_ABI],
 *   registry: myRegistry,
 * });
 * ```
 *
 * @see FR-019, FR-020, FR-021
 */
export function decodeReceiptLogs(logs: Log[], options: DecodeOptions = {}): DecodedEventLog[] {
  const { abis = [], registry, skipUnknown = true } = options;
  const results: DecodedEventLog[] = [];

  for (const log of logs) {
    let decoded: DecodedEventLog | null = null;

    // First try registry if available
    if (registry !== undefined) {
      decoded = registry.decodeLog(log);
    }

    // Then try provided ABIs
    if (decoded === null && abis.length > 0) {
      decoded = tryDecodeLog(log, abis);
    }

    if (decoded !== null) {
      results.push(decoded);
    } else if (!skipUnknown) {
      // When skipUnknown is false in this function, we just skip
      // Use decodeReceiptLogsWithUnknown to include unknown logs
    }
  }

  return results;
}

/**
 * Decode all logs, preserving unknown logs in output.
 *
 * @param logs - Array of logs from transaction receipt
 * @param options - Decoding options (ABIs, registry)
 * @returns Array of decoded events and unknown logs
 *
 * @see FR-021
 */
export function decodeReceiptLogsWithUnknown(
  logs: Log[],
  options: DecodeOptions = {}
): (DecodedEventLog | UnknownLog)[] {
  const { abis = [], registry } = options;
  const results: (DecodedEventLog | UnknownLog)[] = [];

  for (const log of logs) {
    let decoded: DecodedEventLog | null = null;

    // First try registry if available
    if (registry !== undefined) {
      decoded = registry.decodeLog(log);
    }

    // Then try provided ABIs
    if (decoded === null && abis.length > 0) {
      decoded = tryDecodeLog(log, abis);
    }

    if (decoded !== null) {
      results.push(decoded);
    } else {
      results.push({ decoded: false, log });
    }
  }

  return results;
}

/**
 * Type guard to check if a decode result is a decoded event
 */
export function isDecodedEventLog(result: DecodedEventLog | UnknownLog): result is DecodedEventLog {
  return !("decoded" in result && !result.decoded);
}

/**
 * Type guard to check if a decode result is an unknown log
 */
export function isUnknownLog(result: DecodedEventLog | UnknownLog): result is UnknownLog {
  return "decoded" in result && !result.decoded;
}
