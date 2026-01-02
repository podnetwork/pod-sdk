/**
 * @module orderbook/types
 * @description Core types for orderbook trading
 */

/**
 * Order side enumeration.
 *
 * @example
 * ```typescript
 * import { Side } from '@podnetwork/orderbook';
 *
 * const side: Side = 'buy';
 * ```
 */
export type Side = "buy" | "sell";

/**
 * Array of valid side values for validation.
 * @internal
 */
export const SIDES = ["buy", "sell"] as const;

/**
 * Type guard to check if a value is a valid Side.
 *
 * @param value - Value to check
 * @returns true if value is a valid Side
 *
 * @example
 * ```typescript
 * if (isSide(userInput)) {
 *   // userInput is typed as Side
 * }
 * ```
 */
export function isSide(value: unknown): value is Side {
  return typeof value === "string" && SIDES.includes(value as Side);
}
