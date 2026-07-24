// Derived account metrics — the financial logic for the summary view, kept out
// of the UI layer. Pure function over a (live) PositionsSnapshot.
//
// Conventions (single source of truth so every consumer agrees):
//   net deposits      = account_value − total P&L   (capital put in; see the
//                       accounting identity — exact up to fees + accrued funding)
//   *_pct             = component / net_deposits     (return on capital)
//   effective leverage = Σ perp notional / perps_equity

import type { Position, PositionsSnapshot } from "../types/public.js";
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

/** Column totals for a perp positions table (sums over perp positions only). */
export interface PerpPositionTotals {
  count: number;
  notional: bigint;
  margin: bigint;
  fundingAccrued: bigint;
  unrealizedPnl: bigint;
  realizedPnl: bigint;
}

export function perpPositionTotals(positions: Position[]): PerpPositionTotals {
  const t: PerpPositionTotals = {
    count: 0, notional: 0n, margin: 0n, fundingAccrued: 0n, unrealizedPnl: 0n, realizedPnl: 0n,
  };
  for (const p of positions) {
    if (p.kind !== "perp") continue;
    t.count++;
    t.notional += p.notional;
    t.margin += p.margin;
    t.fundingAccrued += p.fundingAccrued;
    t.unrealizedPnl += p.unrealizedPnl;
    t.realizedPnl += p.realizedPnl;
  }
  return t;
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
