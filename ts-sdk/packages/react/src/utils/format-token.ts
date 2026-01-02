/**
 * @module utils/format-token
 * @description Utilities for formatting token amounts
 */

/**
 * Options for formatTokenAmount utility.
 * @category Utilities
 */
export interface FormatTokenAmountOptions {
  /** Token decimals. Default: 18 */
  readonly decimals?: number;
  /** Token symbol to append */
  readonly symbol?: string;
  /** Use compact notation (e.g., 1.5M). Default: false */
  readonly compact?: boolean;
  /** Maximum fraction digits. Default: 4 */
  readonly maxDecimals?: number;
  /** Minimum fraction digits. Default: 0 */
  readonly minDecimals?: number;
  /** Locale for number formatting. Default: 'en-US' */
  readonly locale?: string;
  /** Use thousands separator. Default: true */
  readonly useGrouping?: boolean;
}

/**
 * Formats a token amount for display.
 *
 * @param amount - Amount in wei (bigint)
 * @param options - Formatting options
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * formatTokenAmount(1000000000000000000n);
 * // => '1' (1 ETH)
 *
 * formatTokenAmount(1500000000000000000n, { symbol: 'pETH' });
 * // => '1.5 pETH'
 *
 * formatTokenAmount(1234567890000000000000n, { compact: true });
 * // => '1.23K'
 *
 * formatTokenAmount(100000000n, { decimals: 6, symbol: 'USDC' });
 * // => '100 USDC'
 * ```
 */
export function formatTokenAmount(amount: bigint, options: FormatTokenAmountOptions = {}): string {
  const {
    decimals = 18,
    symbol,
    compact = false,
    maxDecimals = 4,
    minDecimals = 0,
    locale = "en-US",
    useGrouping = true,
  } = options;

  // Convert from wei to token units
  const divisor = 10n ** BigInt(decimals);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;

  // Convert to number for formatting (may lose precision for very large numbers)
  let value: number;
  if (fractionalPart === 0n) {
    value = Number(wholePart);
  } else {
    // Reconstruct decimal value
    const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
    value = Number(`${wholePart.toString()}.${fractionalStr}`);
  }

  // Format the number
  const formatter = new Intl.NumberFormat(locale, {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: minDecimals,
    useGrouping,
  });

  const formatted = formatter.format(value);

  // Append symbol if provided
  if (symbol !== undefined && symbol.length > 0) {
    return `${formatted} ${symbol}`;
  }

  return formatted;
}

/**
 * Parses a token amount string to bigint.
 *
 * @param amount - Amount string (e.g., '1.5')
 * @param decimals - Token decimals. Default: 18
 * @returns Amount in wei as bigint
 *
 * @example
 * ```typescript
 * parseTokenAmount('1.5');
 * // => 1500000000000000000n
 *
 * parseTokenAmount('100', 6);
 * // => 100000000n (USDC decimals)
 * ```
 */
export function parseTokenAmount(amount: string, decimals = 18): bigint {
  // Remove any whitespace and commas
  const cleaned = amount.replace(/[\s,]/g, "");

  // Split into whole and fractional parts
  const [whole, fractional = ""] = cleaned.split(".");

  // Pad or trim fractional part to match decimals
  const paddedFractional = fractional.padEnd(decimals, "0").slice(0, decimals);

  // Combine and convert to bigint
  const combined = (whole ?? "") + paddedFractional;
  return BigInt(combined);
}
