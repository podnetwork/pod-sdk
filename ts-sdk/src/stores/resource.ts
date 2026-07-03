// The core observable abstraction. A Resource holds an in-memory value, is
// ref-counted (its source starts on the first subscriber and tears down after
// the last leaves), and exposes the useSyncExternalStore-shaped contract.

export interface Resource<T> {
  get(): T | undefined;
  subscribe(listener: () => void): () => void;
  ready(): Promise<T>;
  readonly error?: Error;
}

export interface ResourceHandle<T> {
  set(value: T): void;
  update(fn: (prev: T | undefined) => T): void;
  current(): T | undefined;
  fail(err: Error): void;
}

/** A source seeds + subscribes and returns a teardown function. */
export type ResourceSource<T> = (handle: ResourceHandle<T>) => () => void;

export class BaseResource<T> implements Resource<T> {
  private value: T | undefined;
  private _error: Error | undefined;
  private readonly listeners = new Set<() => void>();
  private teardown: (() => void) | undefined;
  private started = false;
  private readyPromise: Promise<T> | undefined;
  private readyResolve: ((v: T) => void) | undefined;
  private readyReject: ((e: Error) => void) | undefined;

  constructor(private readonly source: ResourceSource<T>) {}

  get(): T | undefined {
    return this.value;
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

  /** Force teardown (used by the client on close). */
  destroy(): void {
    this.stop();
  }

  private ensureStarted(): void {
    if (this.started) return;
    this.started = true;
    const handle: ResourceHandle<T> = {
      set: (v) => this.commit(v),
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
    const t = this.teardown;
    this.teardown = undefined;
    if (t) try { t(); } catch { /* ignore */ }
  }

  private commit(v: T): void {
    this.value = v;
    this._error = undefined;
    if (this.readyResolve) {
      this.readyResolve(v);
      this.readyResolve = undefined;
      this.readyReject = undefined;
    }
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((l) => {
      try { l(); } catch { /* ignore */ }
    });
  }
}

/** A read-only view derived from several resources; recomputes on any change. */
export function combineResources<T>(
  parents: Resource<unknown>[],
  compute: () => T | undefined,
): Resource<T> {
  return new BaseResource<T>((handle) => {
    let alive = true;
    const apply = () => {
      if (!alive) return;
      const next = compute();
      if (next !== undefined) handle.set(next);
    };
    const unsubs = parents.map((p) => p.subscribe(apply));
    queueMicrotask(apply);
    return () => { alive = false; unsubs.forEach((u) => u()); };
  });
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
      if (next !== undefined) handle.set(next);
    };
    const unsub = parent.subscribe(apply);
    // Defer the initial emit: never call handle.set synchronously inside
    // subscribe() — a synchronous store notification during a useSyncExternalStore
    // subscribe can loop if the subscribe closure is unstable.
    queueMicrotask(apply);
    return () => { alive = false; unsub(); };
  });
}
