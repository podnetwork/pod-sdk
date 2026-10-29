import { describe, expect, it } from "vitest";

import type { Market, PerpPosition, PositionsSnapshot } from "../types/public.js";
import { imRate, mul } from "../codec/fixed.js";
import { WAD } from "../codec/units.js";
import { enrichPositions } from "./positions-live.js";

const LOT = 10n ** 12n;
const PRICE = 100n * WAD; // mark == entry, so price uPnL is 0

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
  fundingWindowUs: 0, // no live funding recompute → funding held at snapshot value
  makerFee: 0n,
  takerFee: 0n,
  auctionIntervalMs: 500,
  markPrice: PRICE,
  ...over,
});

const perp = (size: bigint, over: Partial<PerpPosition> = {}): PerpPosition => ({
  kind: "perp",
  orderbookId: market().id,
  side: size > 0n ? "long" : "short",
  size,
  notional: mul(size < 0n ? -size : size, PRICE),
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

const snap = (positions: PositionsSnapshot["positions"], cash = 10_000n * WAD): PositionsSnapshot => ({
  positions,
  totalUnrealizedPnl: 0n,
  totalRealizedPnl: 0n,
  perpsEquity: cash,
  accountValue: cash,
  cash,
  withdrawableCash: cash,
});

describe("enrichPositions withdrawable floor", () => {
  it("floors the margin deduction at 10% of open notional when it exceeds summed IM", () => {
    // 10 units long at 100 → notional 1000. maxLeverage 20 → IM rate 1/20 = 5% of
    // notional = 50. 10% of notional = 100. The floor binds: deduction is 100, not
    // 50. Equity 500 - 100 = 400.
    const out = enrichPositions(snap([perp(10n * WAD)], 500n * WAD), [market({ maxLeverage: 20 })]);

    expect(out.perpsEquity).toBe(500n * WAD);
    expect(out.withdrawableCash).toBe(400n * WAD);
  });

  it("deducts summed IM unchanged when IM exceeds 10% of open notional", () => {
    // maxLeverage 5 → IM rate 1/5 = 20% of notional = 200. 10% of notional = 100.
    // IM binds: deduction is 200. Equity 500 - 200 = 300.
    const out = enrichPositions(
      snap([perp(10n * WAD, { leverage: 5 })], 500n * WAD),
      [market({ maxLeverage: 5 })],
    );

    expect(out.perpsEquity).toBe(500n * WAD);
    expect(out.withdrawableCash).toBe(300n * WAD);
  });

  it("rounds the 10%-of-notional floor UP when notional is not divisible by 10", () => {
    // Mark carries a 7-wei tail, so open notional = 100·1e18 + 7, which is not
    // divisible by 10. mark == entry → zero price uPnL. IM (5% = ~5·1e18) is well
    // under the 10% term (~10·1e18), so the ratio floor binds. It must round UP:
    // ceil((100·1e18 + 7) / 10) locks 1 wei more than truncation would, so
    // withdrawable is exactly 1 wei below the round 490·1e18. A max-withdraw at the
    // boundary is then admitted by the venue rather than rejected.
    const ODD = 100n * WAD + 7n;
    const out = enrichPositions(
      snap([perp(1n * WAD, { entryPrice: ODD })], 500n * WAD),
      [market({ markPrice: ODD, maxLeverage: 20 })],
    );

    expect(out.perpsEquity).toBe(500n * WAD);
    expect(out.withdrawableCash).toBe(490n * WAD - 1n);
  });
});

describe("enrichPositions maintenanceMargin", () => {
  it("is half the initial requirement, at live notional", () => {
    const size = 100n * LOT;
    const got = enrichPositions(snap([perp(size)]), [market()]);
    // The same rate the withdrawable floor is taken against: Σ notional × imRate/2.
    expect(got.maintenanceMargin).toBe(mul(mul(size, PRICE), imRate(20) / 2n));
  });

  it("follows the live mark rather than the notional the snapshot was written with", () => {
    const size = 100n * LOT;
    const stale = perp(size, { notional: mul(size, PRICE) });
    const got = enrichPositions(snap([stale]), [market({ markPrice: 2n * PRICE })]);
    expect(got.maintenanceMargin).toBe(mul(mul(size, 2n * PRICE), imRate(20) / 2n));
  });

  it("sums across positions and is zero with none", () => {
    const one = market();
    const two = market({ id: `0x${"00".repeat(31)}08`, name: "AAPL/USD" });
    const got = enrichPositions(
      snap([perp(100n * LOT), perp(-50n * LOT, { orderbookId: two.id })]),
      [one, two],
    );
    expect(got.maintenanceMargin).toBe(mul(mul(150n * LOT, PRICE), imRate(20) / 2n));
    expect(enrichPositions(snap([]), [one]).maintenanceMargin).toBe(0n);
  });

  it("is the floor withdrawable cash is forced to zero beneath", () => {
    // The relationship the field exists to expose: equity under the requirement is an
    // account with nothing free, whatever its initial-margin arithmetic would say.
    // 1e6 lots = 1 whole base unit, so $100 of notional against $1 of equity.
    const thin = enrichPositions(snap([perp(1_000_000n * LOT)], 1n * WAD), [market()]);
    expect(thin.perpsEquity < (thin.maintenanceMargin ?? 0n)).toBe(true);
    expect(thin.withdrawableCash).toBe(0n);
  });
});

// Vectors from a real NVDA/USD position that read 2.28 of funding against
// 0.0003 of actual accrual, back when the market's undivided accumulator was
// subtracted from a basis built on the settling index.
describe("enrichPositions funding", () => {
  const SIZE = 473_785n * LOT; // 0.473785 NVDA
  const ENTRY_INDEX = 4_811_218_655_296_000_000n; // settling index when the position was opened
  const NOW_INDEX = 4_811_858_351_945_312_000n; // settling index now
  const WINDOW_US = 28_800_000_000; // 8h
  const ACCUMULATOR = NOW_INDEX * BigInt(WINDOW_US); // what funding_index publishes

  const open = (over: Partial<PerpPosition> = {}) =>
    perp(SIZE, {
      fundingBasis: mul(ENTRY_INDEX, SIZE),
      costBasis: mul(PRICE, SIZE),
      entryFunding: ENTRY_INDEX * BigInt(WINDOW_US),
      ...over,
    });

  const live = (over: Partial<Market> = {}) =>
    market({
      fundingWindowUs: WINDOW_US,
      fundingIndex: ACCUMULATOR,
      fundingSettlingIndex: NOW_INDEX,
      ...over,
    });

  it("accrues from the settling index and the position's own basis", () => {
    const got = enrichPositions(snap([open()]), [live()]);
    const position = got.positions[0] as PerpPosition;
    expect(position.fundingAccrued).toBe(mul(NOW_INDEX, SIZE) - mul(ENTRY_INDEX, SIZE));
    // ~0.0003, not the ~2.28 the accumulator's base gives.
    expect(position.fundingAccrued).toBeLessThan(WAD / 1000n);
  });

  it("charges equity the accrual since entry, not the market's whole history", () => {
    const cash = 10_000n * WAD;
    const got = enrichPositions(snap([open()], cash), [live()]);
    const accrued = mul(NOW_INDEX, SIZE) - mul(ENTRY_INDEX, SIZE);
    expect(got.cash).toBe(cash - accrued);
    expect(got.perpsEquity).toBe(cash - accrued);
  });

  it("holds the snapshot's funding when either operand is missing", () => {
    const accrued = (s: PositionsSnapshot, m: Market) =>
      (enrichPositions(s, [m]).positions[0] as PerpPosition).fundingAccrued;
    // The accumulator is there and the window is set: the old code estimated here.
    expect(accrued(snap([open({ fundingAccrued: 7n })]), live({ fundingSettlingIndex: undefined })))
      .toBe(7n);
    expect(accrued(snap([open({ fundingBasis: undefined, fundingAccrued: 11n })]), live()))
      .toBe(11n);
  });

  it("takes unrealized PnL from the cost basis when it is published", () => {
    const moved = 2n * PRICE;
    const got = enrichPositions(snap([open()]), [live({ markPrice: moved })]);
    expect((got.positions[0] as PerpPosition).unrealizedPnl).toBe(mul(moved, SIZE) - mul(PRICE, SIZE));
  });

  it("prefers the engine's margin rate over re-deriving it from maxLeverage", () => {
    const rate = 10n ** 18n / 7n; // a leverage the integer field cannot express
    const got = enrichPositions(snap([open()]), [live({ initialMargin: rate })]);
    expect(got.maintenanceMargin).toBe(mul(mul(SIZE, PRICE), rate / 2n));
  });
});
