import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  BaseResource, combineResources, derivedResource, type ResourceHandle, type SnapshotStore,
} from "./resource.js";

const memStore = (init: Record<string, string> = {}): SnapshotStore & { data: Record<string, string> } => {
  const data = { ...init };
  return { data, get: (k) => data[k] ?? null, set: (k, v) => { data[k] = v; } };
};

const controlled = <T>(store?: SnapshotStore) => {
  let h: ResourceHandle<T> | undefined;
  const r = new BaseResource<T>((handle) => { h = handle; return () => {}; }, store && { store, key: "k" });
  const off = r.subscribe(() => {});
  return { r, h: () => h!, off };
};

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(1_000_000); });
afterEach(() => { vi.useRealTimers(); });

it("persists a committed value, bigints included, and reads it back on a later visit", () => {
  const store = memStore();
  const first = controlled<{ n: bigint }>(store);
  first.h().set({ n: 12345678901234567890n });
  vi.advanceTimersByTime(5_000);

  const next = new BaseResource<{ n: bigint }>(() => () => {}, { store, key: "k" });
  expect(next.get()).toBeUndefined();
  expect(next.lastKnown()).toEqual({ value: { n: 12345678901234567890n }, at: 1_000_000 });
});

it("prefers the live value over the persisted one", () => {
  const store = memStore();
  const a = controlled<number>(store);
  a.h().set(1);
  a.off(); // flushes on stop

  const b = controlled<number>(store);
  expect(b.r.lastKnown()?.value).toBe(1);
  b.h().set(2);
  expect(b.r.lastKnown()?.value).toBe(2);
});

it("writes at most once per window however often the value changes", () => {
  const store = memStore();
  const set = vi.spyOn(store, "set");
  const { h } = controlled<number>(store);
  for (let i = 0; i < 100; i++) h().set(i);
  expect(set).not.toHaveBeenCalled();
  vi.advanceTimersByTime(5_000);
  expect(set).toHaveBeenCalledTimes(1);
  expect(JSON.parse(store.data.k!).value).toBe(99);
});

it("never persists a provisional seed, nor lets it shadow a real snapshot", () => {
  const store = memStore();
  const a = controlled<string>(store);
  a.h().set("priced");
  a.off();

  const b = controlled<string>(store);
  b.h().seed("static");
  expect(b.r.get()).toBe("static");
  expect(b.r.lastKnown()?.value).toBe("priced");
  b.off();
  expect(JSON.parse(store.data.k!).value).toBe("priced");
});

it("reports nothing for a provisional seed alone", () => {
  const { r, h } = controlled<string>(memStore());
  h().seed("static");
  expect(r.lastKnown()).toBeUndefined();
});

it("ignores a snapshot from another format version, and storage that throws", () => {
  const old = memStore({ k: JSON.stringify({ v: 0, at: 1, value: 7 }) });
  expect(new BaseResource<number>(() => () => {}, { store: old, key: "k" }).lastKnown()).toBeUndefined();

  const broken: SnapshotStore = { get: () => { throw new Error("denied"); }, set: () => { throw new Error("full"); } };
  const { r, h, off } = controlled<number>(broken);
  expect(r.lastKnown()).toBeUndefined();
  h().set(3);
  expect(() => { vi.advanceTimersByTime(5_000); off(); }).not.toThrow();
});

it("without a store behaves as before: lastKnown is the live value", () => {
  const { r, h } = controlled<number>();
  expect(r.lastKnown()).toBeUndefined();
  h().set(5);
  expect(r.lastKnown()).toEqual({ value: 5, at: 1_000_000 });
});

it("keeps a combined value provisional while any parent is provisional or empty", async () => {
  const store = memStore();
  const positions = controlled<number>();
  const markets = controlled<string>();
  const live = combineResources(
    [positions.r, markets.r],
    () => (positions.r.get() === undefined ? undefined : `${positions.r.get()}@${markets.r.get() ?? "none"}`),
    { store, key: "live" },
  );
  const off = live.subscribe(() => {});

  positions.h().set(1); // markets has nothing yet
  await Promise.resolve();
  expect(live.isProvisional()).toBe(true);
  markets.h().seed("cached"); // last session's list
  await Promise.resolve();
  expect(live.get()).toBe("1@cached");
  expect(live.isProvisional()).toBe(true);
  vi.advanceTimersByTime(5_000);
  expect(store.data.live).toBeUndefined();
  expect(live.lastKnown()).toBeUndefined();

  markets.h().set("priced");
  await Promise.resolve();
  expect(live.isProvisional()).toBe(false);
  vi.advanceTimersByTime(5_000);
  expect(JSON.parse(store.data.live!).value).toBe("1@priced");
  off();
});

it("passes a parent's provisional state through a derived view", async () => {
  const parent = controlled<number[]>();
  const first = derivedResource(parent.r, (list) => list?.[0]);
  const off = first.subscribe(() => {});

  parent.h().seed([1]);
  await Promise.resolve();
  expect(first.get()).toBe(1);
  expect(first.isProvisional()).toBe(true);
  expect(first.lastKnown()).toBeUndefined();

  parent.h().set([2]);
  await Promise.resolve();
  expect(first.isProvisional()).toBe(false);
  expect(first.lastKnown()?.value).toBe(2);
  off();
});

it("keeps the newest real value through a later provisional seed", () => {
  // A resubscribe re-seeds from cache before REST returns: the real value
  // committed just before must still be reported and written.
  const store = memStore();
  const { r, h } = controlled<string>(store);
  h().set("real");
  vi.setSystemTime(1_000_500);
  h().seed("cached");
  expect(r.get()).toBe("cached");
  expect(r.lastKnown()).toEqual({ value: "real", at: 1_000_000 });
  vi.advanceTimersByTime(5_000);
  expect(JSON.parse(store.data.k!).value).toBe("real");

  const bare = controlled<string>();
  bare.h().set("real");
  bare.h().seed("cached");
  expect(bare.r.lastKnown()?.value).toBe("real");
});

it("treats a derived fallback for an empty parent as provisional", async () => {
  const parent = controlled<number[]>();
  const first = derivedResource(parent.r, (list) => list?.[0] ?? -1);
  const off = first.subscribe(() => {});
  await Promise.resolve();
  expect(first.get()).toBe(-1);
  expect(first.isProvisional()).toBe(true);
  expect(first.lastKnown()).toBeUndefined();
  off();
});
