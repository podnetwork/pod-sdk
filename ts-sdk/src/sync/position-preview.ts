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

import type { Market, PerpPosition, PositionsSnapshot } from "../types/public.js";
import { imRate, mul, mulFloor, mulDivCeil, div } from "../codec/fixed.js";
import { toNumber, WAD } from "../codec/units.js";

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

export interface PositionChangeInput {
  side: "long" | "short";
  /** Expected fill price: the limit price, or the protective bound for market. */
  price: bigint;
  /** 1e18-scaled USD notional of the order. */
  notional: bigint;
  /** Fee rate for the `fee` estimate (taker for market orders). Default 0n. */
  feeRate?: bigint;
}

export interface PositionChangePreview {
  /** What the order does to the account's position on this market. */
  zone: "open" | "add" | "reduce" | "close" | "flip";
  /** Signed size the order fills (+ long, − short). */
  sizeDelta: bigint;
  /** Signed position size after the fill (0n on close). */
  newSize: bigint;
  /** Entry after the fill: blended on add, unchanged on reduce, the fill
   * price on open/flip, 0n on close. */
  newEntryPrice: bigint;
  /** Allocated initial margin after the fill (the venue's committed-margin
   * model: accumulate on open/add, release proportionally on reduce, reset
   * on flip/close). */
  newMargin: bigint;
  /** Position leverage after the fill = notional at fill price / newMargin. */
  newLeverage: number;
  /** PnL realized on the closed slice: price drift minus funding owed on the
   * slice, the way the venue realizes it. 0n for open/add. */
  realizedPnl: bigint;
  /** Estimated fee = notional · feeRate. */
  fee: bigint;
  /** Cross-margin liquidation price after the fill (0n = none/safe — see
   * estimateLiquidationPrice for the side-aware reading). */
  estLiquidationPrice: bigint;
}

/**
 * Pro-forma of an order against the account's current position on `market`,
 * mirroring the venue's fill accounting: blended entry (rounded against the
 * holder) on same-side adds, proportional margin release + realized PnL on
 * reduces, full realize + fresh entry on flips.
 *
 * `snap` MUST be an enriched snapshot (client.livePositions). The result is
 * an estimate at the given fill price — a real fill may clear at a better
 * price (batch-auction surplus) and partial fills land in between.
 */
export function previewPositionChange(
  snap: PositionsSnapshot,
  markets: Market[],
  market: Market,
  input: PositionChangeInput,
): PositionChangePreview {
  const im = imRate(market.maxLeverage);
  const magnitude = input.price > 0n ? div(input.notional, input.price) : 0n;
  const sizeDelta = input.side === "short" ? -magnitude : magnitude;
  const fee = mul(input.notional, input.feeRate ?? 0n);
  const pos = snap.positions.find(
    (p): p is PerpPosition => p.kind === "perp" && p.orderbookId === market.id && p.size !== 0n,
  );

  const newSize = (pos?.size ?? 0n) + sizeDelta;
  const zone: PositionChangePreview["zone"] = !pos
    ? "open"
    : newSize === 0n
      ? "close"
      : (newSize > 0n) === (pos.size > 0n)
        ? absB(newSize) > absB(pos.size) ? "add" : "reduce"
        : "flip";

  // Realized on the closed slice (reduce/close: the delta; flip: the whole
  // position): price drift floored toward −∞, minus funding on the slice
  // rounded against the holder. Funding needs the live accumulator; fall back
  // to prorating the position's accrued funding when it isn't streaming.
  let drift = 0n; // pure price drift (this is what moves the account's cash)
  let realizedPnl = 0n;
  if (pos && zone !== "open" && zone !== "add") {
    const closed = zone === "flip" ? pos.size : -sizeDelta; // signed, same sign as pos.size
    drift = mulFloor(input.price - pos.entryPrice, closed);
    // closed/size is a positive fraction (same signs), so the pro-rata share
    // keeps fundingAccrued's own sign — divide magnitudes, not the signed size.
    const funding = market.fundingIndex !== undefined && market.fundingWindowUs
      ? mulDivCeil(market.fundingIndex - pos.entryFunding, closed, BigInt(market.fundingWindowUs) * WAD)
      : mulDivCeil(pos.fundingAccrued, absB(closed), absB(pos.size));
    realizedPnl = drift - funding;
  }

  let newEntryPrice: bigint;
  let newMargin: bigint;
  switch (zone) {
    case "open":
      newEntryPrice = input.price;
      newMargin = mul(mul(absB(newSize), input.price), im);
      break;
    case "add": {
      // Blend entry by size — (E·|S| + price·|q|)/(|S|+|q|) — rounded against
      // the holder: up for a long, truncated for a short.
      const w = absB(pos!.size) + absB(sizeDelta);
      const num = pos!.entryPrice * absB(pos!.size) + input.price * absB(sizeDelta);
      newEntryPrice = num / w + (newSize > 0n && num % w !== 0n ? 1n : 0n);
      newMargin = pos!.margin + mul(mul(absB(sizeDelta), input.price), im);
      break;
    }
    case "reduce": {
      newEntryPrice = pos!.entryPrice;
      const ratio = absB(div(-sizeDelta, pos!.size));
      newMargin = pos!.margin - mul(pos!.margin, ratio);
      break;
    }
    case "close":
      newEntryPrice = 0n;
      newMargin = 0n;
      break;
    case "flip":
      newEntryPrice = input.price;
      newMargin = mul(mul(absB(newSize), input.price), im);
      break;
  }

  return {
    zone,
    sizeDelta,
    newSize,
    newEntryPrice,
    newMargin,
    newLeverage: newMargin > 0n ? toNumber(mul(absB(newSize), input.price)) / toNumber(newMargin) : 0,
    realizedPnl,
    fee,
    // Funding on the realized slice cancels against the accrual already folded
    // into the enriched cash, so the equity change is pure drift − fee.
    estLiquidationPrice: estimateLiquidationPrice(snap, markets, market, {
      size: newSize,
      entryPrice: newEntryPrice,
      cashDelta: drift - fee,
    }),
  };
}

