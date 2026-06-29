// React bindings: a context provider, the one universal `useResource` hook
// (over useSyncExternalStore), and thin typed sugar hooks. Reading a hook never
// triggers a refetch — it returns the in-memory snapshot and re-renders on
// change; mounting ref-counts the underlying subscription.

import {
  createContext, createElement, useCallback, useContext, useEffect, useMemo,
  useState, useSyncExternalStore, type PropsWithChildren,
} from "react";
import type { PodTradeClient } from "../client.js";
import type { Resource } from "../stores/resource.js";
import type { CandleSeries } from "../sync/candles.js";
import type { OrderHistory } from "../sync/orders.js";
import type {
  Address, Balances, Bar, LeaderboardEntry, LeaderboardPage, Market, MarketId, Order, Orderbook,
  OrdersQuery, PositionsSnapshot, Resolution, Status, TimeRange, Trigger, TriggersQuery, TxExplorer,
} from "../types/public.js";

const PodClientContext = createContext<PodTradeClient | null>(null);

export function PodTradeProvider(
  props: PropsWithChildren<{ client: PodTradeClient }>,
) {
  return createElement(PodClientContext.Provider, { value: props.client }, props.children);
}

export function usePodClient(): PodTradeClient {
  const client = useContext(PodClientContext);
  if (!client) throw new Error("usePodClient must be used within <PodTradeProvider>");
  return client;
}

/**
 * The one real hook. Everything else is sugar over this.
 *
 * `subscribe`/`getSnapshot` MUST be stable per `resource` — passing fresh
 * closures would make useSyncExternalStore re-subscribe every render, which
 * (combined with sources that emit synchronously on subscribe) loops forever.
 */
