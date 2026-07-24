// Fixed-point (1e18) integer ops matching pod's trading/src/decimal.rs, shared
// by the account-math replications so they all round identically.

import { WAD } from "./units.js";

const absB = (x: bigint) => (x < 0n ? -x : x);

/** Decimal `*`: (a*b)/1e18 truncated toward zero. */
export function mul(a: bigint, b: bigint): bigint {
  const n = a * b;
  return n >= 0n ? n / WAD : -((-n) / WAD);
}

/** Decimal `/`: (a*1e18)/b truncated toward zero. */
export function div(a: bigint, b: bigint): bigint {
  if (b === 0n) return 0n;
  const n = a * WAD;
  return n >= 0n ? n / b : -((-n) / b);
}

/** Decimal `mul_floor`: (a*b)/1e18 rounded toward -infinity. */
export function mulFloor(a: bigint, b: bigint): bigint {
  const n = a * b;
  return n >= 0n ? n / WAD : -((-n + WAD - 1n) / WAD);
}

/** Decimal `mul_div_ceil`: (a*b)/d; positive magnitudes round up, negative truncate. */
export function mulDivCeil(a: bigint, b: bigint, d: bigint): bigint {
  if (d <= 0n) return 0n;
  const prod = absB(a) * absB(b);
  const q = prod / d;
  const r = prod % d;
  const negative = a < 0n !== b < 0n; // d is positive
  const mag = !negative && r !== 0n ? q + 1n : q;
  return negative ? -mag : mag;
}

/** initial_margin = UDecimal::ONE / max_leverage = floor(1e18 / L). */
export function imRate(maxLeverage: number): bigint {
  return maxLeverage > 0 ? WAD / BigInt(maxLeverage) : 0n;
}
