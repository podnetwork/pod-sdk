/**
 * Event log decoding utilities
 *
 * @see FR-001 through FR-008
 */

import type { Abi } from "abitype";
import { getInterface } from "../internal/interface-cache.js";
import { EventNotFoundError, AnonymousEventError } from "../errors/index.js";

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
 * Decoded event log with full metadata
 */
export interface DecodedEventLog {
  /** Event name from ABI */
  eventName: string;
  /** Named arguments (if parameter names exist in ABI) */
  args: Record<string, unknown>;
  /** Positional arguments (always available) */
  argsList: readonly unknown[];
  /** Event signature topic (keccak256 hash) */
  topic: Hex;
  /** Contract address that emitted the event */
  address: Address;
  /** Block number (if available from log) */
  blockNumber?: bigint;
  /** Transaction hash (if available from log) */
  transactionHash?: Hex;
  /** Log index within the transaction (if available) */
  logIndex?: number;
}

/**
 * Event subscription filter
 */
export interface EventFilter {
  /** Contract address to filter (optional) */
  address?: Address;
  /** Topics array for event matching (null = wildcard) */
  topics: readonly (Hex | null)[];
}

/**
 * Check if a log is from an anonymous event (no topic0)
 */
function isAnonymousLog(log: Log): boolean {
  return log.topics.length === 0 || log.topics[0] === undefined;
}

/**
 * Decode a single event log using the provided ABI.
 *
 * @param abi - Contract ABI containing event definitions
 * @param log - Raw event log from transaction receipt
 * @returns Decoded event or null if no matching event signature found
 *
 * @example
 * ```ts
 * const decoded = decodeEventLog(ERC20_ABI, log);
 * if (decoded) {
 *   console.log(decoded.eventName); // "Transfer"
 *   console.log(decoded.args.from); // "0x..."
 * }
 * ```
 *
 * @see FR-001, FR-002, FR-004, FR-007, FR-008
 */
export function decodeEventLog(abi: Abi, log: Log): DecodedEventLog | null {
  // Cannot decode anonymous events
  if (isAnonymousLog(log)) {
    return null;
  }

  const iface = getInterface(abi);

  try {
    const parsed = iface.parseLog({
      topics: log.topics as string[],
      data: log.data,
    });

    if (parsed === null) {
      return null;
    }

    // Build args object from fragment inputs
    const args: Record<string, unknown> = {};
    const argsList: unknown[] = [];

    for (let i = 0; i < parsed.fragment.inputs.length; i++) {
      const input = parsed.fragment.inputs[i];
      if (input === undefined) continue;
      const value: unknown = parsed.args[i];
      argsList.push(value);
      if (input.name !== "") {
        args[input.name] = value;
      }
    }

    const topic0 = log.topics[0];
    if (topic0 === undefined) {
      return null;
    }

    const result: DecodedEventLog = {
      eventName: parsed.name,
      args,
      argsList,
      topic: topic0,
      address: log.address,
    };

    // Only include optional fields if they are defined
    if (log.blockNumber !== undefined) {
      result.blockNumber = log.blockNumber;
    }
    if (log.transactionHash !== undefined) {
      result.transactionHash = log.transactionHash;
    }
    if (log.logIndex !== undefined) {
      result.logIndex = log.logIndex;
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * Decode a single event log, throwing if decoding fails.
 *
 * @param abi - Contract ABI containing event definitions
 * @param log - Raw event log from transaction receipt
 * @returns Decoded event
 * @throws EventNotFoundError if no matching event signature found
 * @throws AnonymousEventError if log is from anonymous event
 *
 * @see FR-003, FR-007
 */
export function decodeEventLogStrict(abi: Abi, log: Log): DecodedEventLog {
  if (isAnonymousLog(log)) {
    throw new AnonymousEventError(log);
  }

  const result = decodeEventLog(abi, log);

  if (result === null) {
    const topic0 = log.topics[0];
    if (topic0 === undefined) {
      throw new EventNotFoundError(`0x${"0".repeat(64)}`);
    }
    throw new EventNotFoundError(topic0);
  }

  return result;
}

/**
 * Get the keccak256 topic hash for a named event.
 *
 * @param abi - Contract ABI containing event definitions
 * @param eventName - Name of the event
 * @returns 32-byte topic hash
 * @throws EventNotFoundError if event not in ABI
 *
 * @see FR-005
 */
export function getEventTopic(abi: Abi, eventName: string): Hex {
  const iface = getInterface(abi);
  const event = iface.getEvent(eventName);

  if (event === null) {
    throw new EventNotFoundError(`0x${"0".repeat(64)}`);
  }

  return event.topicHash as Hex;
}

/**
 * Get all event topics mapped to event names.
 *
 * @param abi - Contract ABI containing event definitions
 * @returns Map of topic hash to event name
 *
 * @see FR-005
 */
export function getEventTopics(abi: Abi): Map<Hex, string> {
  const iface = getInterface(abi);
  const topics = new Map<Hex, string>();

  iface.forEachEvent((event) => {
    if (!event.anonymous) {
      topics.set(event.topicHash as Hex, event.name);
    }
  });

  return topics;
}

/**
 * Build a filter object for subscribing to events.
 *
 * @param abi - Contract ABI containing event definitions
 * @param eventName - Name of the event to filter
 * @param indexedArgs - Optional indexed argument values (null = wildcard)
 * @returns Filter object for event subscriptions
 *
 * @example
 * ```ts
 * // Filter for all Transfer events
 * const filter = buildEventFilter(ERC20_ABI, "Transfer");
 *
 * // Filter for Transfer events from a specific address
 * const filter = buildEventFilter(ERC20_ABI, "Transfer", { from: "0x..." });
 * ```
 *
 * @see FR-006
 */
export function buildEventFilter(
  abi: Abi,
  eventName: string,
  indexedArgs?: Record<string, unknown>
): EventFilter {
  const iface = getInterface(abi);
  const event = iface.getEvent(eventName);

  if (event === null) {
    throw new EventNotFoundError(`0x${"0".repeat(64)}`);
  }

  // Start with the event topic
  const topics: (Hex | null)[] = [event.topicHash as Hex];

  // Add indexed argument filters
  if (indexedArgs !== undefined) {
    for (const input of event.inputs) {
      if (input.indexed === true) {
        const value = indexedArgs[input.name];
        if (value === undefined || value === null) {
          topics.push(null);
        } else {
          // Encode the indexed value as a topic
          const encoded = iface.encodeFilterTopics(eventName, [value]);
          topics.push((encoded[1] ?? null) as Hex | null);
        }
      }
    }
  }

  return { topics };
}
