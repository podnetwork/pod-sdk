/**
 * ABI Registry for address-based lookup
 *
 * @see FR-034 through FR-039
 */

import type { Abi } from "abitype";
import { decodeEventLog, type DecodedEventLog } from "../decode/events.js";
import { decodeError, type DecodedError } from "../decode/errors.js";
import { DuplicateRegistrationError } from "../errors/index.js";

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
 * Registry configuration options
 */
export interface RegistryOptions {
  /**
   * How to handle duplicate address registration:
   * - "keep": Ignore new registration, keep existing
   * - "replace": Overwrite existing with new (default)
   * - "error": Throw DuplicateRegistrationError
   *
   * @see FR-039
   */
  onDuplicate?: "keep" | "replace" | "error";
}

/**
 * ABI registry instance for address-based lookup
 */
export interface AbiRegistry {
  /**
   * Register an ABI for a contract address.
   *
   * @param address - Contract address
   * @param abi - Contract ABI
   * @throws DuplicateRegistrationError if onDuplicate is "error" and address exists
   *
   * @see FR-035
   */
  register(address: Address, abi: Abi): void;

  /**
   * Remove a registered ABI.
   *
   * @param address - Contract address
   * @returns True if address was registered, false otherwise
   *
   * @see FR-038
   */
  unregister(address: Address): boolean;

  /**
   * Get ABI for an address.
   *
   * @param address - Contract address
   * @returns ABI if registered, undefined otherwise
   *
   * @see FR-036
   */
  get(address: Address): Abi | undefined;

  /**
   * Check if address has registered ABI.
   *
   * @param address - Contract address
   * @returns True if ABI is registered
   */
  has(address: Address): boolean;

  /**
   * Decode log using registered ABI for log.address.
   *
   * @param log - Event log to decode
   * @returns Decoded event or null if no ABI registered or event not found
   *
   * @see FR-037
   */
  decodeLog(log: Log): DecodedEventLog | null;

  /**
   * Decode error using registered ABI for address.
   *
   * @param address - Contract address
   * @param data - Revert data
   * @returns Decoded error or null if no ABI registered or error not found
   *
   * @see FR-037
   */
  decodeError(address: Address, data: Hex): DecodedError | null;

  /**
   * Remove all registrations.
   *
   * @see FR-038
   */
  clear(): void;

  /**
   * Number of registered addresses.
   */
  readonly size: number;

  /**
   * List of registered addresses.
   */
  readonly addresses: readonly Address[];
}

/**
 * Normalize an address to lowercase for consistent lookups
 */
function normalizeAddress(address: Address): Address {
  return address.toLowerCase() as Address;
}

/**
 * Create a new ABI registry instance.
 *
 * @param options - Registry configuration
 * @returns New registry instance
 *
 * @example
 * ```ts
 * // Default: replace duplicates
 * const registry = createRegistry();
 *
 * // Throw on duplicates
 * const strictRegistry = createRegistry({ onDuplicate: "error" });
 *
 * registry.register(CLOB_ADDRESS, CLOB_ABI);
 * registry.register(tokenAddress, ERC20_ABI);
 *
 * // Decode any log automatically
 * const decoded = registry.decodeLog(log);
 * ```
 *
 * @see FR-034
 */
export function createRegistry(options: RegistryOptions = {}): AbiRegistry {
  const { onDuplicate = "replace" } = options;
  const entries = new Map<Address, Abi>();

  return {
    register(address: Address, abi: Abi): void {
      const normalized = normalizeAddress(address);

      if (entries.has(normalized)) {
        switch (onDuplicate) {
          case "keep":
            return;
          case "error":
            throw new DuplicateRegistrationError(address);
          case "replace":
            // Fall through to set
            break;
        }
      }

      entries.set(normalized, abi);
    },

    unregister(address: Address): boolean {
      const normalized = normalizeAddress(address);
      return entries.delete(normalized);
    },

    get(address: Address): Abi | undefined {
      const normalized = normalizeAddress(address);
      return entries.get(normalized);
    },

    has(address: Address): boolean {
      const normalized = normalizeAddress(address);
      return entries.has(normalized);
    },

    decodeLog(log: Log): DecodedEventLog | null {
      const normalized = normalizeAddress(log.address);
      const abi = entries.get(normalized);

      if (abi === undefined) {
        return null;
      }

      return decodeEventLog(abi, log);
    },

    decodeError(address: Address, data: Hex): DecodedError | null {
      const normalized = normalizeAddress(address);
      const abi = entries.get(normalized);

      if (abi === undefined) {
        return null;
      }

      return decodeError(abi, data);
    },

    clear(): void {
      entries.clear();
    },

    get size(): number {
      return entries.size;
    },

    get addresses(): readonly Address[] {
      return Array.from(entries.keys());
    },
  };
}
