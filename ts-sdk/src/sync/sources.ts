// Per-entity ResourceSource factories: seed once over REST where it helps, then
// maintain in memory from the matching `pod_*` channel.
//
// Reconnect model:
//  - Current-state channels (markets/positions/triggers) subscribe with
//    `since: 0`, so every (re)subscribe yields a fresh immediate snapshot — no
//    staleness possible, nothing to re-seed.
//  - REST-seeded channels (markets static, orderbook) re-seed on every
//    (re)connect via `onConnected`, so state is refreshed after any downtime.
//  - The WS client auto-resubscribes live subs on reconnect; tick-log channels
//    that use `since` (candles/orders) advance/refresh it and fall back to a
//    REST re-seed via `onError` when `since` is too old (down too long).

import type {
  Address, Market, MarketId, Orderbook, PositionsSnapshot, Status, Trigger,
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
}

/** Run `fn` on every successful connection (now if already open, and on each reconnect). */
export function onConnected(ws: PodWsClient, fn: () => void): () => void {
  const off = ws.on("open", fn);
  if (ws.state === "open") fn();
  return off;
}

export function statusSource({ rest, ws }: SyncContext): ResourceSource<Status> {
  return (h) => {
    let alive = true;
    const seed = () => { rest.status().then((s) => { if (alive) h.set(s); }).catch((e) => h.fail(e)); };
    const off = onConnected(ws, seed);
    return () => { alive = false; off(); };
  };
}

export function marketsSource(
  { rest, ws, marketResyncMs }: SyncContext,
): ResourceSource<Market[]> {
  return (h) => {
    let alive = true;
    const byId = new Map<string, Market>();
    // Stable display order = the static /clob/markets order, so the list never
    // reshuffles as dynamics arrive (markets not yet in the static list sort last).
    const orderIndex = new Map<string, number>();
    const publish = () => h.set(
      [...byId.values()].sort((a, b) =>
        (orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER)
        || a.id.localeCompare(b.id)),
    );
    const mergePatch = (patch: Partial<Market> & { id: string }) => {
      const existing = byId.get(patch.id);
      byId.set(patch.id, existing ? { ...existing, ...patch } : (patch as Market));
    };

    const seedStatic = () => rest.markets().then((markets) => {
      if (!alive) return;
      markets.forEach((m, i) => { orderIndex.set(m.id, i); byId.set(m.id, { ...byId.get(m.id), ...m }); });
      publish();
    }).catch((e) => { if (!byId.size) h.fail(e); });

    // 24h vol/high/low slide with time and only the REST stats reflect that
    // (the WS only pushes on a clear) — so poll them periodically.
    const seedStats = () => rest.marketStats().then((page) => {
      if (!alive) return;
      page.markets.forEach(mergePatch);
      publish();
    }).catch(() => { /* live dynamics also arrive on the stream */ });

    const offOpen = onConnected(ws, () => { void seedStatic(); void seedStats(); });
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
    const offOpen = onConnected(ws, seed);
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
