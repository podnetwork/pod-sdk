import { describe, expect, it } from "vitest";
import { pnlSeries, quantizeToGrid, settlingIndex } from "./pnl.js";
import { WAD } from "./codec/units.js";
import type { PnlHistoricalData } from "./types/public.js";

const e18 = (n: number) => BigInt(n) * WAD;
const sec = (s: number) => s * 1_000_000;
const WINDOW_US = 8 * 3_600 * 1_000_000;

// ADR 0054 §4 worked example: one perp long and one spot holding, the perp
// partially closed at 150s; realized 50, drift 240, funding 20 at every point,
// and with 1000 cash and 5 escrowed the account is worth 1005 + (600 − 400 − 20) + 240.
const data: PnlHistoricalData = {
  fromUs: sec(30),
  toUs: sec(240),
  stepUs: sec(60),
  solutionNowUs: sec(1000),
  accounts: [{ timeUs: sec(50), realized: e18(50), cash: e18(1000), escrow: e18(5) }],
  markets: [
    {
      orderbookId: "0x07",
      marketType: "perp",
      fundingWindowUs: WINDOW_US,
      fundingGrid: 10n ** 12n,
      positions: [
        { timeUs: sec(50), size: e18(10), costBasis: e18(1000), fundingBasis: 0n },
        { timeUs: sec(150), size: e18(5), costBasis: e18(400), fundingBasis: -e18(10) },
      ],
      ticks: [
        // An accumulator that settles to exactly 2 per unit of size.
        { timeUs: sec(50), markPrice: e18(120), fundingIndex: e18(2) * BigInt(WINDOW_US) },
        { timeUs: sec(150), markPrice: e18(120), fundingIndex: e18(2) * BigInt(WINDOW_US) },
      ],
    },
    {
      orderbookId: "0x08",
      marketType: "spot",
      fundingWindowUs: 0,
      positions: [{ timeUs: sec(50), size: e18(4), costBasis: e18(200), fundingBasis: 0n }],
      ticks: [{ timeUs: sec(50), markPrice: 0n, clearingPrice: e18(60) }],
    },
  ],
};

describe("pnlSeries", () => {
  it("prices the ADR example on the step grid", () => {
    const points = pnlSeries(data);
    expect(points.map((p) => p.time)).toEqual([60_000, 120_000, 180_000]);
    for (const p of points) {
      expect(p.realized).toBe(e18(50));
      expect(p.unrealized).toBe(e18(240));
      expect(p.funding).toBe(e18(20));
      expect(p.pnl).toBe(e18(270));
      expect(p.accountValue).toBe(e18(1425));
    }
  });

  it("agrees with itself on overlapping windows and omits points before the first record", () => {
    const whole = pnlSeries(data);
    const later = pnlSeries({ ...data, fromUs: sec(90), toUs: sec(200) });
    expect(later).toEqual(whole.slice(1));
    const early = pnlSeries({ ...data, fromUs: 0, toUs: sec(120) });
    expect(early.map((p) => p.time)).toEqual([60_000]);
  });

  it("omits points at which a holding has no price yet, and prices them once it does", () => {
    const unpriced = {
      orderbookId: "0x09" as const,
      marketType: "spot" as const,
      fundingWindowUs: 0,
      positions: [{ timeUs: sec(50), size: e18(1), costBasis: e18(10), fundingBasis: 0n }],
      ticks: [{ timeUs: sec(50), markPrice: 0n }],
    };
    expect(pnlSeries({ ...data, markets: [...data.markets, unpriced] })).toEqual([]);
    const cleared = { ...unpriced, ticks: [...unpriced.ticks, { timeUs: sec(150), markPrice: 0n, clearingPrice: e18(10) }] };
    const points = pnlSeries({ ...data, markets: [...data.markets, cleared] });
    expect(points.map((p) => p.time)).toEqual([180_000]);
    expect(points[0]?.pnl).toBe(e18(270));
    expect(points[0]?.accountValue).toBe(e18(1435));
  });

  it("includes the batch that lands exactly on a point", () => {
    const [point] = pnlSeries({ ...data, fromUs: sec(50), toUs: sec(51), stepUs: sec(1) });
    expect(point?.time).toBe(50_000);
    expect(point?.pnl).toBe(e18(270));
  });
});

describe("quantizeToGrid", () => {
  it("rounds to the nearest multiple, ties away from zero, odd, identity on a zero grid", () => {
    expect(quantizeToGrid(7n, 5n)).toBe(5n);
    expect(quantizeToGrid(8n, 5n)).toBe(10n);
    expect(quantizeToGrid(5n, 10n)).toBe(10n);
    expect(quantizeToGrid(-5n, 10n)).toBe(-10n);
    expect(quantizeToGrid(-7n, 5n)).toBe(-5n);
    expect(quantizeToGrid(123n, 0n)).toBe(123n);
  });

  it("settles the accumulator by the window before quantizing", () => {
    expect(settlingIndex(e18(2) * BigInt(WINDOW_US), WINDOW_US, 10n ** 12n)).toBe(e18(2));
  });
});
