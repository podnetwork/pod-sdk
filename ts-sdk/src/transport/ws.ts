// Layer 1: one multiplexed WebSocket over the JSON-RPC `eth_subscribe` /
// `eth_subscription` / `eth_unsubscribe` protocol with `pod_*` sub-types.
// Ref-counted logical subscriptions, exponential backoff, idle-timeout
// reconnect, and automatic re-subscribe (with each sub's current `since`).

import type { Address, MarketId } from "../types/public.js";

export type Channel =
  | "pod_orderbook" | "pod_orders" | "pod_candles"
  | "pod_markets" | "pod_positions" | "pod_triggers";

export interface SubParams {
  clobIds?: MarketId[];
  account?: Address;
  depth?: number;
  since?: number; // micros (solution time)
}

export interface Subscription {
  unsubscribe(): void;
  /** Update stored params (e.g. advance `since`) used on the next (re)subscribe. */
  update(params: SubParams): void;
  /** Force a fresh eth_subscribe with the current params (used after `onError`). */
  resubscribe(): void;
}

export type ConnectionState = "connecting" | "open" | "closed";
export type WsEvent = "open" | "close" | "reconnect" | "error";

export type WebSocketCtor = {
  new (url: string): WebSocket;
};

export interface WsClientOptions {
  wsUrl: string;
  WebSocket?: WebSocketCtor;
  maxDelayMs?: number;
  idleTimeoutMs?: number;
}

/**
 * The server ended a subscription on its own initiative.
 *
 * Delivered to `subscribe`'s `onError`. The subscription is gone server-side, and
 * the connection stays open — so nothing else will nudge you, and no further
 * updates arrive on it. To resume where you left off:
 *
 * ```ts
 * const sub = ws.subscribe("pod_orders", { account }, onUpdate, (err) => {
 *   if (err instanceof PodSubscriptionClosedError && err.resumable) {
 *     if (err.resumeSince !== undefined) sub.update({ since: err.resumeSince });
 *     sub.resubscribe();
 *   }
 * });
 * ```
 *
 * `resumable` is false only for a server bug (`-32023`), where resubscribing
 * immediately will most likely reproduce it — back off or report it instead.
 */
export class PodSubscriptionClosedError extends Error {
  constructor(
    /** -32020 lagged, -32021 node shutting down, -32022 send timeout, -32023 server bug. */
    public code: number,
    /** Whether resubscribing recovers the stream. */
    public resumable: boolean,
    message: string,
    /**
     * Solution time (micros) to pass back as `since`. Absent when the
     * subscription was not yet square on a whole tick — reuse your own `since`.
     */
    public resumeSince?: number,
    /** `pod_orders_v2` only: pass back as `since_book` alongside `resumeSince`. */
    public resumeSinceBook?: string,
    /** `-32020` only: how many ticks the broadcast dropped. */
    public missed?: number,
    /** The raw `params.error`, for anything not mapped above. */
    public raw?: unknown,
  ) {
    super(message);
    this.name = "PodSubscriptionClosedError";
  }
}

/** What the server sends in a close notification's `params.error`. */
interface WireCloseError {
  code?: unknown;
  message?: unknown;
  data?: {
    resumable?: unknown;
    resume_since?: unknown;
    resume_since_book?: unknown;
    missed?: unknown;
  };
}

function parseClose(err: WireCloseError): PodSubscriptionClosedError {
  const d = err.data ?? {};
  const num = (v: unknown) => (typeof v === "number" ? v : undefined);
  return new PodSubscriptionClosedError(
    num(err.code) ?? 0,
    // An absent or non-true `resumable` counts as not resumable: retrying a
    // close we failed to understand can hot-loop, which is the worse failure.
    d.resumable === true,
    typeof err.message === "string" ? err.message : "subscription closed by the server",
    num(d.resume_since),
    typeof d.resume_since_book === "string" ? d.resume_since_book : undefined,
    num(d.missed),
    err,
  );
}

interface LogicalSub {
  channel: Channel;
  params: SubParams;
  onMessage: (result: unknown) => void;
  /**
   * `eth_subscribe` was rejected (e.g. `since` too old), or the server closed a
   * live subscription — the latter is a [`PodSubscriptionClosedError`]. Either
   * way the subscription is not running; `resubscribe()` starts a new one.
   */
  onError?: (err: unknown) => void;
  subId?: string; // server-assigned, when active
}

let nextReqId = 1;

export class PodWsClient {
  private readonly url: string;
  private readonly WS: WebSocketCtor;
  private readonly maxDelayMs: number;
  private readonly idleTimeoutMs: number;

  private ws?: WebSocket;
  private _state: ConnectionState = "closed";
  private attempts = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private idleTimer?: ReturnType<typeof setTimeout>;
  private wantOpen = false;

  private readonly subs = new Set<LogicalSub>();
  private readonly bySubId = new Map<string, LogicalSub>();
  private readonly pending = new Map<number, (result: unknown, error?: unknown) => void>();
  private readonly listeners = new Map<WsEvent, Set<(e?: unknown) => void>>();

  constructor(opts: WsClientOptions) {
    this.url = opts.wsUrl;
    const WS = opts.WebSocket ?? (globalThis as { WebSocket?: WebSocketCtor }).WebSocket;
    if (!WS) throw new Error("No WebSocket implementation available; pass `WebSocket` in options.");
    this.WS = WS;
    this.maxDelayMs = opts.maxDelayMs ?? 30_000;
    this.idleTimeoutMs = opts.idleTimeoutMs ?? 45_000;
  }

  get state(): ConnectionState {
    return this._state;
  }

  on(event: WsEvent, handler: (e?: unknown) => void): () => void {
    let set = this.listeners.get(event);
    if (!set) this.listeners.set(event, (set = new Set()));
    set.add(handler);
    return () => set!.delete(handler);
  }

