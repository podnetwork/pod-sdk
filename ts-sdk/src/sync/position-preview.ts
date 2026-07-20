// Pro-forma position math — what a not-yet-placed order does to a perp
// position and to its liquidation price, kept out of the UI. Pure functions
// over the (live) account snapshot + markets.
//
// The venue is cross-margined: a position's liquidation (maintenance-margin
// trigger) price is the mark P at which account equity falls to the account's
// maintenance requirement, holding every other market's mark constant:
//
//   equity(P)  = equity_const + S·(P − E)
//   mm_req(P)  = MMR·|S|·P + mm_others
//   equity_const = funding-adjusted cash + Σ_{m'≠m} (mark−E)·S   (pure drift)
//   ⇒ P = (S·E + mm_others − equity_const) / (S − MMR·|S|)
//
// Funding accrual on every open position is already folded into the enriched
// snapshot's `cash`, so the per-market PnL term is pure price drift.
// MMR = im/2 = 1/(2·maxLeverage), the venue's maintenance-margin rate.
//
// Read side-aware, like the venue reports it: a long triggers at mark ≤ P, a
// short at mark ≥ P; 0 is the sentinel for "no positive P" (long: safe
// everywhere; short: already past trigger).

import type { Market, PositionsSnapshot } from "../types/public.js";
import { imRate, mul, div } from "../codec/fixed.js";

const absB = (x: bigint) => (x < 0n ? -x : x);

/** A position to price liquidation for, as it would exist after some change.
 * Pass an existing position's own `size`/`entryPrice` (and no `cashDelta`) to
 * reproduce the venue-reported `PerpPosition.liquidationPrice`. */
export interface HypotheticalPosition {
  /** Signed size (+ long, − short); 0n → no position → returns 0n. */
  size: bigint;
  entryPrice: bigint;
  /** Cash the change adds/removes (realized price drift − fees). Funding on a
   * realized slice cancels against the accrual already folded into `cash`, so
   * pass pure drift, not funding-adjusted realized PnL. Default 0n. */
  cashDelta?: bigint;
}

/**
 * Cross-margin liquidation (maintenance-margin trigger) price for a
 * hypothetical position on `market`, with every other position of the
 * enriched `snap` held at its current mark. 0n = the venue's sentinel
 * (long: safe everywhere; short: already past trigger). Spot markets and
 * empty positions return 0n.
 *
 * `snap` MUST be an enriched snapshot (client.livePositions) — its `cash` is
 * the funding-adjusted cash the trigger equation expects.
 */
export function estimateLiquidationPrice(
  snap: PositionsSnapshot,
  markets: Market[],
  market: Market,
  hypo: HypotheticalPosition,
): bigint {
  if (market.type !== "perp" || hypo.size === 0n) return 0n;
  const { equityConst, mmrOthers } = liqTerms(snap, markets, market);
  const mmr = imRate(market.maxLeverage) / 2n;
  const denom = hypo.size - mul(absB(hypo.size), mmr); // long: |S|(1−MMR); short: −|S|(1+MMR)
  if (denom === 0n) return 0n;
  const p = div(
    mul(hypo.size, hypo.entryPrice) + mmrOthers - (equityConst + (hypo.cashDelta ?? 0n)),
    denom,
  );
  return p > 0n ? p : 0n;
}

/** The target-market-independent terms of the trigger-price equation:
 * equity_const = funding-adjusted cash + Σ_{m'≠m} (mark − E)·S (truncating
 * multiply, pure price drift), and mm_others = Σ_{m'≠m} |S|·MMR·mark at
 * current marks. */
function liqTerms(
  snap: PositionsSnapshot,
  markets: Market[],
  market: Market,
): { equityConst: bigint; mmrOthers: bigint } {
  const byId = new Map(markets.map((m) => [m.id, m]));
  let equityConst = snap.cash;
  let mmrOthers = 0n;
  for (const p of snap.positions) {
    if (p.kind !== "perp" || p.orderbookId === market.id) continue;
    equityConst += mul(p.markPrice - p.entryPrice, p.size);
    const other = byId.get(p.orderbookId);
    const mmr = imRate(other?.maxLeverage ?? 0) / 2n;
    mmrOthers += mul(mul(absB(p.size), mmr), p.markPrice);
  }
  return { equityConst, mmrOthers };
}

