// Reads go through a load balancer to eventually-consistent fullnodes, so a
// response can come from a node behind the one that produced what we hold.

import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";

import { stringifyBig } from "../codec/json.js";
import type { Address, Balances, Market, PositionsSnapshot } from "../types/public.js";
import { BaseResource, type ResourceSource } from "../stores/resource.js";
import { PodBehindError, PodRestClient } from "../transport/rest.js";
import { PodWsClient, type WebSocketCtor } from "../transport/ws.js";
import {
  balancesSource, marketsSource, MAX_SUB_RETRIES, positionsSource, readAtLeast, triggersSource, watermarks,
  type SyncContext,
} from "./sources.js";

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
    on: (_event: string, fn: () => void) => { const prev = onOpen; onOpen = () => { prev?.(); fn(); }; return () => {}; },
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
    lastKnown: () => undefined,
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
    lastKnown: () => undefined,
    fail: (error) => { throw error; },
  });

  // Nothing is seeded from the stale payload: the first value to land is REST's.
  await vi.waitFor(() => expect(current?.map((m) => m.id)).toEqual([a.id]));
  expect(seen.every((v) => v === undefined || v.every((m) => m.minNotional !== undefined))).toBe(true);
  expect(cache.set).toHaveBeenCalledWith(expect.stringContaining('"v":3'));

  stop();
});

