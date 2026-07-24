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
//   trading/src/perps/mod.rs `cross_budgets`     (withdrawable / equity)
//   trading/src/perps/mod.rs `funding_accrued`    (funding)
//   trading/src/perps/config.rs `into_market`     (margin-rate derivation)
// Integer semantics match trading/src/decimal.rs:
//   mul(a,b)            = (a*b)/1e18 truncated toward zero          (Decimal `*`)
//   mulFloor(a,b)       = (a*b)/1e18 rounded toward -infinity       (`mul_floor`)
//   mulDivCeil(a,b,d)   = (a*b)/d, positive results rounded up      (`mul_div_ceil`)
//   im = 1e18 / max_leverage ; mm = im / 2
//   funding_accrued = mulDivCeil(funding_index - entry_funding, size, window_us*1e18)
//   cash_with_funding = native_cash - Σ funding_accrued

import type { Market, MarketId, Position, PositionsSnapshot } from "../types/public.js";
import { WAD } from "../codec/units.js";
import { imRate, mul, mulDivCeil, mulFloor } from "../codec/fixed.js";

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

  const positions: Position[] = snap.positions.map((p) => {
    const market = p.orderbookId ? byId.get(p.orderbookId) : undefined;

    if (p.kind === "perp") {
      // Server-banded mark from pod_markets. Before a market's first trade the
      // mark is unseeded (0) — fall back to the entry price so uPnL is 0 rather
      // than a spurious −entry·size that would wrongly zero withdrawable cash.
      const liveMark = market?.markPrice && market.markPrice > 0n ? market.markPrice : p.markPrice;
      const mark = liveMark > 0n ? liveMark : p.entryPrice;
      const upnl = mulFloor(mark - p.entryPrice, p.size); // pure price drift (signed)
      const sizeQuote = mul(absB(p.size), mark); // = notional
      const imr = imRate(market?.maxLeverage ?? 0);
      im += mul(sizeQuote, imr);
      mm += mul(sizeQuote, imr / 2n);
      priceUpnl += upnl;
      priceUpnlSnap += p.unrealizedPnl;

      // Live funding: mul_div_ceil(funding_index - entry_funding, size, window_us*1e18).
      // funding_index (= market.funding) streams via pod_markets; if unavailable,
      // hold the snapshot value (re-aligned by the periodic REST resync).
      let funding = p.fundingAccrued;
      if (market?.fundingIndex !== undefined && market.fundingWindowUs) {
        funding = mulDivCeil(
          market.fundingIndex - p.entryFunding,
          p.size,
          BigInt(market.fundingWindowUs) * WAD,
        );
      }
      fundingLiveTotal += funding;
      fundingSnapTotal += p.fundingAccrued;

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

  // EXACT (perp-only, integer-faithful): equity = cash_with_funding + Σ price PnL;
  // withdrawable = max(0, equity - Σ IM), forced to 0 below maintenance margin.
  const perpsEquity = cashWithFunding + priceUpnl;
  const withdrawableCash = perpsEquity < mm ? 0n : maxB(0n, perpsEquity - im);

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
    totalUnrealizedPnl: snap.totalUnrealizedPnl + dPriceUpnl + dSpot,
    accountValue: snap.accountValue + (perpsEquity - snap.perpsEquity) + dSpot,
  };
}
