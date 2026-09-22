import { describe, expect, it } from "vitest";

import type { Market, PerpPosition, PositionsSnapshot } from "../types/public.js";
import { imRate, mul } from "../codec/fixed.js";
import { WAD } from "../codec/units.js";
import { enrichPositions } from "./positions-live.js";

const LOT = 10n ** 12n;
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
