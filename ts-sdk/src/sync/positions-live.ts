// Live position recompute, replicating the backend's exact account math so the
// mark- AND funding-driven fields stay correct between pod_positions snapshots.
//
// A snapshot is only pushed when the account is touched, but mark moves every
// tick and funding accrues every tick. We recompute from the live marks and the
// live funding accumulator (funding_index, streamed via pod_markets), holding
// the snapshot's frozen inputs (native cash, size, entry, entry_funding, cost
// basis, resting-order escrow).
//
// EXACT replication of pod — see the cross-reference notes in pod at:
//   trading/src/perps/mod.rs `cross_budgets`     (equity)
//   trading/src/perps/mod.rs `pending_funding`   (funding)
// Integer semantics match trading/src/decimal.rs:
//   mul(a,b)            = (a*b)/1e18 truncated toward zero          (Decimal `*`)
//   mulFloor(a,b)       = (a*b)/1e18 rounded toward -infinity       (`mul_floor`)
//   funding_accrued = mul(funding_settling_index, size) - funding_basis
//   unrealized_pnl  = mul(mark, size) - cost_basis
//   cash_with_funding = native_cash - Σ funding_accrued
//
// Nothing is reconstructed here. `funding_index` is a different base — the
// undivided accumulator, window_us times the index positions settle on — so it
// can never be subtracted from a position's entry figure.

import type { Market, MarketId, Position, PositionsSnapshot } from "../types/public.js";
import { imRate, mul, mulFloor } from "../codec/fixed.js";

const absB = (x: bigint) => (x < 0n ? -x : x);
const maxB = (a: bigint, b: bigint) => (a > b ? a : b);

export function enrichPositions(snap: PositionsSnapshot, markets: Market[]): PositionsSnapshot {
  const byId = new Map<MarketId, Market>(markets.map((m) => [m.id, m]));

  let priceUpnl = 0n; // Σ perp price PnL at live mark (excludes funding)
  let priceUpnlSnap = 0n; // Σ perp price PnL recorded in the snapshot
  let fundingLiveTotal = 0n; // Σ funding accrued at the live funding_index
  let fundingSnapTotal = 0n; // Σ funding accrued in the snapshot
  let im = 0n; // Σ initial-margin requirement at live notional
  let mm = 0n; // Σ maintenance-margin requirement at live notional
  let dSpot = 0n; // change in spot mark value vs snapshot (slope = balance)
  // Withdrawable is the node's figure moved by the equity change since it was
  // read: its floor counts notional the SDK does not model. Market data older
  // than the snapshot (another node behind a load balancer) moves nothing.
  let dWithdrawable = 0n;

  const positions: Position[] = snap.positions.map((p) => {
    const market = p.orderbookId ? byId.get(p.orderbookId) : undefined;

    if (p.kind === "perp") {
      // Server-banded mark from pod_markets. Before a market's first trade the
      // mark is unseeded (0) — fall back to the entry price so uPnL is 0 rather
      // than a spurious −entry·size that would wrongly zero withdrawable cash.
      const liveMark = market?.markPrice && market.markPrice > 0n ? market.markPrice : p.markPrice;
      const mark = liveMark > 0n ? liveMark : p.entryPrice;
      // The entry-price fallback rounds against the holder.
      const pnlAt = (m: bigint) => p.costBasis !== undefined
        ? mul(m, p.size) - p.costBasis
        : mulFloor(m - p.entryPrice, p.size); // pure price drift (signed)
      const upnl = pnlAt(mark);
      const sizeQuote = mul(absB(p.size), mark); // = notional
      const imr = market?.initialMargin ?? imRate(market?.maxLeverage ?? 0);
      im += mul(sizeQuote, imr);
      mm += mul(sizeQuote, imr / 2n);
      priceUpnl += upnl;
      priceUpnlSnap += p.unrealizedPnl;

      // The settling index streams via pod_markets, the basis is frozen in the
      // snapshot. Without both, hold the snapshot's figure.
      let funding = p.fundingAccrued;
      if (market?.fundingSettlingIndex !== undefined && p.fundingBasis !== undefined) {
        funding = mul(market.fundingSettlingIndex, p.size) - p.fundingBasis;
      }
      fundingLiveTotal += funding;
      fundingSnapTotal += p.fundingAccrued;
      const marketFresh = snap.timestampUs === undefined
        || (market?.dynamicsUs !== undefined && market.dynamicsUs >= snap.timestampUs);
      if (marketFresh) {
        dWithdrawable += upnl - pnlAt(p.markPrice > 0n ? p.markPrice : p.entryPrice)
          - (funding - p.fundingAccrued);
      }

      return { ...p, markPrice: mark, unrealizedPnl: upnl, notional: sizeQuote, fundingAccrued: funding };
    }

    const mark = market?.lastClearingPrice ?? market?.markPrice ?? p.markPrice;
    dSpot += mul(p.balance, mark) - mul(p.balance, p.markPrice);
    return { ...p, markPrice: mark, unrealizedPnl: p.unrealizedPnl + (mul(p.balance, mark) - mul(p.balance, p.markPrice)) };
  });

  // native_cash is frozen between snapshots; back it out of the snapshot's
  // funding-adjusted cash, then re-apply funding at the live index.
  const nativeCash = snap.cash + fundingSnapTotal;
  const cashWithFunding = nativeCash - fundingLiveTotal;

  // EXACT (perp-only, integer-faithful): equity = cash_with_funding + Σ price PnL.
  const perpsEquity = cashWithFunding + priceUpnl;
  // The node clamps at zero, so a zero base hides how far under the floor the
  // account is: a rise must not surface headroom that does not exist.
  const withdrawableCash = perpsEquity < mm || snap.withdrawableCash === 0n
    ? 0n
    : maxB(0n, snap.withdrawableCash + dWithdrawable);

  // account_value moves with perp equity (incl. funding) AND spot mark; total
  // uPnL is pure price drift only (funding is reported separately). Re-baseline
  // off the snapshot with exact slopes, leaving the frozen resting escrow alone.
  const dPriceUpnl = priceUpnl - priceUpnlSnap;
  return {
    positions,
    cash: cashWithFunding,
    totalRealizedPnl: snap.totalRealizedPnl,
    perpsEquity,
    withdrawableCash,
    initialMargin: im,
    maintenanceMargin: mm,
    totalUnrealizedPnl: snap.totalUnrealizedPnl + dPriceUpnl + dSpot,
    accountValue: snap.accountValue + (perpsEquity - snap.perpsEquity) + dSpot,
  };
}
