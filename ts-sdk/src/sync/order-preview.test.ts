import { describe, expect, it } from "vitest";

import type { Market, PositionsSnapshot } from "../types/public.js";
import { mul } from "../codec/fixed.js";
import { WAD } from "../codec/units.js";
import { previewOrder } from "./order-preview.js";

const LOT = 10n ** 12n; // 1e-6 base units — every staging/canary perp
const PRICE = 100n * WAD;

const market = (over: Partial<Market> = {}): Market => ({
  id: `0x${"00".repeat(31)}07`,
  name: "NVDA/USD",
  status: "active",
  type: "perp",
  base: { address: "0x01", symbol: "NVDA", name: "Nvidia Perpetual" },
  quote: { address: "0x02", symbol: "USD", name: "USD" },
  tickPrecision: 10n ** 16n,
  lotSize: LOT,
  minNotional: 0n,
  maxLeverage: 20,
  fundingWindowUs: 0,
  makerFee: 0n,
  takerFee: 0n,
  auctionIntervalMs: 500,
  ...over,
});

const snap = (cash = 10_000n * WAD): PositionsSnapshot => ({
  positions: [],
  totalUnrealizedPnl: 0n,
  totalRealizedPnl: 0n,
  perpsEquity: cash,
  accountValue: cash,
  cash,
  withdrawableCash: cash,
});

describe("previewOrder", () => {
  it("floors the size to the market's lot", () => {
    const notional = mul(3n * LOT + LOT / 2n, PRICE);
    expect(previewOrder(snap(), market(), { side: "long", price: PRICE, notional }).size).toBe(3n * LOT);
  });

  it("prices margin and fee off the snapped size, not the requested notional", () => {
    const requested = mul(3n * LOT + LOT / 2n, PRICE);
    const p = previewOrder(snap(), market({ takerFee: 45n * 10n ** 13n }), {
      side: "long", price: PRICE, notional: requested,
    });
    expect(p.notional).toBe(mul(3n * LOT, PRICE));
    expect(p.notional).toBeLessThan(requested);
    expect(p.marginRequired).toBe(mul(p.notional, WAD / 20n)); // im = 1/maxLeverage
    expect(p.estimatedFee).toBe(mul(p.notional, 45n * 10n ** 13n));
  });

  it("returns a zero size when the notional cannot buy one lot", () => {
    // `sufficientMargin` stays true — a zero order needs no margin — so callers must
    // gate on the size or this reaches the engine as `zero_size`.
    const p = previewOrder(snap(), market(), { side: "long", price: PRICE, notional: mul(LOT - 1n, PRICE) });
    expect(p.size).toBe(0n);
    expect(p.notional).toBe(0n);
    expect(p.sufficientMargin).toBe(true);
  });

  it("snaps a short's magnitude, keeping the sign", () => {
    const notional = mul(3n * LOT + LOT / 2n, PRICE);
    expect(previewOrder(snap(), market(), { side: "short", price: PRICE, notional }).size).toBe(-3n * LOT);
  });

  it("leaves the size unsnapped on a market with no lot grid", () => {
    // The pre-upgrade staging spot books still report lot_size: 1.
    const notional = mul(3n * LOT + 1n, PRICE);
    const p = previewOrder(snap(), market({ lotSize: 1n, type: "spot" }), { side: "long", price: PRICE, notional });
    expect(p.size).toBe(3n * LOT + 1n);
  });

  it("keeps maxNotional on the requested basis", () => {
    // An inverse: callers clamp the requested notional with it.
    const p = previewOrder(snap(), market(), { side: "long", price: PRICE, notional: 0n });
    expect(p.maxNotional).toBe(10_000n * WAD * 20n);
  });
});
