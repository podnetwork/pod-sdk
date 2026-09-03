import { expect, it, vi } from "vitest";

import type { Market } from "../types/public.js";
import { marketsSource, type SyncContext } from "./sources.js";

const market = (id: `0x${string}`, name: string): Market => ({
  id,
  name,
  type: "spot",
  base: { address: "0x01", symbol: "B", name: "Base" },
  quote: { address: "0x02", symbol: "Q", name: "Quote" },
  tickPrecision: 1n,
  lotSize: 1n,
  maxLeverage: 1,
  fundingWindowUs: 0,
  makerFee: 0n,
  takerFee: 0n,
  auctionIntervalMs: 1_000,
});

it("removes a delisted market on a reconnect seed", async () => {
  const a = market("0x01", "A/Q");
  const b = market("0x02", "B/Q");
  const markets = vi.fn()
    .mockResolvedValueOnce([a, b])
    .mockResolvedValueOnce([a, b])
    .mockResolvedValueOnce([a]);
  let onOpen: (() => void) | undefined;
  const ws = {
    on: (_event: string, fn: () => void) => { onOpen = fn; return () => {}; },
    subscribe: () => ({ unsubscribe() {}, update() {}, resubscribe() {} }),
  };
  const ctx = {
    rest: { markets, marketStats: vi.fn().mockResolvedValue({ markets: [] }) },
    ws,
    marketResyncMs: 0,
    positionResyncMs: 0,
  } as unknown as SyncContext;
  let current: Market[] | undefined;
  const stop = marketsSource(ctx)({
    set: (value) => { current = value; },
    update: () => {},
    current: () => current,
    fail: (error) => { throw error; },
  });

  await vi.waitFor(() => expect(current?.map((m) => m.id)).toEqual([a.id, b.id]));
  onOpen?.(); // cold-open duplicate seed
  await vi.waitFor(() => expect(markets).toHaveBeenCalledTimes(2));
  onOpen?.(); // reconnect after B was delisted
  await vi.waitFor(() => expect(current?.map((m) => m.id)).toEqual([a.id]));

  stop();
});
