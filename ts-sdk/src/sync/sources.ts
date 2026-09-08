// Per-entity ResourceSource factories: seed once over REST where it helps, then
// maintain in memory from the matching `pod_*` channel.
//
// Reconnect model:
//  - Current-state channels (markets/positions/triggers) subscribe with
//    `since: 0`, so every (re)subscribe yields a fresh immediate snapshot — no
//    staleness possible, nothing to re-seed.
//  - REST-seeded channels (markets static, orderbook, balances) seed
//    immediately — the fetch doesn't need the socket, so first data isn't
//    held behind the WS handshake — and re-seed on every (re)connect via
//    `seedNowAndOnReconnect`, so state is refreshed after any downtime.
//  - The WS client auto-resubscribes live subs on reconnect; tick-log channels
//    that use `since` (candles/orders) advance/refresh it and fall back to a
//    REST re-seed via `onError` when `since` is too old (down too long).

import type {
  Address, Balances, BridgeConfig, Market, MarketId, Orderbook, PositionsSnapshot, Status, Trigger,
} from "../types/public.js";
import type {
  WireMarketDynamics, WireOrderbook, WirePositionsPush, WireTriggersPush,
} from "../types/wire.js";
import {
  decodeMarketDynamics, decodeOrderbook, decodePositions, decodeTrigger,
} from "../codec/decode.js";
import type { PodRestClient } from "../transport/rest.js";
import type { PodWsClient } from "../transport/ws.js";
import type { ResourceSource } from "../stores/resource.js";

export interface SyncContext {
  rest: PodRestClient;
  ws: PodWsClient;
  /** Periodic REST re-alignment interval (ms) for positions; 0 disables. */
  positionResyncMs: number;
  /** Periodic REST re-poll (ms) of market 24h stats; 0 disables. */
  marketResyncMs: number;
  /** Optional persistence for the static markets list (see marketsSource). */
  marketsCache?: MarketsCache;
}

/**
 * Host-supplied persistence (e.g. localStorage-backed) for the static markets
 * list, so market-keyed UI can mount immediately on a repeat visit instead of
 * waiting a REST round trip. Only the static `/clob/markets` config is stored —
 * never prices/stats, which always arrive live. Implementations may throw
 * (storage denied, quota); callers ignore failures.
 */
export interface MarketsCache {
  get(): string | null;
  set(value: string): void;
}

// Static-list serialization for MarketsCache. Version is embedded in the
// payload: a mismatch after an SDK format change just falls back to a cold
// start. bigints round-trip as "<digits>n" strings.
const MARKETS_CACHE_VERSION = 1;
const serializeMarkets = (markets: Market[]): string =>
  JSON.stringify({ v: MARKETS_CACHE_VERSION, markets }, (_k, v: unknown) => (typeof v === "bigint" ? `${v}n` : v));
const parseCachedMarkets = (raw: string | null): Market[] | undefined => {
  if (!raw) return undefined;
  const data = JSON.parse(raw, (_k, v: unknown) =>
    typeof v === "string" && /^-?\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v) as { v: number; markets: Market[] };
  return data?.v === MARKETS_CACHE_VERSION ? data.markets : undefined;
};

/**
 * Seed now — a REST fetch needs no socket, so don't hold first data behind the
 * WS handshake — and re-seed on every (re)connect so state refreshes after any
 * downtime. On a cold start the connect completes shortly after the immediate
 * seed and triggers one extra seed; that duplicate is what guarantees a seed
 * at/after the moment the WS subscription goes live, exactly as before.
 */
export function seedNowAndOnReconnect(ws: PodWsClient, fn: () => void): () => void {
  const off = ws.on("open", fn);
  fn();
  return off;
}

export function statusSource({ rest, ws }: SyncContext): ResourceSource<Status> {
  return (h) => {
    let alive = true;
    const seed = () => { rest.status().then((s) => { if (alive) h.set(s); }).catch((e) => h.fail(e)); };
    const off = seedNowAndOnReconnect(ws, seed);
    return () => { alive = false; off(); };
  };
}

/** Static bridge config (ADR 0033 §5). Re-seeded on reconnect because an
 * operator can change the token set or the withdraw limits under a long-lived
 * tab, and a stale window would offer amounts the node now refuses. */
export function bridgeConfigSource({ rest, ws }: SyncContext): ResourceSource<BridgeConfig> {
  return (h) => {
    let alive = true;
    const off = seedNowAndOnReconnect(ws, () => {
      rest.bridgeConfig()
        .then((c) => { if (alive) h.set(c); })
        .catch((e) => { if (!h.current()) h.fail(e as Error); });
    });
    return () => { alive = false; off(); };
  };
}

