// Pre-trade preview math — the financial logic behind an order-entry panel,
// kept out of the UI. Pure function over the live account snapshot + market.
//
// Mirrors the backend's cross-margin check:
//   margin_required = notional · initial_margin_rate         (rate = 1/max_leverage)
//   available_margin = withdrawable_cash                     (free cross margin)
//   max_notional     = available_margin / initial_margin_rate (≈ available · max_leverage)
//   implied_leverage = (Σ current perp notional + notional) / perps_equity
//   liquidation      = mark where equity falls to Σ maintenance margin (im/2)

import type { Market, PerpPosition, PositionsSnapshot, Trigger } from "../types/public.js";
import { div, imRate, mul } from "../codec/fixed.js";
import { alignSize, parseAmount, toNumber, WAD } from "../codec/units.js";

export interface ReturnPriceInput {
  entryPrice: bigint; // 1e18
  /** Position leverage (notional / initial margin). */
  leverage: number;
  side: "long" | "short";
  /** Target return on initial margin, signed: +20 = 20% gain, −10 = 10% loss. */
  returnPct: number;
}

/**
 * Mark price at which a perp position reaches `returnPct` return **on its
 * initial margin** (not a raw price move). Since margin = notional / leverage,
 * return-on-margin = price-move% × leverage, so the price move needed is
 * `returnPct / (100·leverage)` — e.g. +20% on a 10x long needs only a +2% move.
 * Used to turn a TP "gain %" / SL "loss %" into a trigger price.
 */
export function priceForReturn(p: ReturnPriceInput): bigint {
  if (p.leverage <= 0 || p.entryPrice <= 0n) return p.entryPrice;
  const move = p.returnPct / (100 * p.leverage); // fractional price move
  const dir = p.side === "long" ? 1 : -1; // longs profit up, shorts profit down
  const human = toNumber(p.entryPrice) * (1 + dir * move);
  return human > 0 ? parseAmount(human.toFixed(8)) : 0n;
}

/**
 * The TP and SL triggers nearest the mark for a position — i.e. the ones that
 * would fire first. "Nearest" depends on the side: a long's TPs sit above the
 * mark (nearest = lowest price) and its SLs below (nearest = highest); a short
 * is mirrored. Pass the position's triggers (already filtered to its market).
 */
export function closestTriggers(
  side: "long" | "short",
  triggers: Trigger[],
): { takeProfit?: Trigger; stopLoss?: Trigger } {
  const pick = (list: Trigger[], wantLowest: boolean): Trigger | undefined =>
    list.reduce<Trigger | undefined>((best, t) => {
      if (!best) return t;
      return (wantLowest ? t.triggerPrice < best.triggerPrice : t.triggerPrice > best.triggerPrice) ? t : best;
    }, undefined);
  const tps = triggers.filter((t) => t.triggerType === "take_profit");
  const sls = triggers.filter((t) => t.triggerType === "stop_loss");
  return {
    takeProfit: pick(tps, side === "long"), // long TP nearest = lowest; short = highest
    stopLoss: pick(sls, side === "short"), // long SL nearest = highest; short = lowest
  };
}

export interface OrderPreviewInput {
  side: "long" | "short";
  /** 1e18-scaled price: the limit price, or the current mark for a market order. */
  price: bigint;
  /** 1e18-scaled USD notional the user wants to open. */
  notional: bigint;
  /** Picks the fee rate for `estimatedFee`: market → taker, limit → maker.
   * Default market. (A crossing limit really pays taker — an estimate.) */
  orderType?: "limit" | "market";
}

export interface OrderPreview {
  /** Signed order size = notional / price, floored to `market.lotSize` (+ long, − short). */
  size: bigint;
  /** What `size` is worth at `price` — at most one lot under the requested notional.
   * Every money figure below derives from it, so preview and transaction agree. */
  notional: bigint;
  /** Free cross margin = withdrawable cash. */
  availableMargin: bigint;
  /** Initial margin this order locks = notional · initial_margin_rate. */
  marginRequired: bigint;
  /** Largest notional the free margin supports at this market's initial margin. */
  maxNotional: bigint;
  /** Account cross leverage if this order fills = (current + new notional) / equity. */
  impliedLeverage: number;
  /** Whether free margin covers the required margin. */
  sufficientMargin: boolean;
  /** Estimated fee = notional · fee rate (taker for market, maker for limit). */
  estimatedFee: bigint;
  /** Mark at which the account is liquidated once this order fills; undefined
   * when this market's mark alone can never trigger one. */
  liquidationPrice?: bigint;
}

const absB = (x: bigint) => (x < 0n ? -x : x);
const maxB = (a: bigint, b: bigint) => (a > b ? a : b);

