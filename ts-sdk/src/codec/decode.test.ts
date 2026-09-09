import { describe, expect, it } from "vitest";

import type { WireMarketStatic } from "../types/wire.js";
import { decodeMarketStatic } from "./decode.js";

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