it("keeps the cached list provisional until REST's static list lands", async () => {
  // A pod_markets frame replayed before /clob/markets returns must not promote last
  // session's list (unpriced, possibly delisted) into a persisted, lastKnown() value.
  const a = market("0x01", "A/Q");
  const cached = stringifyBig({ v: 3, markets: [a] });
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
    lastKnown: () => undefined,
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

const ACCT = "0xabc" as Address;
const MKT = `0x${"07".padStart(64, "0")}`;

function fakeWs() {
  const subs: { channel: string; onMessage: (r: unknown) => void; onError?: (e: unknown) => void; resubscribes: number }[] = [];
  const ws = {
    state: "open",
    on: () => () => {},
    subscribe: (channel: string, _p: unknown, onMessage: (r: unknown) => void, onError?: (e: unknown) => void) => {
      const s = { channel, onMessage, onError, resubscribes: 0 };
      subs.push(s);
      return { unsubscribe: () => {}, update: () => {}, resubscribe: () => { s.resubscribes++; } };
    },
  };
  return { ws, subs };
}

function start<T>(source: ResourceSource<T>) {
  const resource = new BaseResource(source);
  onTestFinished(() => resource.destroy());
  resource.subscribe(() => {});
  return resource;
}

const ctx = (rest: unknown, ws: unknown) =>
  ({ rest, ws, positionResyncMs: 0, marketResyncMs: 0 }) as unknown as SyncContext;

const SPOT = {
  kind: "spot", orderbook_id: MKT, base_symbol: "B", quote_symbol: "Q", balance: "3", free_balance: "3",
  locked_balance: "0", cost_basis: "0", mark_price: "0", unrealized_pnl: "0", realized_pnl: "0",
};
const wirePositions = (timestamp: number, cash: string, positions: unknown[] = []) => ({
  positions, total_unrealized_pnl: "0", total_realized_pnl: "0", perps_equity: "0",
  account_value: "0", cash, withdrawable_cash: "0", net_deposits: "9", timestamp,
});
const positions = (timestampUs: number, cash: bigint) => ({
  positions: [], totalUnrealizedPnl: 0n, totalRealizedPnl: 0n, perpsEquity: 0n,
  accountValue: 0n, cash, withdrawableCash: 0n, timestampUs,
}) as PositionsSnapshot;
const balances = (timestampUs: number, cash: bigint) =>
  ({ holdings: [], cash, withdrawableCash: 0n, netDeposits: 0n, timestampUs }) as Balances;

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => { vi.useRealTimers(); });

describe("watermarks", () => {
  it("accepts equal or later, rejects earlier, per key", () => {
    const fresh = watermarks();
    expect(fresh(10)).toBe(true);
    expect(fresh(10)).toBe(true);
    expect(fresh(9)).toBe(false);
    expect(fresh(11)).toBe(true);
    expect(fresh(5, "other")).toBe(true);
    expect(fresh(undefined)).toBe(true);
    expect(fresh(10)).toBe(false);
  });
});

describe("positionsSource", () => {
  it("keeps a pushed snapshot over a REST poll that lands later", async () => {
    const { ws, subs } = fakeWs();
    let resolve!: (s: PositionsSnapshot) => void;
    const rest = { positions: () => new Promise<PositionsSnapshot>((r) => { resolve = r; }) };
    const r = start(positionsSource(ctx(rest, ws), ACCT));

    subs[0]!.onMessage({ account: ACCT, data: wirePositions(2_000, "7") });
    resolve(positions(1_000, 1n));
    await flush();
    expect(r.get()!.cash).toBe(7n);
  });

  it("resubscribes from the timestamp of the snapshot it holds", async () => {
    vi.useFakeTimers();
    const sockets: Socket[] = [];
    class Socket {
      sent: { id: number; method: string; params: unknown[] }[] = [];
      onopen?: () => void;
      onmessage?: (ev: { data: string }) => void;
      onclose?: () => void;
      constructor() { sockets.push(this); setTimeout(() => this.onopen?.(), 0); }
      send(raw: string) { this.sent.push(JSON.parse(raw)); }
      close() { this.onclose?.(); }
    }
    const ws = new PodWsClient({ wsUrl: "ws://test", WebSocket: Socket as unknown as WebSocketCtor, idleTimeoutMs: 3_600_000 });
    onTestFinished(() => ws.close());
    const rest = { positions: () => new Promise(() => {}) };
    start(positionsSource(ctx(rest, ws), ACCT));
    await vi.advanceTimersByTimeAsync(0);

    const first = sockets[0]!;
    const req = first.sent.find((m) => m.method === "eth_subscribe")!;
    expect(req.params[1]).toMatchObject({ since: 0 });
    first.onmessage!({ data: JSON.stringify({ jsonrpc: "2.0", id: req.id, result: "0xs" }) });
    first.onmessage!({ data: JSON.stringify({
      jsonrpc: "2.0", method: "eth_subscription",
      params: { subscription: "0xs", result: { account: ACCT, data: wirePositions(2_000, "7") } },
    }) });
    first.close();
    await vi.advanceTimersByTimeAsync(1_000);

    const again = sockets[1]!.sent.find((m) => m.method === "eth_subscribe")!;
    expect(again.params).toEqual(["pod_positions", { account: ACCT, since: 2_000 }]);
  });
});

describe("balancesSource", () => {
  it("builds balances from the pod_positions push", () => {
    const { ws, subs } = fakeWs();
    const rest = { balances: () => new Promise(() => {}) };
    const r = start(balancesSource(ctx(rest, ws), ACCT));
    subs[0]!.onMessage({ account: ACCT, data: wirePositions(2_000, "7", [SPOT]) });
    expect(r.get()).toMatchObject({ cash: 7n, netDeposits: 9n, timestampUs: 2_000 });
    expect(r.get()!.holdings).toEqual([expect.objectContaining({ orderbookId: MKT, balance: 3n, baseSymbol: "B" })]);
  });

  it("keeps a pushed snapshot over a REST seed that lands later", async () => {
    const { ws, subs } = fakeWs();
    let resolve!: (b: Balances) => void;
    const rest = { balances: () => new Promise<Balances>((res) => { resolve = res; }) };
    const r = start(balancesSource(ctx(rest, ws), ACCT));
    subs[0]!.onMessage({ account: ACCT, data: wirePositions(2_000, "7") });
    resolve(balances(1_000, 1n));
    await flush();
    expect(r.get()!.cash).toBe(7n);
  });

  it("takes the restored snapshot's timestamp as the watermark", async () => {
    const { ws } = fakeWs();
    const mins: (number | undefined)[] = [];
    const rest = { balances: (_a: unknown, min?: number) => { mins.push(min); return Promise.resolve(balances(1_000, 1n)); } };
    const store = { get: () => stringifyBig({ v: 1, at: 0, value: balances(2_000, 7n) }), set: () => {} };
    const r = new BaseResource(balancesSource(ctx(rest, ws), ACCT), { store, key: "balances" });
    onTestFinished(() => r.destroy());
    r.subscribe(() => {});
    await flush();
    expect(mins[0]).toBe(2_000);
    expect(r.get()).toBeUndefined();
  });
});

describe("triggersSource", () => {
  it("ignores a push below the one held", () => {
    const { ws, subs } = fakeWs();
    const r = start(triggersSource(ctx({}, ws), ACCT));
    subs[0]!.onMessage({ account: ACCT, triggers: [], total_count: 0, next_cursor: null, timestamp: 2_000 });
    subs[0]!.onMessage({ account: ACCT, triggers: [{}], total_count: 1, next_cursor: null, timestamp: 1_000 });
    expect(r.get()).toEqual([]);
  });
});

describe("marketsSource", () => {
  it("keeps live dynamics over a stats page that lands later", async () => {
    const { ws, subs } = fakeWs();
    let resolveStats!: (p: unknown) => void;
    const rest = {
      markets: async () => [{ id: MKT, base: "B", quote: "Q" }],
      marketStats: () => new Promise((r) => { resolveStats = r; }),
    };
    const r = start(marketsSource(ctx(rest, ws)));
    await flush();

    const sub = subs.find((s) => s.channel === "pod_markets")!;
    sub.onMessage([{
      orderbook: MKT, last_clearing_price: "5", volume_24h: "0", high_24h: "0", low_24h: "0",
      price_change_24h: 0, timestamp: 2_000_000,
    }]);
    resolveStats({ solutionNow: 1, markets: [{ id: MKT, lastClearingPrice: 1n }] });
    await flush();
    expect(r.get()![0]).toMatchObject({ lastClearingPrice: 5n });
  });
});

describe("state-channel subscriptions", () => {
  it("ignores a rejection that arrives after unsubscribe", async () => {
    vi.useFakeTimers();
    const { ws, subs } = fakeWs();
    const resource = new BaseResource(triggersSource(ctx({}, ws), ACCT));
    resource.subscribe(() => {});
    resource.destroy();

    subs[0]!.onError!(new Error("rejected"));
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(subs[0]!.resubscribes).toBe(0);
  });

  it("resubscribe after a rejection, but not once the sub is live again", async () => {
    vi.useFakeTimers();
    const { ws, subs } = fakeWs();
    start(triggersSource(ctx({}, ws), ACCT));
    const sub = subs[0]!;

    sub.onError!(new Error("rejected"));
    await vi.advanceTimersByTimeAsync(500);
    expect(sub.resubscribes).toBe(1);

    sub.onError!(new Error("closed"));
    sub.onMessage({ account: ACCT, triggers: [], total_count: 0, next_cursor: null });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sub.resubscribes).toBe(1);
  });

  it("retries a 995 rejection every second without spending the retry budget", async () => {
    vi.useFakeTimers();
    const { ws, subs } = fakeWs();
    start(triggersSource(ctx({}, ws), ACCT));
    const sub = subs[0]!;

    for (let i = 1; i <= MAX_SUB_RETRIES + 2; i++) {
      sub.onError!({ code: 995, message: "behind", data: 1_000 });
      await vi.advanceTimersByTimeAsync(999);
      expect(sub.resubscribes).toBe(i - 1);
      await vi.advanceTimersByTimeAsync(1);
      expect(sub.resubscribes).toBe(i);
    }
    sub.onError!(new Error("rejected"));
    await vi.advanceTimersByTimeAsync(500);
    expect(sub.resubscribes).toBe(MAX_SUB_RETRIES + 3);
  });
});