/**
 * Mark at which the account is liquidated once an order for signed `size` fills
 * at `price`. Margin is cross, so this is an account-level number in one
 * market's mark: the engine liquidates at `perps_equity < Σ maintenance margin`,
 * and both sides are linear in this market's mark X (others held still) —
 *
 *   equity(X) = equity_now + (X − mark)·size_existing + (X − price)·size
 *   mm(X)     = mm_other + |size_total|·X·mm_rate
 *   root      = (mm_other − C) / (size_total − |size_total|·mm_rate),
 *               C = equity_now − mark·size_existing − price·size
 *
 * Undefined when no such mark exists (spot, flat after the fill, or a root at or
 * below zero), or when `maintenanceMargin` is absent while perps elsewhere need
 * it — one `market` cannot supply their rates, and `enrichPositions` sets the
 * field. Prices the fill only: fees and funding shift the real number.
 */
function liquidationPriceAfter(
  snap: PositionsSnapshot,
  market: Market,
  size: bigint,
  price: bigint,
): bigint | undefined {
  if (market.type !== "perp") return undefined;
  const mmRate = imRate(market.maxLeverage) / 2n; // mm = im/2, as in enrichPositions
  if (mmRate <= 0n) return undefined;

  // Split the book: this market's perps move with X, every other one is constant.
  let sizeExisting = 0n;
  let markedExisting = 0n; // Σ mark·size here — the uPnL already in equity_now
  let mmHere = 0n;
  let mmElsewhere = false;
  for (const p of snap.positions) {
    if (p.kind !== "perp" || p.size === 0n) continue;
    if (p.orderbookId === market.id) {
      sizeExisting += p.size;
      markedExisting += mul(p.markPrice, p.size);
      mmHere += mul(mul(absB(p.size), p.markPrice), mmRate);
    } else {
      mmElsewhere = true;
    }
  }
  if (snap.maintenanceMargin === undefined && mmElsewhere) return undefined;
  const mmOther = snap.maintenanceMargin === undefined
    ? 0n
    : maxB(0n, snap.maintenanceMargin - mmHere);

  const sizeTotal = sizeExisting + size;
  const denom = sizeTotal - mul(absB(sizeTotal), mmRate);
  if (denom === 0n) return undefined; // flat after the fill

  const c = snap.perpsEquity - markedExisting - mul(price, size);
  const liq = div(mmOther - c, denom);
  return liq > 0n ? liq : undefined;
}

export function previewOrder(
  snap: PositionsSnapshot,
  market: Market,
  input: OrderPreviewInput,
): OrderPreview {
  // Spot has no leverage: the order locks the full notional in cash (im = 1.0).
  // Perps use the market's initial-margin rate (1 / max_leverage).
  const im = market.type === "spot" ? WAD : imRate(market.maxLeverage);
  const availableMargin = snap.withdrawableCash;
  // An inverse, so it stays on the requested basis: callers clamp the request with it.
  const maxNotional = im > 0n ? div(availableMargin, im) : 0n;

  // Whole lots only, so the money below is priced off what is actually submitted.
  const magnitude = alignSize(input.price > 0n ? div(input.notional, input.price) : 0n, market.lotSize);
  const size = input.side === "short" ? -magnitude : magnitude;
  const notional = mul(magnitude, input.price);
  const marginRequired = mul(notional, im);

  const currentPerpNotional = snap.positions.reduce(
    (acc, p) => (p.kind === "perp" ? acc + p.notional : acc),
    0n,
  );
  const impliedLeverage = snap.perpsEquity > 0n
    ? toNumber(currentPerpNotional + notional) / toNumber(snap.perpsEquity)
    : 0;

  return {
    size,
    notional,
    availableMargin,
    marginRequired,
    maxNotional,
    impliedLeverage,
    sufficientMargin: marginRequired <= availableMargin,
    estimatedFee: mul(notional, input.orderType === "limit" ? market.makerFee : market.takerFee),
    liquidationPrice: liquidationPriceAfter(snap, market, size, input.price),
  };
}

export interface ClosePreview {
  /** PnL realized by closing `size` at `price` (funding and fees not included). */
  expectedPnl: bigint;
  /** USD notional of the closed size at `price`. */
  notional: bigint;
  /** Estimated fee = notional · `feeRate` (0 when no rate given). */
  fee: bigint;
}

/**
 * Expected result of closing `size` (magnitude) of a position at `price`:
 * long → (price − entry)·size, short → (entry − price)·size. Pass the intended
 * exit price — the limit price, or the protective bound for a market close —
 * and the market's fee rate (taker for a market close) for the fee estimate.
 */
export function closePreview(
  position: PerpPosition,
  input: { size: bigint; price: bigint; feeRate?: bigint },
): ClosePreview {
  const size = input.size < 0n ? -input.size : input.size;
  const move = position.side === "long"
    ? input.price - position.entryPrice
    : position.entryPrice - input.price;
  const notional = (input.price * size) / WAD;
  return {
    expectedPnl: (move * size) / WAD,
    notional,
    fee: mul(notional, input.feeRate ?? 0n),
  };
}
