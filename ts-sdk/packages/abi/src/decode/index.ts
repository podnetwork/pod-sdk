/**
 * Decode module for @podnetwork/abi
 *
 * Provides utilities for decoding event logs, errors, and calldata.
 */

// Event decoding
export {
  decodeEventLog,
  decodeEventLogStrict,
  getEventTopic,
  getEventTopics,
  buildEventFilter,
  type DecodedEventLog,
  type EventFilter,
} from "./events.js";

// Error decoding
export {
  decodeError,
  isError,
  getErrorSelector,
  getErrorSelectors,
  type DecodedError,
} from "./errors.js";

// Calldata decoding
export {
  decodeCalldata,
  decodeFunction,
  decodeReturnValue,
  decodeFunctionResult,
  type DecodedFunction,
} from "./calldata.js";

// Receipt batch decoding
export {
  decodeReceiptLogs,
  decodeReceiptLogsWithUnknown,
  isDecodedEventLog,
  isUnknownLog,
  type UnknownLog,
  type AbiRegistry,
  type DecodeOptions,
} from "./receipt.js";
