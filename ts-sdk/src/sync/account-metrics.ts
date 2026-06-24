// Derived account metrics — the financial logic for the summary view, kept out
// of the UI layer. Pure function over a (live) PositionsSnapshot.
//
// Conventions (single source of truth so every consumer agrees):
//   net deposits      = account_value − total P&L   (capital put in; see the
//                       accounting identity — exact up to fees + accrued funding)
//   *_pct             = component / net_deposits     (return on capital)
//   effective leverage = Σ perp notional / perps_equity

import type { PositionsSnapshot } from "../types/public.js";
import { toNumber } from "../codec/units.js";

export interface AccountMetrics {
  /** account_value − total P&L (≈ net deposits / capital base). */
  netDeposits: bigint;
  totalPnl: bigint;
  /** % of net deposits. */
  totalPnlPct: number;
  unrealizedPnlPct: number;
  realizedPnlPct: number;
  /** Σ |notional| over perp positions. */
  perpNotional: bigint;
  /** Σ perp notional / perps_equity. */
  effectiveLeverage: number;
}

export function accountMetrics(s: PositionsSnapshot): AccountMetrics {
  const totalPnl = s.totalUnrealizedPnl + s.totalRealizedPnl;
  const netDeposits = s.accountValue - totalPnl;
  const pct = (v: bigint): number =>
    netDeposits > 0n ? (toNumber(v) / toNumber(netDeposits)) * 100 : 0;
  const perpNotional = s.positions.reduce(
    (acc, p) => (p.kind === "perp" ? acc + p.notional : acc),
    0n,
  );
  return {
    netDeposits,
    totalPnl,
    totalPnlPct: pct(totalPnl),
    unrealizedPnlPct: pct(s.totalUnrealizedPnl),
    realizedPnlPct: pct(s.totalRealizedPnl),
    perpNotional,
    effectiveLeverage: s.perpsEquity > 0n ? toNumber(perpNotional) / toNumber(s.perpsEquity) : 0,
  };
}
