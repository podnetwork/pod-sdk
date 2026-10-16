import { describe, expect, it } from "vitest";

import type { Market, PerpPosition, PositionsSnapshot } from "../types/public.js";
import { div, imRate, mul } from "../codec/fixed.js";
import { WAD } from "../codec/units.js";
import { estimateFill, previewOrder } from "./order-preview.js";

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

const MM = imRate(20) / 2n; // mm = im/2 = 2.5% at 20x

const perp = (over: Partial<PerpPosition> = {}): PerpPosition => ({
  kind: "perp",
  orderbookId: `0x${"00".repeat(31)}07`,
  side: "long",
  size: 10n * LOT,
  notional: mul(10n * LOT, PRICE),
  entryPrice: PRICE,
  markPrice: PRICE,
  margin: 0n,
  leverage: 20,
  fundingAccrued: 0n,
  entryFunding: 0n,
  liquidationPrice: 0n,
  unrealizedPnl: 0n,
  realizedPnl: 0n,
  ...over,
});

describe("previewOrder liquidationPrice", () => {
  // 20 units at 100 = 2,000 notional, whose initial margin at 20x is 100.
  const SIZE = 20n * WAD;
  const NOTIONAL = mul(SIZE, PRICE);

  it("solves equity = maintenance margin for a fresh long", () => {
    // Flat account, so equity is cash.
    const equity = 100n * WAD;
    const p = previewOrder(snap(equity), market(), { side: "long", price: PRICE, notional: NOTIONAL });
    expect(p.liquidationPrice).toBe(div(NOTIONAL - equity, SIZE - mul(SIZE, MM)));
    expect(p.liquidationPrice!).toBeLessThan(PRICE); // a long liquidates below the fill
    const thicker = previewOrder(snap(equity * 2n), market(), {
      side: "long", price: PRICE, notional: NOTIONAL,
    });
    expect(thicker.liquidationPrice!).toBeLessThan(p.liquidationPrice!);
  });

  it("puts a short's liquidation above the fill", () => {
    const p = previewOrder(snap(100n * WAD), market(), { side: "short", price: PRICE, notional: NOTIONAL });
    expect(p.liquidationPrice!).toBeGreaterThan(PRICE);
  });

  it("nets against an existing position in the same market", () => {
    const held = perp({ size: SIZE });
    const s: PositionsSnapshot = {
      ...snap(300n * WAD),
      positions: [held],
      maintenanceMargin: mul(NOTIONAL, MM),
    };

    // Shorting the whole holding leaves the account flat: no mark can liquidate it.
    expect(previewOrder(s, market(), { side: "short", price: PRICE, notional: NOTIONAL }).liquidationPrice)
      .toBeUndefined();

    // Doubling it instead puts liquidation nearer the mark than the same order on
    // an empty account — the same equity now carries twice the size.
    const doubled = previewOrder(s, market(), { side: "long", price: PRICE, notional: NOTIONAL });
    const fresh = previewOrder(snap(300n * WAD), market(), { side: "long", price: PRICE, notional: NOTIONAL });
    expect(doubled.liquidationPrice!).toBeGreaterThan(fresh.liquidationPrice!);
  });

  it("charges the maintenance margin of positions in other markets", () => {
    const s: PositionsSnapshot = {
      ...snap(300n * WAD),
      positions: [perp({ orderbookId: `0x${"00".repeat(31)}09`, size: SIZE })],
      maintenanceMargin: mul(NOTIONAL, MM),
    };
    // Their requirement is equity this order cannot draw on: liquidation sits closer.
    const p = previewOrder(s, market(), { side: "long", price: PRICE, notional: NOTIONAL });
    const alone = previewOrder(snap(300n * WAD), market(), { side: "long", price: PRICE, notional: NOTIONAL });
    expect(p.liquidationPrice!).toBeGreaterThan(alone.liquidationPrice!);
  });

  it("declines to guess when another market's requirement is unknown", () => {
    // A raw REST snapshot has no maintenanceMargin, and the other market's rate is
    // unknowable here — report nothing rather than a too-forgiving price.
    const s: PositionsSnapshot = {
      ...snap(300n * WAD),
      positions: [perp({ orderbookId: `0x${"00".repeat(31)}09`, size: SIZE })],
    };
    expect(previewOrder(s, market(), { side: "long", price: PRICE, notional: NOTIONAL }).liquidationPrice)
      .toBeUndefined();
  });

  it("reports nothing for a long the rest of the account fully covers", () => {
    // Equity far above the notional: the root is negative, i.e. unreachable.
    const p = previewOrder(snap(1_000_000n * WAD), market(), { side: "long", price: PRICE, notional: NOTIONAL });
    expect(p.liquidationPrice).toBeUndefined();
  });

  it("reports nothing on spot, which has no liquidation", () => {
    const p = previewOrder(snap(), market({ type: "spot" }), { side: "long", price: PRICE, notional: NOTIONAL });
    expect(p.liquidationPrice).toBeUndefined();
  });
});

describe("estimateFill", () => {
  const lvl = (price: number, volume: number) => ({ price: BigInt(price) * WAD, volume: BigInt(volume) * WAD, total: 0n, depth: 0 });
  const book = {
    asks: [lvl(100, 1), lvl(101, 2), lvl(103, 5)],
    bids: [lvl(99, 1), lvl(98, 2)],
  };

  it("clears at a part-taken best level with no slippage", () => {
    const f = estimateFill(book, "long", WAD / 2n);
    expect(f).toEqual({ filled: WAD / 2n, price: 100n * WAD, slippagePct: 0, exhausted: false });
  });

  it("taking a level whole clears midway to the next one", () => {
    expect(estimateFill(book, "long", WAD).price).toBe(100n * WAD + WAD / 2n);
  });

  it("charges the whole fill the last level's price, not the average across levels", () => {
    const f = estimateFill(book, "long", 2n * WAD);
    expect(f.price).toBe(101n * WAD); // 101 still holds 1 after this fill
    expect(f.slippagePct).toBeCloseTo(1, 6);
  });

  it("stops at the limit, and the clearing price never passes it", () => {
    // 100 and 101 taken whole: the midpoint to 103 would be 102.5, over the limit.
    const f = estimateFill(book, "long", 5n * WAD, 102n * WAD);
    expect(f.filled).toBe(3n * WAD);
    expect(f.price).toBe(102n * WAD);
    expect(f.exhausted).toBe(false);
  });

  it("fills nothing when the best level is already past the limit", () => {
    expect(estimateFill(book, "long", WAD, 99n * WAD)).toEqual({ filled: 0n, exhausted: false });
  });

  it("walks the bids for a short, slippage still counted as worse", () => {
    const f = estimateFill(book, "short", 2n * WAD);
    expect(f.price).toBe(98n * WAD);
    expect(f.slippagePct).toBeCloseTo((1 / 99) * 100, 6);
  });

  it("flags running off the levels given, clearing at the last one with nothing past it", () => {
    const f = estimateFill(book, "short", 10n * WAD, 90n * WAD);
    expect(f.filled).toBe(3n * WAD);
    expect(f.price).toBe(98n * WAD);
    expect(f.exhausted).toBe(true);
  });

  it("an empty side fills nothing and is exhausted", () => {
    expect(estimateFill({ asks: [], bids: [] }, "long", WAD)).toEqual({ filled: 0n, exhausted: true });
  });
});