export function useResource<T>(resource: Resource<T>): T | undefined {
  const subscribe = useCallback((cb: () => void) => resource.subscribe(cb), [resource]);
  const getSnapshot = useCallback(() => resource.get(), [resource]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** The resource's last sync error (cleared on the next successful update). */
export function useResourceError(resource: Resource<unknown>): Error | undefined {
  const subscribe = useCallback((cb: () => void) => resource.subscribe(cb), [resource]);
  const getError = useCallback(() => resource.error, [resource]);
  return useSyncExternalStore(subscribe, getError, getError);
}

/** Data + error together. `loading` is true until the first value or error. */
export function useResourceState<T>(
  resource: Resource<T>,
): { data: T | undefined; error: Error | undefined; loading: boolean } {
  const data = useResource(resource);
  const error = useResourceError(resource);
  return { data, error, loading: data === undefined && error === undefined };
}

export function useStatus(): Status | undefined {
  return useResource(usePodClient().status);
}

export function useMarkets(): Market[] | undefined {
  return useResource(usePodClient().markets);
}

export function useMarket(id: MarketId): Market | undefined {
  const client = usePodClient();
  return useResource(useMemo(() => client.market(id), [client, id]));
}

export function useOrderbook(id: MarketId, opts?: { depth?: number }): Orderbook | undefined {
  const client = usePodClient();
  return useResource(useMemo(() => client.orderbook(id, opts), [client, id, opts?.depth]));
}

/** The CandleSeries instance (for `loadOlder`, `setWindow`, `loading`). */
export function useCandleSeries(
  id: MarketId, resolution: Resolution, range?: TimeRange,
): CandleSeries {
  const client = usePodClient();
  const series = useMemo(() => client.candles(id, resolution), [client, id, resolution]);
  useMemo(() => { if (range) series.setWindow(range); }, [series, range?.from, range?.to]);
  return series;
}

export function useCandles(
  id: MarketId, resolution: Resolution, range?: TimeRange,
): Bar[] | undefined {
  const series = useCandleSeries(id, resolution, range);
  return useResource(series as Resource<Bar[]>);
}

export function useOrderHistory(account: Address, query?: OrdersQuery): OrderHistory {
  const client = usePodClient();
  const key = query ? JSON.stringify(query) : "";
  return useMemo(() => client.orders(account, query), [client, account, key]);
}

export function useOrders(account: Address, query?: OrdersQuery): Order[] | undefined {
  const history = useOrderHistory(account, query);
  return useResource(history as Resource<Order[]>);
}

export interface OrdersPage {
  orders: Order[];
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  loading: boolean;
  next: () => void;
  prev: () => void;
}

export interface PagedOrders {
  orders: Order[];
  page: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  next: () => void;
  prev: () => void;
}

/**
 * Open (active) orders, paginated. Backed by the live orders resource seeded
 * with a single bounded fetch (`max`, default 500) + the pod_orders stream;
 * filtered to `active` and paged in memory here in the library. Assumes the
 * first `max` orders cover the open set — beyond that, use the full history.
 */
export function useOpenOrders(
  account: Address,
  opts?: { pageSize?: number; max?: number },
): PagedOrders {
  const client = usePodClient();
  const pageSize = opts?.pageSize ?? 10;
  const max = opts?.max ?? 500;
  const history = useMemo(() => client.orders(account, { limit: max }), [client, account, max]);
  const all = useResource(history as Resource<Order[]>) ?? [];
  const active = all.filter((o) => o.status === "active");
  const [page, setPage] = useState(0);

  const lastPage = Math.max(0, Math.ceil(active.length / pageSize) - 1);
  const p = Math.min(page, lastPage); // clamp if the active set shrank
  return {
    orders: active.slice(p * pageSize, p * pageSize + pageSize),
    page: p,
    total: active.length,
    hasPrev: p > 0,
    hasNext: p < lastPage,
    next: () => setPage((x) => Math.min(lastPage, x + 1)),
    prev: () => setPage((x) => Math.max(0, x - 1)),
  };
}

/**
 * Cursor-paginated order history over the REST API (NOT in-memory slicing).
 * Each page is a `rest.orders` call keyed by the server's `next_cursor`, so
 * pages are stable under head insertions (no gaps/duplication). Prev re-fetches
 * the prior page's cursor (settled history is immutable / cacheable).
 *
 * Cursors only decide *which window* of orders is shown; the per-order live
 * state (status, fills) is overlaid from the `pod_orders` stream so a row
 * updates in place — e.g. an order cancelled while it's on screen flips to
 * `canceled` without a refetch. Settled orders below the live window are
 * immutable, so missing them from the overlay is harmless.
 */
export function useOrdersPage(account: Address, opts?: { limit?: number; liveWindow?: number }): OrdersPage {
  const client = usePodClient();
  const limit = opts?.limit ?? 25;
  const liveWindow = opts?.liveWindow ?? 500;
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [page, setPage] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const cursor = cursors[page] ?? undefined;
  useEffect(() => {
    let alive = true;
    setLoading(true);
    client.rest.orders(account, { cursor, limit })
      .then((res) => { if (alive) { setOrders(res.orders); setNextCursor(res.nextCursor); } })
      .catch(() => { if (alive) { setOrders([]); setNextCursor(null); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [client, account, cursor, limit]);

  // Live overlay: patch the mutable fields of any displayed order that the
  // pod_orders stream has a newer state for (matched by id). Identity/static
  // fields stay from the stable REST page.
  const live = useResource(useMemo(() => client.orders(account, { limit: liveWindow }), [client, account, liveWindow]));
  const merged = useMemo(() => {
    if (!live?.length) return orders;
    const byId = new Map(live.map((o) => [o.id, o]));
    return orders.map((o) => {
      const l = byId.get(o.id);
      // price/initialSize too — a native `update` amends the resting order in
      // place (same id), so the displayed row must reflect the new price/size.
      return l ? { ...o, status: l.status, price: l.price, initialSize: l.initialSize, filledBase: l.filledBase, filledQuote: l.filledQuote, fee: l.fee, effectivePrice: l.effectivePrice, fills: l.fills } : o;
    });
  }, [orders, live]);

  return {
    orders: merged, page, loading,
    hasPrev: page > 0,
    hasNext: nextCursor != null,
    next: () => {
      if (nextCursor == null) return;
      setCursors((cs) => { const c = cs.slice(); c[page + 1] = nextCursor; return c; });
      setPage((p) => p + 1);
    },
    prev: () => setPage((p) => Math.max(0, p - 1)),
  };
}

export interface LeaderboardView {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  pageCount: number;
  hasPrev: boolean;
  hasNext: boolean;
  loading: boolean;
  error: Error | undefined;
  next: () => void;
  prev: () => void;
  refresh: () => void;
}

/**
 * Leaderboard with offset pagination over REST (`/clob/leaderboard`).
 * One-shot per page (not a stream); `refresh()` re-fetches the current page.
 */
export function useLeaderboard(opts?: { pageSize?: number }): LeaderboardView {
  const client = usePodClient();
  const pageSize = opts?.pageSize ?? 10;
  const [page, setPage] = useState(0);
  const [data, setData] = useState<LeaderboardPage>({ entries: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    client.leaderboard({ limit: pageSize, offset: page * pageSize })
      .then((p) => { if (alive) { setData(p); setError(undefined); } })
      .catch((e) => { if (alive) { setData({ entries: [], total: 0 }); setError(e as Error); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [client, page, pageSize, reload]);

  const pageCount = Math.max(1, Math.ceil(data.total / pageSize));
  return {
    entries: data.entries,
    total: data.total,
    page,
    pageCount,
    hasPrev: page > 0,
    hasNext: page + 1 < pageCount,
    loading,
    error,
    next: () => setPage((p) => (p + 1 < pageCount ? p + 1 : p)),
    prev: () => setPage((p) => Math.max(0, p - 1)),
    refresh: () => setReload((r) => r + 1),
  };
}

/** Live spot holdings + native cash (REST-seeded, refreshed on account ticks). */
export function useBalances(account: Address): Balances | undefined {
  const client = usePodClient();
  return useResource(useMemo(() => client.balances(account), [client, account]));
}

/** One-shot explorer fetch of a transaction by hash (re-fetches when hash changes). */
export function useTransaction(hash: string): { tx?: TxExplorer; loading: boolean; error?: Error } {
  const client = usePodClient();
  const [s, setS] = useState<{ tx?: TxExplorer; loading: boolean; error?: Error }>({ loading: true });
  useEffect(() => {
    if (!hash) { setS({ loading: false }); return; }
    let alive = true;
    setS({ loading: true });
    client.transaction(hash)
      .then((tx) => { if (alive) setS({ tx, loading: false }); })
      .catch((e) => { if (alive) setS({ error: e as Error, loading: false }); });
    return () => { alive = false; };
  }, [client, hash]);
  return s;
}

export function usePositions(account: Address): PositionsSnapshot | undefined {
  const client = usePodClient();
  return useResource(useMemo(() => client.positions(account), [client, account]));
}

/** Positions with mark-driven fields kept live between snapshots (recommended for UIs). */
export function useLivePositions(account: Address): PositionsSnapshot | undefined {
  const client = usePodClient();
  return useResource(useMemo(() => client.livePositions(account), [client, account]));
}

export function useTriggers(account: Address, query?: TriggersQuery): Trigger[] | undefined {
  const client = usePodClient();
  return useResource(useMemo(() => client.triggers(account, query), [client, account]));
}

export { createPodDatafeed } from "./datafeed.js";
