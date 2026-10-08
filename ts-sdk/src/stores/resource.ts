// The core observable abstraction. A Resource holds an in-memory value, is
// ref-counted (its source starts on the first subscriber and tears down after
// the last leaves), and exposes the useSyncExternalStore-shaped contract.

import { parseBig, stringifyBig } from "../codec/json.js";

export interface Resource<T> {
  get(): T | undefined;
  subscribe(listener: () => void): () => void;
  /**
   * Resolves on the FIRST value the source commits — which for a resource that
   * seeds progressively is the initial, possibly empty, seed and not "fully
   * loaded". Do not use it to decide that a window has finished loading (that
   * mistake drew empty charts); for a bounded read that must be complete, use a
   * one-shot call such as `client.candleHistory`.
   */
  ready(): Promise<T>;
  /** Restart the source for a fresh seed (optional — see BaseResource). */
  refresh?(): void;
  /**
   * The newest real value this resource has held, live or persisted from an
   * earlier visit, and when it was committed — never a provisional `seed`. For display while the backend is away —
   * never for sizing, pricing or signing, which must read `get()`.
   */
  lastKnown?(): Snapshot<T> | undefined;
  /**
   * True while the current value is a provisional `seed` (e.g. a cached list
   * not yet confirmed by the backend). Derived resources inherit it.
   */
  isProvisional?(): boolean;
  readonly error?: Error;
}

/** A value and the wall-clock ms it was committed at. */
export interface Snapshot<T> {
  value: T;
  at: number;
}

/**
 * Host-supplied storage for last-known snapshots (localStorage in a browser).
 * Key it per backend environment. Implementations may throw (storage denied,
 * quota); callers ignore failures.
 */
export interface SnapshotStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

/** Where one resource persists its snapshot. */
export interface SnapshotSlot {
  store: SnapshotStore;
  key: string;
}

// Bump when a persisted type changes shape: a mismatch reads as no snapshot.
const SNAPSHOT_VERSION = 1;
// Account state recomputes on every market tick; storage sees at most one write per window.
const SNAPSHOT_WRITE_MS = 5_000;

export interface ResourceHandle<T> {
  set(value: T): void;
  /**
   * Commit a provisional value from the host's own cache (e.g. last session's
   * static markets list): readable through `get()`, but neither persisted nor
   * preferred by `lastKnown()` over a snapshot of real data.
   */
  seed(value: T): void;
  update(fn: (prev: T | undefined) => T): void;
  current(): T | undefined;
  fail(err: Error): void;
}

/** A source seeds + subscribes and returns a teardown function. */
export type ResourceSource<T> = (handle: ResourceHandle<T>) => () => void;

export class BaseResource<T> implements Resource<T> {
  private value: T | undefined;
  private at = 0;
  private provisional = false;
  private persisted: Snapshot<T> | null | undefined;
  private writeTimer: ReturnType<typeof setTimeout> | undefined;
  private _error: Error | undefined;
  private readonly listeners = new Set<() => void>();
  private teardown: (() => void) | undefined;
  private started = false;
  private readyPromise: Promise<T> | undefined;
  private readyResolve: ((v: T) => void) | undefined;
  private readyReject: ((e: Error) => void) | undefined;

  constructor(
    private readonly source: ResourceSource<T>,
    private readonly slot?: SnapshotSlot,
  ) {}

  get(): T | undefined {
    return this.value;
  }

  isProvisional(): boolean {
    return this.provisional;
  }

  lastKnown(): Snapshot<T> | undefined {
    if (this.value !== undefined && !this.provisional) return { value: this.value, at: this.at };
    if (this.persisted === undefined) this.persisted = this.readSlot();
    return this.persisted ?? undefined;
  }

