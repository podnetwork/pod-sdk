import { expect, it, vi } from "vitest";

import type { Market } from "../types/public.js";
import { marketsSource, type SyncContext } from "./sources.js";

const market = (id: `0x${string}`, name: string): Market => ({
  id,
  name,
  status: "active",
  type: "spot",
  base: { address: "0x01", symbol: "B", name: "Base" },
  quote: { address: "0x02", symbol: "Q", name: "Quote" },
  tickPrecision: 1n,
  lotSize: 1n,
  minNotional: 0n,
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
    seed: (value) => { current = value; },
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

it("ignores a markets cache written in an older format", async () => {
  // A v1 payload predates `status`/`minNotional` and the fee fix, so honouring it would
  // restore markets with fields missing and fees at 0 for as long as REST kept failing.
  const a = market("0x01", "A/Q");
  // v1 shape: no status/minNotional, fees as the zeroes `dec` produced.
  const { status: _s, minNotional: _m, ...v1 } = a;
  const stale = JSON.stringify(
    { v: 1, markets: [{ ...v1, makerFee: 0n, takerFee: 0n }] },
    (_k, v: unknown) => (typeof v === "bigint" ? `${v}n` : v),
  );
  const cache = { get: () => stale, set: vi.fn() };
  const markets = vi.fn().mockResolvedValue([a]);
  const ctx = {
    rest: { markets, marketStats: vi.fn().mockResolvedValue({ markets: [] }) },
    ws: {
      on: () => () => {},
      subscribe: () => ({ unsubscribe() {}, update() {}, resubscribe() {} }),
    },
    marketResyncMs: 0,
    positionResyncMs: 0,
    marketsCache: cache,
  } as unknown as SyncContext;

  const seen: (Market[] | undefined)[] = [];
  let current: Market[] | undefined;
  const stop = marketsSource(ctx)({
    set: (value) => { current = value; seen.push(value); },
    seed: (value) => { current = value; seen.push(value); },
    update: () => {},
    current: () => current,
    fail: (error) => { throw error; },
  });

  // Nothing is seeded from the stale payload: the first value to land is REST's.
  await vi.waitFor(() => expect(current?.map((m) => m.id)).toEqual([a.id]));
  expect(seen.every((v) => v === undefined || v.every((m) => m.minNotional !== undefined))).toBe(true);
  expect(cache.set).toHaveBeenCalledWith(expect.stringContaining('"v":2'));

  stop();
});

it("keeps the cached list provisional until REST's static list lands", async () => {
  // A pod_markets frame replayed before /clob/markets returns must not promote last
  // session's list (unpriced, possibly delisted) into a persisted, lastKnown() value.
  const a = market("0x01", "A/Q");
  const cached = JSON.stringify(
    { v: 2, markets: [a] },
    (_k, v: unknown) => (typeof v === "bigint" ? `${v}n` : v),
  );
  let resolveMarkets: (m: Market[]) => void = () => {};
  const markets = vi.fn(() => new Promise<Market[]>((r) => { resolveMarkets = r; }));
  let onFrame: ((result: unknown) => void) | undefined;
  const ctx = {
    rest: { markets, marketStats: vi.fn().mockResolvedValue({ markets: [] }) },
    ws: {
      on: () => () => {},
      subscribe: (_m: string, _p: unknown, fn: (result: unknown) => void) => {
        onFrame = fn;
        return { unsubscribe() {}, update() {}, resubscribe() {} };
      },
    },
    marketResyncMs: 0,
    positionResyncMs: 0,
    marketsCache: { get: () => cached, set: vi.fn() },
  } as unknown as SyncContext;

  const set = vi.fn();
  const seed = vi.fn();
  const stop = marketsSource(ctx)({
    set,
    seed,
    update: () => {},
    current: () => undefined,
    fail: (error) => { throw error; },
  });

  expect(seed).toHaveBeenCalledTimes(1);
  onFrame?.({ orderbook_id: a.id });
  await vi.waitFor(() => expect(ctx.rest.marketStats).toHaveBeenCalled());
  await Promise.resolve();
  expect(set).not.toHaveBeenCalled();
  expect(seed.mock.calls.length).toBeGreaterThan(1);

  resolveMarkets([a]);
  await vi.waitFor(() => expect(set).toHaveBeenCalled());
  expect(set.mock.lastCall?.[0].map((m: Market) => m.id)).toEqual([a.id]);

  stop();
});
