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
  WireMarketDynamics, WireOrderbook, WirePositionsPush, WireSpotHolding, WireTriggersPush,
} from "../types/wire.js";
import {
  decodeBalances, decodeMarketDynamics, decodeOrderbook, decodePositions, decodeTrigger,
} from "../codec/decode.js";
import { parseBig, stringifyBig } from "../codec/json.js";
import type { PodRestClient } from "../transport/rest.js";
import type { Channel, PodWsClient, SubParams } from "../transport/ws.js";
import { usToMs } from "../codec/units.js";
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
// start.
// 2: `status`/`minNotional` became required and the fees stopped decoding to 0.
// 3: bigints are tagged objects, not "<digits>n" strings (see codec/json).
const MARKETS_CACHE_VERSION = 3;
const serializeMarkets = (markets: Market[]): string =>
  stringifyBig({ v: MARKETS_CACHE_VERSION, markets });
const parseCachedMarkets = (raw: string | null): Market[] | undefined => {
  if (!raw) return undefined;
  const data = parseBig<{ v: number; markets: Market[] }>(raw);
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

/**
 * Keeps the highest watermark seen per key. A read served by a node behind the
 * one that produced what we hold returns false; equal is accepted, so the later
 * arrival wins.
 */
export function watermarks(): (ts: number | undefined, key?: string) => boolean {
  const seen = new Map<string, number>();
  return (ts, key = "") => {
    if (ts === undefined) return true;
    if (ts < (seen.get(key) ?? -Infinity)) return false;
    seen.set(key, ts);
    return true;
  };
}

export const MAX_SUB_RETRIES = 5;
export const subBackoffMs = (retries: number) => Math.min(30_000, 500 * 2 ** (retries - 1));

/** `ws.subscribe` for channels that need no cursor: a rejected or server-closed
 * sub is resubscribed with bounded backoff, cancelled once it is live again. */
function subscribeRetrying(
  ws: PodWsClient,
  channel: Channel,
  params: SubParams,
  onMessage: (result: unknown) => void,
): { unsubscribe(): void } {
  let retries = 0;
  let dead = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => { if (timer) { clearTimeout(timer); timer = undefined; } };
  // A reconnect resubscribes from `onopen`; a timer firing after that would drop the live server id.
  const offOpen = ws.on("open", cancel);
  const sub = ws.subscribe(channel, params, (result) => {
    retries = 0;
    cancel();
    onMessage(result);
  }, () => {
    if (dead || retries >= MAX_SUB_RETRIES) return;
    retries++;
    cancel();
    timer = setTimeout(() => { timer = undefined; if (!dead) sub.resubscribe(); }, subBackoffMs(retries));
  });
  return { unsubscribe: () => { dead = true; cancel(); offOpen(); sub.unsubscribe(); } };
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
    // Until REST's static list lands, anything published is built on the cached
    // list (possibly delisted markets, partial prices) and must stay provisional,
    // whichever path — cache, WS dynamics or stats — happens to publish it.
    let staticLoaded = false;
    const publish = () => (staticLoaded ? h.set : h.seed)(
      [...byId.values()]
        // pod_markets dynamics can arrive (and create an entry) before the static
        // /clob/markets seed — those lack base/quote/name. Don't expose a market
        // until its static config has merged in; the dynamics stay buffered.
        .filter((m) => m.base !== undefined)
        .sort((a, b) =>
          (orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER)
          || a.id.localeCompare(b.id)),
    );
    const fresh = watermarks();
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
      staticLoaded = true;
      publish();
      try { marketsCache?.set(serializeMarkets(markets)); } catch { /* storage denied/full */ }
    }).catch((e) => { if (!byId.size) h.fail(e); });

    // 24h vol/high/low slide with time and only the REST stats reflect that
    // (the WS only pushes on a clear) — so poll them periodically.
    const seedStats = () => rest.marketStats().then((page) => {
      if (!alive) return;
      page.markets.forEach((m) => { if (fresh(page.solutionNow, m.id)) mergePatch(m); });
      publish();
    }).catch(() => { /* live dynamics also arrive on the stream */ });

    const offOpen = seedNowAndOnReconnect(ws, () => { void seedStatic(); void seedStats(); });
    const timer = marketResyncMs > 0 ? setInterval(seedStats, marketResyncMs) : undefined;

    // Live clearing/mark/funding between polls.
    const sub = subscribeRetrying(ws, "pod_markets", { since: 0 }, (result) => {
      const items = Array.isArray(result) ? result : [result];
      for (const it of items) {
        const w = it as Record<string, unknown>;
        const id = (w.orderbook_id ?? w.orderbook) as string;
        if (!fresh(typeof w.timestamp === "number" ? usToMs(w.timestamp) : undefined, id)) continue;
        mergePatch(decodeMarketDynamics({ ...w, orderbook_id: id } as WireMarketDynamics));
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
    const sub = subscribeRetrying(ws, "pod_orderbook", { clobIds: [id], depth }, (result) => {
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
    const fresh = watermarks();
    const accept = (s: PositionsSnapshot) => { if (alive && fresh(s.timestampUs)) h.set(s); };
    const reseed = () => rest.positions(account).then(accept).catch(() => {});
    reseed();
    const timer = positionResyncMs > 0 ? setInterval(reseed, positionResyncMs) : undefined;
    const sub = subscribeRetrying(ws, "pod_positions", { account, since: 0 }, (result) => {
      accept(decodePositions((result as WirePositionsPush).data));
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
    // No dedicated balances stream: the pod_positions push carries the spot
    // holdings and cash too, so it is folded in; REST seeds and re-aligns.
    const fresh = watermarks();
    const accept = (b: Balances) => { if (alive && fresh(b.timestampUs)) h.set(b); };
    const seed = () => rest.balances(account).then(accept).catch((e) => { if (!h.current()) h.fail(e as Error); });
    const offOpen = seedNowAndOnReconnect(ws, seed);
    const timer = positionResyncMs > 0 ? setInterval(seed, positionResyncMs) : undefined;
    const sub = subscribeRetrying(ws, "pod_positions", { account, since: 0 }, (result) => {
      const w = (result as WirePositionsPush).data;
      accept(decodeBalances({
        balances: w.positions.filter((p) => p.kind === "spot") as unknown as WireSpotHolding[],
        cash: w.cash,
        withdrawable_cash: w.withdrawable_cash,
        net_deposits: w.net_deposits,
        timestamp: w.timestamp,
      }));
    });
    return () => {
      alive = false;
      offOpen();
      if (timer) clearInterval(timer);
      sub.unsubscribe();
    };
  };
}

export function triggersSource(
  { ws }: SyncContext,
  account: Address,
): ResourceSource<Trigger[]> {
  return (h) => {
    const fresh = watermarks();
    const sub = subscribeRetrying(ws, "pod_triggers", { account, since: 0 }, (result) => {
      const w = result as WireTriggersPush;
      if (fresh(w.timestamp)) h.set(w.triggers.map(decodeTrigger));
    });
    return () => sub.unsubscribe();
  };
}
