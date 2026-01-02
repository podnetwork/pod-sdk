/**
 * Solidity type helpers for type-safe ABI operations
 *
 * These types help ensure compile-time type safety when working with
 * Solidity types in TypeScript.
 */

/**
 * Hex string type for byte arrays and hashes
 */
export type Hex = `0x${string}`;

/**
 * Ethereum address type (20 bytes)
 */
export type Address = `0x${string}`;

/**
 * Log structure from transaction receipts
 */
export interface Log {
  address: Address;
  topics: readonly Hex[];
  data: Hex;
  blockNumber?: bigint;
  transactionHash?: Hex;
  logIndex?: number;
}

/**
 * Transaction receipt structure with logs
 */
export interface TransactionReceipt {
  logs: Log[];
  transactionHash: Hex;
  blockNumber: bigint;
  blockHash: Hex;
  status: 0 | 1;
}

/**
 * Solidity integer type ranges for validation
 */
export const SOLIDITY_INT_RANGES = {
  int8: { min: -(2n ** 7n), max: 2n ** 7n - 1n },
  int16: { min: -(2n ** 15n), max: 2n ** 15n - 1n },
  int32: { min: -(2n ** 31n), max: 2n ** 31n - 1n },
  int64: { min: -(2n ** 63n), max: 2n ** 63n - 1n },
  int128: { min: -(2n ** 127n), max: 2n ** 127n - 1n },
  int256: { min: -(2n ** 255n), max: 2n ** 255n - 1n },
  uint8: { min: 0n, max: 2n ** 8n - 1n },
  uint16: { min: 0n, max: 2n ** 16n - 1n },
  uint32: { min: 0n, max: 2n ** 32n - 1n },
  uint64: { min: 0n, max: 2n ** 64n - 1n },
  uint128: { min: 0n, max: 2n ** 128n - 1n },
  uint256: { min: 0n, max: 2n ** 256n - 1n },
} as const;

/**
 * Check if a value is within the bounds of a Solidity integer type
 */
export function isWithinBounds(value: bigint, type: keyof typeof SOLIDITY_INT_RANGES): boolean {
  const range = SOLIDITY_INT_RANGES[type];
  return value >= range.min && value <= range.max;
}

/**
 * Normalize an integer type to its base form (e.g., "uint" -> "uint256")
 */
export function normalizeIntType(type: string): string {
  if (type === "uint") return "uint256";
  if (type === "int") return "int256";
  return type;
}

/**
 * Check if a hex string is a valid address (20 bytes)
 */
export function isValidAddress(value: string): value is Address {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

/**
 * Check if a string is a valid hex value
 */
export function isValidHex(value: string): value is Hex {
  return /^0x[0-9a-fA-F]*$/.test(value);
}

/**
 * Pad a hex string to a specific byte length
 */
export function padHex(hex: Hex, bytes: number): Hex {
  const stripped = hex.slice(2);
  const targetLength = bytes * 2;
  if (stripped.length >= targetLength) {
    return `0x${stripped.slice(-targetLength)}`;
  }
  return `0x${stripped.padStart(targetLength, "0")}`;
}