  get error(): Error | undefined {
    return this._error;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    this.ensureStarted();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stop();
    };
  }

  ready(): Promise<T> {
    if (this.value !== undefined) return Promise.resolve(this.value);
    if (!this.readyPromise) {
      this.readyPromise = new Promise<T>((resolve, reject) => {
        this.readyResolve = resolve;
        this.readyReject = reject;
      });
    }
    this.ensureStarted();
    return this.readyPromise;
  }

  /**
   * Force teardown, ignoring the subscriber count — for `client.close()`, not
   * for one consumer that is done with a shared resource. Resources are
   * memoised per key, so destroying one another consumer still holds stops its
   * source underneath it; releasing your `subscribe()` teardown is enough,
   * since the last one out stops the source anyway.
   */
  destroy(): void {
    this.stop();
  }

  /**
   * Tear down and restart the source, forcing a fresh seed while keeping
   * subscribers and the current value (no flicker — the old snapshot stays
   * until the new seed lands). No-op when the resource isn't running. For
   * out-of-band mutations the streams don't announce (e.g. a faucet mint).
   */
  refresh(): void {
    if (!this.started) return;
    this.stop();
    this.ensureStarted();
  }

  private ensureStarted(): void {
    if (this.started) return;
    this.started = true;
    const handle: ResourceHandle<T> = {
      set: (v) => this.commit(v),
      seed: (v) => this.commit(v, true),
      update: (fn) => this.commit(fn(this.value)),
      current: () => this.value,
      fail: (err) => {
        this._error = err;
        if (this.readyReject) {
          this.readyReject(err);
          this.readyResolve = undefined;
          this.readyReject = undefined;
          this.readyPromise = undefined; // allow a later ready() to retry
        }
        this.emit();
      },
    };
    try {
      this.teardown = this.source(handle);
    } catch (err) {
      this._error = err as Error;
      this.started = false;
      this.emit();
    }
  }

  private stop(): void {
    if (!this.started) return;
    this.started = false;
    this.writeSlot();
    const t = this.teardown;
    this.teardown = undefined;
    if (t) try { t(); } catch { /* ignore */ }
  }

  private commit(v: T, provisional = false): void {
    this.value = v;
    this.at = Date.now();
    this.provisional = provisional;
    if (this.slot && !provisional) this.writeTimer ??= setTimeout(() => this.writeSlot(), SNAPSHOT_WRITE_MS);
    this._error = undefined;
    if (this.readyResolve) {
      this.readyResolve(v);
      this.readyResolve = undefined;
      this.readyReject = undefined;
    }
    this.emit();
  }

  private readSlot(): Snapshot<T> | null {
    if (!this.slot) return null;
    try {
      const raw = this.slot.store.get(this.slot.key);
      const s = raw ? parseBig<{ v: number; at: number; value: T }>(raw) : undefined;
      return s?.v === SNAPSHOT_VERSION ? { value: s.value, at: s.at } : null;
    } catch {
      return null;
    }
  }

  private writeSlot(): void {
    clearTimeout(this.writeTimer);
    this.writeTimer = undefined;
    if (!this.slot || this.value === undefined || this.provisional) return;
    try {
      this.slot.store.set(this.slot.key, stringifyBig({ v: SNAPSHOT_VERSION, at: this.at, value: this.value }));
    } catch { /* storage denied or full */ }
  }

  private emit(): void {
    this.listeners.forEach((l) => {
      try { l(); } catch { /* ignore */ }
    });
  }
}

/**
 * A value computed from a parent that has nothing yet, or only a provisional
 * seed, is itself provisional: never persisted or preferred by `lastKnown()`.
 */
const unconfirmed = (p: Resource<unknown>): boolean => p.get() === undefined || p.isProvisional?.() === true;

/** A read-only view derived from several resources; recomputes on any change. */
export function combineResources<T>(
  parents: Resource<unknown>[],
  compute: () => T | undefined,
  slot?: SnapshotSlot,
): Resource<T> {
  return new BaseResource<T>((handle) => {
    let alive = true;
    const apply = () => {
      if (!alive) return;
      const next = compute();
      if (next === undefined) return;
      if (parents.some(unconfirmed)) handle.seed(next);
      else handle.set(next);
    };
    const unsubs = parents.map((p) => p.subscribe(apply));
    queueMicrotask(apply);
    return () => { alive = false; unsubs.forEach((u) => u()); };
  }, slot);
}

/** A read-only view derived from another resource. */
export function derivedResource<S, T>(
  parent: Resource<S>,
  select: (s: S | undefined) => T | undefined,
): Resource<T> {
  return new BaseResource<T>((handle) => {
    let alive = true;
    const apply = () => {
      if (!alive) return;
      const next = select(parent.get());
      if (next === undefined) return;
      if (parent.isProvisional?.()) handle.seed(next);
      else handle.set(next);
    };
    const unsub = parent.subscribe(apply);
    // Defer the initial emit: never call handle.set synchronously inside
    // subscribe() — a synchronous store notification during a useSyncExternalStore
    // subscribe can loop if the subscribe closure is unstable.
    queueMicrotask(apply);
    return () => { alive = false; unsub(); };
  });
}