export function marketsSource(
  { rest, ws, marketResyncMs, marketsCache }: SyncContext,
): ResourceSource<Market[]> {
  return (h) => {
    let alive = true;
    const byId = new Map<string, Market>();
    // Stable display order = the static /clob/markets order, so the list never
    // reshuffles as dynamics arrive (markets not yet in the static list sort last).
    const orderIndex = new Map<string, number>();
    const publish = () => h.set(
      [...byId.values()]
        // pod_markets dynamics can arrive (and create an entry) before the static
        // /clob/markets seed — those lack base/quote/name. Don't expose a market
        // until its static config has merged in; the dynamics stay buffered.
        .filter((m) => m.base !== undefined)
        .sort((a, b) =>
          (orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER)
          || a.id.localeCompare(b.id)),
    );
    const mergePatch = (patch: Partial<Market> & { id: string }) => {
      const existing = byId.get(patch.id);
      byId.set(patch.id, existing ? { ...existing, ...patch } : (patch as Market));
    };

    // Last session's static list (never dynamics — those stay live-only):
    // seeded synchronously so market-keyed UI mounts without a round trip.
    // The REST seed below overwrites it field-for-field when it lands.
    const staticIds = new Set<MarketId>();
    try {
      const cached = marketsCache && parseCachedMarkets(marketsCache.get());
      cached?.forEach((m, i) => { orderIndex.set(m.id, i); byId.set(m.id, m); staticIds.add(m.id); });
      if (byId.size) publish();
    } catch { /* absent/corrupt cache — plain cold start */ }

    const seedStatic = () => rest.markets().then((markets) => {
      if (!alive) return;
      // Fresh static truth: drop previously listed markets that no longer
      // exist, so a delisting cannot survive a reconnect seed. Dynamics-only
      // entries buffered from the WS stream are deliberately untouched.
      const fresh = new Set(markets.map((m) => m.id));
      for (const id of staticIds) if (!fresh.has(id)) { byId.delete(id); orderIndex.delete(id); }
      staticIds.clear();
      markets.forEach((m, i) => {
        staticIds.add(m.id);
        orderIndex.set(m.id, i);
        byId.set(m.id, { ...byId.get(m.id), ...m });
      });
      publish();
      try { marketsCache?.set(serializeMarkets(markets)); } catch { /* storage denied/full */ }
    }).catch((e) => { if (!byId.size) h.fail(e); });

    // 24h vol/high/low slide with time and only the REST stats reflect that
    // (the WS only pushes on a clear) — so poll them periodically.
    const seedStats = () => rest.marketStats().then((page) => {
      if (!alive) return;
      page.markets.forEach(mergePatch);
      publish();
    }).catch(() => { /* live dynamics also arrive on the stream */ });

    const offOpen = seedNowAndOnReconnect(ws, () => { void seedStatic(); void seedStats(); });
    const timer = marketResyncMs > 0 ? setInterval(seedStats, marketResyncMs) : undefined;

    // Live clearing/mark/funding between polls.
    const sub = ws.subscribe("pod_markets", { since: 0 }, (result) => {
      const items = Array.isArray(result) ? result : [result];
      for (const it of items) {
        const w = it as Record<string, unknown>;
        mergePatch(decodeMarketDynamics({ ...w, orderbook_id: w.orderbook_id ?? w.orderbook } as WireMarketDynamics));
      }
      publish();
    });

    return () => { alive = false; offOpen(); if (timer) clearInterval(timer); sub.unsubscribe(); };
  };
}

export function orderbookSource(
  { rest, ws }: SyncContext,
  id: MarketId,
  depth?: number,
): ResourceSource<Orderbook> {
  return (h) => {
    let alive = true;
    const seed = () => {
      rest.orderbook(id).then((ob) => {
        const cur = h.current();
        if (alive && (!cur || cur.timeMs <= ob.timeMs)) h.set(ob);
      }).catch((e) => { if (!h.current()) h.fail(e); });
    };
    const offOpen = seedNowAndOnReconnect(ws, seed);
    const sub = ws.subscribe("pod_orderbook", { clobIds: [id], depth }, (result) => {
      const ob = decodeOrderbook(result as WireOrderbook);
      const cur = h.current();
      if (!cur || ob.timeMs >= cur.timeMs) h.set(ob);
    });
    return () => { alive = false; offOpen(); sub.unsubscribe(); };
  };
}

export function positionsSource(
  { rest, ws, positionResyncMs }: SyncContext,
  account: Address,
): ResourceSource<PositionsSnapshot> {
  return (h) => {
    let alive = true;
    // Baseline refreshes from three triggers, all just replacing the snapshot:
    //  - WS since:0 immediate + on every account-touching tick,
    //  - a periodic REST poll that re-aligns to the backend's exact accounting
    //    (corrects mark-extrapolation drift even when the account isn't touched).
    const reseed = () => rest.positions(account).then((s) => { if (alive) h.set(s); }).catch(() => {});
    reseed();
    const timer = positionResyncMs > 0 ? setInterval(reseed, positionResyncMs) : undefined;
    const sub = ws.subscribe("pod_positions", { account, since: 0 }, (result) => {
      if (alive) h.set(decodePositions((result as WirePositionsPush).data));
    });
    return () => { alive = false; if (timer) clearInterval(timer); sub.unsubscribe(); };
  };
}

export function balancesSource(
  { rest, ws, positionResyncMs }: SyncContext,
  account: Address,
): ResourceSource<Balances> {
  return (h) => {
    let alive = true;
    // No dedicated balances stream — seed over REST, re-poll periodically, and
    // re-fetch (debounced) whenever the account is touched on pod_positions, so
    // a spot fill / deposit reflects promptly without spamming a fetch per tick.
    const seed = () => rest.balances(account).then((b) => { if (alive) h.set(b); }).catch((e) => { if (!h.current()) h.fail(e as Error); });
    const offOpen = seedNowAndOnReconnect(ws, seed);
    const timer = positionResyncMs > 0 ? setInterval(seed, positionResyncMs) : undefined;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const sub = ws.subscribe("pod_positions", { account, since: 0 }, () => {
      if (!alive || debounce) return;
      debounce = setTimeout(() => { debounce = undefined; seed(); }, 500);
    });
    return () => {
      alive = false;
      offOpen();
      if (timer) clearInterval(timer);
      if (debounce) clearTimeout(debounce);
      sub.unsubscribe();
    };
  };
}

export function triggersSource(
  { ws }: SyncContext,
  account: Address,
): ResourceSource<Trigger[]> {
  return (h) => {
    const sub = ws.subscribe("pod_triggers", { account, since: 0 }, (result) => {
      h.set((result as WireTriggersPush).triggers.map(decodeTrigger));
    });
    return () => sub.unsubscribe();
  };
}
