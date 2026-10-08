import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BaseResource, type ResourceHandle, type SnapshotStore } from "./resource.js";

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