/**
 * Cash to add to the account (positive — a deposit / margin top-up) or that
 * could be removed (negative) so the EXISTING position on `market` has its
 * liquidation price land exactly on `targetLiq`. Closed-form inverse of the
 * trigger-price equation in cash. Powers "drag the liquidation line" on an
 * open position. Returns undefined when there is no open position (or spot).
 *
 * Note: the venue has no margin-adjust transaction yet — this sizes the
 * deposit such a flow would need, it does not build one.
 */
export function cashForLiquidation(
  snap: PositionsSnapshot,
  markets: Market[],
  market: Market,
  targetLiq: bigint,
): bigint | undefined {
  if (market.type !== "perp") return undefined;
  const pos = snap.positions.find(
    (p): p is PerpPosition => p.kind === "perp" && p.orderbookId === market.id && p.size !== 0n,
  );
  if (!pos) return undefined;
  const { equityConst, mmrOthers } = liqTerms(snap, markets, market);
  const mmr = imRate(market.maxLeverage) / 2n;
  const denom = pos.size - mul(absB(pos.size), mmr);
  // P = (S·E + mm_others − (equity_const + c)) / denom, solved for c.
  return mul(pos.size, pos.entryPrice) + mmrOthers - equityConst - mul(targetLiq, denom);
}

/**
 * Order notional whose post-fill liquidation price lands on `targetLiq` —
 * sizing an order by dragging its draft liquidation line. Bisects
 * previewPositionChange (the liq moves monotonically toward the fill price as
 * notional grows: up for a long, down for a short). Returns undefined when the
 * target is on the wrong side of the fill price or beyond `maxNotional`'s
 * reach; a fresh open on an empty book still needs `price` (mark or limit).
 */
export function notionalForLiquidation(
  snap: PositionsSnapshot,
  markets: Market[],
  market: Market,
  input: { side: "long" | "short"; price: bigint; targetLiq: bigint; maxNotional?: bigint; feeRate?: bigint },
): bigint | undefined {
  if (market.type !== "perp" || input.price <= 0n || input.targetLiq <= 0n) return undefined;
  const im = imRate(market.maxLeverage);
  const hi0 = input.maxNotional ?? (im > 0n ? div(snap.withdrawableCash, im) : 0n);
  if (hi0 <= 0n) return undefined;
  const liqAt = (notional: bigint): bigint =>
    previewPositionChange(snap, markets, market, { ...input, notional }).estLiquidationPrice;
  // Longs liquidate below the fill price, shorts above; f(n) approaches the
  // fill price monotonically from that side. dir·f is increasing in n once a
  // position exists (0-sentinel = long safe-everywhere ≡ −∞ under dir).
  const dir = input.side === "long" ? 1n : -1n;
  const key = (liq: bigint): bigint => (liq === 0n && input.side === "long" ? -(2n ** 255n) : dir * liq);
  const target = key(input.targetLiq);
  if (key(liqAt(hi0)) < target) return undefined; // out of reach at max size
  let lo = 0n, hi = hi0;
  for (let i = 0; i < 64 && hi - lo > 1n; i++) {
    const mid = (lo + hi) / 2n;
    if (key(liqAt(mid)) < target) lo = mid;
    else hi = mid;
  }
  return hi;
}