  private emit(event: WsEvent, e?: unknown): void {
    this.listeners.get(event)?.forEach((h) => {
      try { h(e); } catch { /* ignore listener errors */ }
    });
  }

  connect(): void {
    this.wantOpen = true;
    if (this._state === "closed") this.open();
  }

  close(): void {
    this.wantOpen = false;
    this.clearTimers();
    this.subs.clear();
    this.bySubId.clear();
    this.pending.clear();
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = undefined;
    }
    this._state = "closed";
  }

  subscribe(
    channel: Channel,
    params: SubParams,
    onMessage: (result: unknown) => void,
    onError?: (err: unknown) => void,
  ): Subscription {
    const sub: LogicalSub = { channel, params: { ...params }, onMessage, onError };
    this.subs.add(sub);
    this.connect();
    if (this._state === "open") this.sendSubscribe(sub);
    return {
      unsubscribe: () => this.removeSub(sub),
      update: (p) => { sub.params = { ...sub.params, ...p }; },
      resubscribe: () => {
        if (this._state !== "open") return;
        if (sub.subId) { this.bySubId.delete(sub.subId); sub.subId = undefined; }
        this.sendSubscribe(sub);
      },
    };
  }

  // --- connection lifecycle ---

  private open(): void {
    this.clearReconnect();
    this._state = "connecting";
    const ws = new this.WS(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this._state = "open";
      this.attempts = 0;
      this.emit("open");
      this.armIdle();
      for (const sub of this.subs) { sub.subId = undefined; this.sendSubscribe(sub); }
    };
    ws.onmessage = (ev: MessageEvent) => this.onMessage(ev.data);
    ws.onerror = (ev: Event) => this.emit("error", ev);
    ws.onclose = () => {
      this.ws = undefined;
      this.bySubId.clear();
      for (const s of this.subs) s.subId = undefined;
      if (this.wantOpen) this.scheduleReconnect();
      else this._state = "closed";
    };
  }

  private scheduleReconnect(): void {
    this._state = "connecting";
    const base = Math.min(this.maxDelayMs, 1000 * 2 ** this.attempts);
    const delay = base / 2 + Math.random() * (base / 2); // jittered
    this.attempts++;
    this.clearTimers();
    this.reconnectTimer = setTimeout(() => {
      this.emit("reconnect");
      this.open();
    }, delay);
  }

  private armIdle(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      // No traffic for too long; force a reconnect.
      if (this.ws) { try { this.ws.close(); } catch { /* ignore */ } }
    }, this.idleTimeoutMs);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = undefined; }
  }
  private clearTimers(): void {
    this.clearReconnect();
    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = undefined; }
  }

  // --- protocol ---

  private send(method: string, params: unknown[], onReply?: (result: unknown, error?: unknown) => void): void {
    if (!this.ws || this._state !== "open") return;
    const id = nextReqId++;
    if (onReply) this.pending.set(id, onReply);
    this.ws.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
  }

  private wireParams(p: SubParams): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (p.clobIds && p.clobIds.length) out.clob_ids = p.clobIds;
    if (p.account) out.account = p.account; // server aliases to `bidder`
    if (p.depth !== undefined) out.depth = p.depth;
    if (p.since !== undefined) out.since = p.since;
    return out;
  }

  private sendSubscribe(sub: LogicalSub): void {
    this.send("eth_subscribe", [sub.channel, this.wireParams(sub.params)], (result, error) => {
      if (error || typeof result !== "string") {
        const err = error ?? new Error("eth_subscribe failed");
        if (sub.onError) sub.onError(err); // owner can re-seed + resubscribe (e.g. `since` too old)
        else this.emit("error", err);
        return;
      }
      // Unsubscribed while the ack was in flight (removeSub had no subId to
      // cancel yet): registering it now would resurrect a dead subscription
      // that keeps pushing into its owner's stale state — tell the server to
      // drop it instead.
      if (!this.subs.has(sub)) {
        this.send("eth_unsubscribe", [result]);
        return;
      }
      sub.subId = result;
      this.bySubId.set(result, sub);
    });
  }

  private removeSub(sub: LogicalSub): void {
    this.subs.delete(sub);
    if (sub.subId) {
      this.bySubId.delete(sub.subId);
      this.send("eth_unsubscribe", [sub.subId]);
      sub.subId = undefined;
    }
  }

  private onMessage(data: unknown): void {
    this.armIdle();
    const handle = (text: string) => {
      let msg: any;
      try { msg = JSON.parse(text); } catch { return; }
      if (msg && msg.method === "eth_subscription" && msg.params) {
        const sub = this.bySubId.get(msg.params.subscription);
        if (!sub) return;
        // A close carries `error` where an update carries `result`. Checking for
        // it first matters twice over: the subscription is dead and must be
        // deregistered, and dispatching it as an update would hand the owner
        // `undefined` — which for the snapshot channels throws inside their
        // handler rather than doing nothing.
        if (msg.params.error) {
          this.bySubId.delete(msg.params.subscription);
          sub.subId = undefined; // server already dropped it; don't unsubscribe
          const closed = parseClose(msg.params.error as WireCloseError);
          if (sub.onError) sub.onError(closed);
          else this.emit("error", closed);
          return;
        }
        sub.onMessage(msg.params.result);
        return;
      }
      if (msg && msg.id !== undefined && this.pending.has(msg.id)) {
        const cb = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        cb(msg.result, msg.error);
      }
    };
    if (typeof data === "string") handle(data);
    else if (data instanceof Blob) data.text().then(handle).catch(() => {});
    else if (data instanceof ArrayBuffer) handle(new TextDecoder().decode(data));
  }
}
