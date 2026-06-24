// Unit conversions at the SDK boundary. Wire numerics are 1e18-scaled decimal
// strings; wire timestamps are microseconds. Public surface uses `bigint`
// (1e18-scaled) and millisecond `number` timestamps.

export const WAD = 1_000_000_000_000_000_000n; // 1e18
export const WAD_DECIMALS = 18;

/**
 * Parse a wire numeric (possibly null) into a 1e18-scaled bigint. Handles both
 * decimal (`"50000…"`, markets/stats) and hex (`"0x0"`, candles/orderbook)
 * encodings, signed values (`"-5"` / `"-0x5"`), and tolerates a fraction.
 */
export function dec(value: string | null | undefined): bigint {
  if (value === null || value === undefined || value === "") return 0n;
  const neg = value[0] === "-";
  const body = neg ? value.slice(1) : value;
  const dot = body.indexOf(".");
  const n = BigInt(dot === -1 ? body : body.slice(0, dot));
  return neg ? -n : n;
}

/** Parse an optional wire decimal; returns undefined when absent/null. */
export function decOpt(value: string | null | undefined): bigint | undefined {
  return value === null || value === undefined ? undefined : dec(value);
}

/** Microseconds (number) -> milliseconds (number). */
export function usToMs(us: number | string): number {
  const n = typeof us === "string" ? Number(us) : us;
  return Math.trunc(n / 1000);
}

export function usToMsOpt(us: number | string | null | undefined): number | undefined {
  return us === null || us === undefined ? undefined : usToMs(us);
}

/** Milliseconds -> microseconds (for request params that take micros). */
export function msToUs(ms: number): number {
  return ms * 1000;
}

/** Milliseconds -> unix seconds (REST candle/orders/stats query params). */
export function msToSecs(ms: number): number {
  return Math.trunc(ms / 1000);
}

export function secsToMs(secs: number): number {
  return secs * 1000;
}

// --- display helpers (lossy, for UI) ---

/**
 * Format a 1e18-scaled bigint as a decimal string with up to `precision` dp.
 * By default trailing zeros are trimmed; pass `{ trim: false }` for fixed
 * decimals (stable column widths in tables).
 */
export function formatAmount(
  value: bigint,
  decimals: number = WAD_DECIMALS,
  precision?: number,
  opts?: { trim?: boolean },
): string {
  const trim = opts?.trim ?? true;
  const scale = 10n ** BigInt(decimals);
  const neg = value < 0n;
  const abs = neg ? -value : value;
  const whole = abs / scale;
  let frac = (abs % scale).toString().padStart(decimals, "0");
  if (precision !== undefined) frac = frac.slice(0, precision);
  if (trim) frac = frac.replace(/0+$/, "");
  const sign = neg ? "-" : "";
  return frac.length ? `${sign}${whole}.${frac}` : `${sign}${whole}`;
}

/** Decimals implied by a market's 1e18-scaled tick (e.g. tick 1e16 → 2 dp). */
export function decimalsForTick(tick: bigint): number {
  if (tick <= 0n) return 2;
  return Math.max(0, Math.min(8, WAD_DECIMALS + 1 - tick.toString().length));
}

/** Format a price with fixed decimals derived from the market's tick precision. */
export function formatPrice(value: bigint, tickPrecision: bigint): string {
  return formatAmount(value, WAD_DECIMALS, decimalsForTick(tickPrecision), { trim: false });
}

/** Convert a 1e18-scaled bigint to a JS number (lossy; charts/PnL display). */
export function toNumber(value: bigint, decimals: number = WAD_DECIMALS): number {
  return Number(value) / 10 ** decimals;
}

/** Parse a human decimal string into a 1e18-scaled bigint. */
export function parseAmount(value: string, decimals: number = WAD_DECIMALS): bigint {
  const neg = value.trim().startsWith("-");
  const clean = neg ? value.trim().slice(1) : value.trim();
  const [whole = "0", frac = ""] = clean.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const scaled = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
  return neg ? -scaled : scaled;
}
