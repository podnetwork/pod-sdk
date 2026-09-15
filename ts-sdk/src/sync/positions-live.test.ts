import { describe, expect, it } from "vitest";

import type { Market, PerpPosition, PositionsSnapshot } from "../types/public.js";
import { WAD } from "../codec/units.js";
import { enrichPositions } from "./positions-live.js";

const MKT: Market["id"] = `0x${"00".repeat(31)}07`;
const PRICE = 100n * WAD; // mark == entry, so price uPnL is 0

const market = (over: Partial<Market> = {}): Market => ({
  id: MKT,
  name: "NVDA/USD",
  status: "active",
  type: "perp",
  base: { address: "0x01", symbol: "NVDA", name: "Nvidia Perpetual" },
  quote: { address: "0x02", symbol: "USD", name: "USD" },
  tickPrecision: 10n ** 16n,
  lotSize: 10n ** 12n,
  minNotional: 0n,
  maxLeverage: 20,
  fundingWindowUs: 0, // no live funding recompute → funding held at snapshot value
  makerFee: 0n,
  takerFee: 0n,
  auctionIntervalMs: 500,
  markPrice: PRICE,
  ...over,
});

// 10 units long at 100 → notional 1000. Entry == mark, no funding.
const perp = (over: Partial<PerpPosition> = {}): PerpPosition => ({
  kind: "perp",
  orderbookId: MKT,
  side: "long",
  size: 10n * WAD,
  notional: 1000n * WAD,
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

const snap = (positions: PositionsSnapshot["positions"], cash = 500n * WAD): PositionsSnapshot => ({
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
    // maxLeverage 20 → IM rate 1/20 = 5% of notional = 50. 10% of notional = 100.
    // The floor binds: deduction is 100, not 50. Equity 500 - 100 = 400.
    const out = enrichPositions(snap([perp()]), [market({ maxLeverage: 20 })]);

    expect(out.perpsEquity).toBe(500n * WAD);
    expect(out.withdrawableCash).toBe(400n * WAD);
  });

  it("deducts summed IM unchanged when IM exceeds 10% of open notional", () => {
    // maxLeverage 5 → IM rate 1/5 = 20% of notional = 200. 10% of notional = 100.
    // IM binds: deduction is 200. Equity 500 - 200 = 300.
    const out = enrichPositions(snap([perp({ leverage: 5 })]), [market({ maxLeverage: 5 })]);

    expect(out.perpsEquity).toBe(500n * WAD);
    expect(out.withdrawableCash).toBe(300n * WAD);
  });
});
