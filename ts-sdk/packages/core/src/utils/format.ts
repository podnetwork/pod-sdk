/**
 * @module utils/format
 * @description POD and Gwei formatting utilities
 */

/**
 * Number of decimals in POD token (same as ETH).
 * @internal Use POD_DECIMALS from constants.ts for public API
 */
const POD_DECIMALS = 18;

/**
 * Parses a POD amount string to wei (bigint).
 *
 * Supports decimal notation for fractional POD amounts.
 *
 * @param value - The POD amount as a string (e.g., "1.5", "100", "0.001")
 * @returns The amount in wei as bigint
 * @throws Error if the value has too many decimal places
 *
 * @example
 * ```typescript
 * parsePod('1');      // 1000000000000000000n (1 POD)
 * parsePod('1.5');    // 1500000000000000000n (1.5 POD)
 * parsePod('0.001');  // 1000000000000000n (0.001 POD)
 * ```
 */
export function parsePod(value: string): bigint {
  return parseUnits(value, POD_DECIMALS);
}

/**
 * Formats a wei amount to POD string.
 *
 * Removes trailing zeros for cleaner output.
 *
 * @param wei - The amount in wei
 * @returns The formatted POD amount as a string
 *
 * @example
 * ```typescript
 * formatPod(1000000000000000000n);  // '1'
 * formatPod(1500000000000000000n);  // '1.5'
 * formatPod(1000000000000000n);     // '0.001'
 * ```
 */
export function formatPod(wei: bigint): string {
  return formatUnits(wei, POD_DECIMALS);
}

/**
 * Formats a wei amount to POD string with fixed decimal places.
 *
 * @param wei - The amount in wei
 * @param decimals - Number of decimal places to show
 * @returns The formatted POD amount with exactly the specified decimal places
 *
 * @example
 * ```typescript
 * formatPodFixed(1500000000000000000n, 2);  // '1.50'
 * formatPodFixed(1000000000000000000n, 4);  // '1.0000'
 * ```
 */
export function formatPodFixed(wei: bigint, decimals: number): string {
  const formatted = formatUnits(wei, POD_DECIMALS);
  const parts = formatted.split(".");
  const integer = parts[0] ?? "0";
  const fraction = parts[1] ?? "";
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  return decimals > 0 ? `${integer}.${paddedFraction}` : integer;
}

/**
 * Parses a Gwei amount string to wei (bigint).
 *
 * @param value - The Gwei amount as a string (e.g., "1", "1.5")
 * @returns The amount in wei as bigint
 *
 * @example
 * ```typescript
 * parseGwei('1');    // 1000000000n
 * parseGwei('1.5');  // 1500000000n
 * ```
 */
export function parseGwei(value: string): bigint {
  return parseUnits(value, 9);
}

/**
 * Formats a wei amount to Gwei string.
 *
 * @param wei - The amount in wei
 * @returns The formatted Gwei amount as a string
 *
 * @example
 * ```typescript
 * formatGwei(1000000000n);  // '1'
 * formatGwei(1500000000n);  // '1.5'
 * ```
 */
export function formatGwei(wei: bigint): string {
  return formatUnits(wei, 9);
}

/**
 * Parses a decimal string to a bigint with the specified number of decimals.
 *
 * @param value - The decimal string (e.g., "1.5")
 * @param decimals - Number of decimal places
 * @returns The value as bigint in smallest unit
 * @throws Error if the value has too many decimal places
 *
 * @internal
 */
function parseUnits(value: string, decimals: number): bigint {
  // Trim whitespace
  value = value.trim();

  // Validate format
  if (!/^-?\d+(\.\d+)?$/.test(value)) {
    throw new Error(`Invalid decimal value: ${value}`);
  }

  const negative = value.startsWith("-");
  if (negative) {
    value = value.slice(1);
  }

  const [integer, fraction = ""] = value.split(".");

  if (fraction.length > decimals) {
    throw new Error(`Too many decimal places: ${String(fraction.length)} > ${String(decimals)}`);
  }

  const paddedFraction = fraction.padEnd(decimals, "0");
  const integerPart = integer ?? "0";
  const combined = integerPart + paddedFraction;
  const result = BigInt(combined);

  return negative ? -result : result;
}

/**
 * Formats a bigint to a decimal string with the specified number of decimals.
 *
 * @param value - The value in smallest unit
 * @param decimals - Number of decimal places
 * @returns The formatted decimal string
 *
 * @internal
 */
function formatUnits(value: bigint, decimals: number): string {
  const negative = value < 0n;
  if (negative) {
    value = -value;
  }

  const divisor = 10n ** BigInt(decimals);
  const integer = value / divisor;
  const remainder = value % divisor;

  let result: string;
  if (remainder === 0n) {
    result = integer.toString();
  } else {
    const fractionStr = remainder.toString().padStart(decimals, "0");
    // Remove trailing zeros
    const trimmedFraction = fractionStr.replace(/0+$/, "");
    result = `${String(integer)}.${trimmedFraction}`;
  }

  return negative ? `-${result}` : result;
}
