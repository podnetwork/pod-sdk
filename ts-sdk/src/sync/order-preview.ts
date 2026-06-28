// Pre-trade preview math — the financial logic behind an order-entry panel,
// kept out of the UI. Pure function over the live account snapshot + market.
//
// Mirrors the backend's cross-margin check:
//   margin_required = notional · initial_margin_rate         (rate = 1/max_leverage)
//   available_margin = withdrawable_cash                     (free cross margin)
//   max_notional     = available_margin / initial_margin_rate (≈ available · max_leverage)
//   implied_leverage = (Σ current perp notional + notional) / perps_equity

import type { Market, PositionsSnapshot } from "../types/public.js";
import { div, imRate, mul } from "../codec/fixed.js";
import { parseAmount, toNumber, WAD } from "../codec/units.js";

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

export interface OrderPreviewInput {
  side: "long" | "short";
  /** 1e18-scaled price: the limit price, or the current mark for a market order. */
  price: bigint;
  /** 1e18-scaled USD notional the user wants to open. */
  notional: bigint;
}

export interface OrderPreview {
  /** Signed order size = notional / price (+ long, − short). */
  size: bigint;
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
  const marginRequired = mul(input.notional, im);
  const maxNotional = im > 0n ? div(availableMargin, im) : 0n;

  const magnitude = input.price > 0n ? div(input.notional, input.price) : 0n;
  const size = input.side === "short" ? -magnitude : magnitude;

  const currentPerpNotional = snap.positions.reduce(
    (acc, p) => (p.kind === "perp" ? acc + p.notional : acc),
    0n,
  );
  const impliedLeverage = snap.perpsEquity > 0n
    ? toNumber(currentPerpNotional + input.notional) / toNumber(snap.perpsEquity)
    : 0;

  return {
    size,
    availableMargin,
    marginRequired,
    maxNotional,
    impliedLeverage,
    sufficientMargin: marginRequired <= availableMargin,
  };
}
