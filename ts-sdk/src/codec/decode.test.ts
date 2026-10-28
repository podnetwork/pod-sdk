import { describe, expect, it } from "vitest";

import type { WireMarketStatic, WirePositionsSnapshot } from "../types/wire.js";
import { decodeMarketStatic, decodePositions } from "./decode.js";

/** Verbatim from `GET https://staging-rpc.podtestnet.dev/v1/clob/markets`. */
const NVDA_PERP: WireMarketStatic = {
  id: "0x0000000000000000000000000000000000000000000000000000000000000007",
  name: "NVDA/USD",
  status: "active",
  base_token_address: "0x0000000000000000000000000000000000000007",
  quote_token_address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  base_token_symbol: "NVDA",
  quote_token_symbol: "USD",
  base_token_name: "Nvidia Perpetual",
  quote_token_name: "USD",
  market_type: "perp",
  auction_interval_us: 500_000,
  maker_fee: "0.000150",
  taker_fee: "0.000450",
  tick_precision: "10000000000000000",
  lot_size: "1000000000000",
  min_notional: "0",
  max_leverage: 20,
  funding_window_us: 28_800_000_000,
};

describe("decodeMarketStatic", () => {
  it("reads the size grid and the notional floor off a live payload", () => {
    const m = decodeMarketStatic(NVDA_PERP);
    expect(m.lotSize).toBe(10n ** 12n); // 1e-6 base
    expect(m.tickPrecision).toBe(10n ** 16n);
    expect(m.minNotional).toBe(0n);
    expect(m.status).toBe("active");
  });

  it("scales the fee rates instead of truncating them to zero", () => {
    const m = decodeMarketStatic(NVDA_PERP);
    expect(m.makerFee).toBe(150_000_000_000_000n); // 0.000150 × 1e18 = 1.5bp
    expect(m.takerFee).toBe(450_000_000_000_000n);
  });
});

describe("fee rates", () => {
  const fees = (maker: string, taker: string) =>
    decodeMarketStatic({ ...NVDA_PERP, maker_fee: maker, taker_fee: taker });

  it("scales a human fraction rather than truncating it", () => {
    expect(fees("0.5", "1").makerFee).toBe(5n * 10n ** 17n);
    expect(fees("0.5", "1").takerFee).toBe(10n ** 18n);
    expect(fees("0", "0").makerFee).toBe(0n);
  });

  it("reads an absent fee as zero instead of throwing the whole market away", () => {
    // decodeMarketStatic maps the entire markets list; one bad field must not empty it.
    expect(fees("", "").makerFee).toBe(0n);
    expect(() => fees(undefined as unknown as string, "0")).not.toThrow();
  });
});

describe("decodePositions", () => {
  it("decodes a spot entry by market and symbols", () => {
    const w: WirePositionsSnapshot = {
      positions: [{
        kind: "spot",
        orderbook_id: "0x0000000000000000000000000000000000000000000000000000000000000001",
        base_symbol: "NVDAx",
        quote_symbol: "USD",
        balance: "0x2",
        free_balance: "0x1",
        locked_balance: "0x1",
        cost_basis: "0x3",
        mark_price: "0x4",
        unrealized_pnl: "5",
        realized_pnl: "-6",
      }],
      total_unrealized_pnl: "0", total_realized_pnl: "0", perps_equity: "0",
      account_value: "0", cash: "0", withdrawable_cash: "0x0", net_deposits: "0",
    };
    const [p] = decodePositions(w).positions;
    expect(p).toEqual({
      kind: "spot",
      orderbookId: "0x0000000000000000000000000000000000000000000000000000000000000001",
      baseSymbol: "NVDAx",
      quoteSymbol: "USD",
      balance: 2n, freeBalance: 1n, lockedBalance: 1n, costBasis: 3n, markPrice: 4n,
      unrealizedPnl: 5n, realizedPnl: -6n,
    });
    expect(p).not.toHaveProperty("token");
  });
});
