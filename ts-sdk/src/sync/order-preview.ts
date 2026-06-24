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
import { toNumber } from "../codec/units.js";

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
  const im = imRate(market.maxLeverage);
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