describe("minimum timestamp on REST reads", () => {
  it("rethrows the 503 when the retry is behind too", async () => {
    vi.useFakeTimers();
    const read = vi.fn((_min?: number) => Promise.reject(new PodBehindError("http://node.test", 1_500, 1_000)));
    const caught = readAtLeast(read, 2_000).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(await caught).toBeInstanceOf(PodBehindError);
    expect(read.mock.calls).toEqual([[2_000], [2_000]]);
  });

  const body = (timestamp: number) => JSON.stringify(wirePositions(timestamp, "1"));

  it("asks for nothing on the first seed, then for the held watermark", async () => {
    vi.useFakeTimers();
    const asked: (string | null)[] = [];
    const rest = new PodRestClient({
      restUrl: "http://node.test/v1",
      fetch: (async (url: string) => {
        asked.push(new URL(url).searchParams.get("timestamp"));
        return new Response(body(1_000));
      }) as unknown as typeof fetch,
    });
    const { ws, subs } = fakeWs();
    start(positionsSource({ rest, ws, positionResyncMs: 500, marketResyncMs: 0 } as unknown as SyncContext, ACCT));
    await vi.advanceTimersByTimeAsync(0);
    subs[0]!.onMessage({ account: ACCT, data: wirePositions(2_000, "7") });
    await vi.advanceTimersByTimeAsync(500);
    expect(asked).toEqual([null, "2000"]);
  });

  it("retries once after a 503 from a node behind the watermark", async () => {
    vi.useFakeTimers();
    const replies = [
      () => new Response(body(1_000)),
      () => new Response(JSON.stringify({ timestamp: 1_500 }), { status: 503, headers: { "retry-after": "1" } }),
      () => new Response(body(2_500)),
    ];
    const at: number[] = [];
    const rest = new PodRestClient({
      restUrl: "http://node.test/v1",
      fetch: (async () => { at.push(Date.now()); return replies.shift()!(); }) as unknown as typeof fetch,
    });
    const { ws, subs } = fakeWs();
    const r = start(positionsSource({ rest, ws, positionResyncMs: 10_000, marketResyncMs: 0 } as unknown as SyncContext, ACCT));
    await vi.advanceTimersByTimeAsync(0);
    subs[0]!.onMessage({ account: ACCT, data: wirePositions(2_000, "7") });
    await vi.advanceTimersByTimeAsync(10_000);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(at[2]! - at[1]!).toBe(1_000);
    expect(r.get()!.timestampUs).toBe(2_500);
  });
});
