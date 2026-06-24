# Pod Trade SDK (TypeScript) — Design Overview

A client-side data SDK for `pod-trading-app` that replaces the current
poll-everything data layer with a **read-once-then-stream**, **in-memory**,
**aggressively cacheable** module with first-class React bindings.

> Targets the **new indexer** in the worktree `../pod/.claude/worktrees/new-indexer-impl`
> (branch `new-indexer-on-trading-rewrite`). That rewrite is the authoritative
> API; it deprecates the old `ob_*` JSON-RPC reads in favor of a REST GET surface
> + `pod_*` WebSocket subscriptions, and it does the heavy caching work
> server-side via HTTP cache headers. The SDK's job is to *cooperate* with that.

Working package name: `@pod-network/trade-sdk`.

> **Scope: read/stream only.** This library covers market-data reads and live
> subscriptions. The write side (order submission, nonce management, recovery) is
> a **separate library** built later — pod nonces are strictly sequential per
> account with a one-in-flight lock, and injected wallets (MetaMask/Rabby) only
> expose `eth_sendTransaction` (no sign-only / no `pod_sendRawTransaction`
> interposition), so writes need their own advisory-mode design and are out of
> scope here.

---

## 1. The problem (frontend today)

`../pod-trading-app` reads everything over HTTP-only JSON-RPC (`ob_*` via a viem
client) and keeps it fresh by **polling**: ~8 react-query hooks on 5s intervals
(orders, limit orders, history, triggers, backstop, orderbook fallback, balance,
latest candle bar), plus raw `setInterval` loops (markets 30s, full portfolio
**5s from the root layout**, chart datafeed 5s). Markets is fetched by three
loops. A hand-rolled WebSocket covers only `pod_orderbook` + `pod_orders` and is
manually bridged into react-query via `setQueryData`/`invalidateQueries`. Every
value is converted from hex/microseconds ad-hoc across many hooks.

Net: high request volume, redundant work, latency on pushable data, ~0% candle
cache reuse (every request is a different shifting window).

## 2. What the new indexer gives us

Two read surfaces + one live surface, all served by the node.

### 2a. REST GET API (`/clob/*`) — polling/seed reads, CDN-friendly

`from`/`to`/`until` query params are **unix seconds**; response timestamps are
**microseconds** in `*_us` fields; numerics are **1e18-scaled decimal strings**
(no longer hex). Every response includes `solution_now` (µs) — the settled
watermark.

| Route | Params | Returns | Cache-Control |
|---|---|---|---|
| `GET /clob/status` | — | `{solution_now}` | `no-store` |
| `GET /clob/candles/{ob}` | `resolution`(req), `from`, `to`, `limit≤500` | `Candle[]` newest-first, **forming bar withheld** | **`immutable`** if right-edge bucket settled, else `no-store` |
| `GET /clob/markets` | — | `MarketStatic[]` | `max-age=900` |
| `GET /clob/markets/stats` | `to` | `{solution_now, markets[]}` (24h stats, mark/oracle/funding/OI) | **`immutable`** if `to`≤now settled, else `max-age=60` |
| `GET /clob/orders/{acct}` | `until`, `limit≤500`, `cursor` | `{orders[], next_cursor, total_count, solution_now}` | **`immutable`** if window settled **and** all orders terminal, else `no-store` |
| `GET /clob/backstop-transfers/{acct}` | — | `{backstop_transfers[], total_count, solution_now}` single page | `no-store` |
| `GET /clob/orderbook/{ob}` | — | `OrderbookSnapshot` | `no-store` |
| `GET /clob/positions/{acct}` | — | `GetPositionsResponse` | `no-store` |
| `GET /clob/triggers/{acct}` | `orderbook`, `limit` | `GetTriggersResponse` | `no-store` |

Header constants: `immutable` = `public, max-age=31536000, immutable`;
`max-age=900` (static markets); `max-age=60` (live stats); `no-store`. **Cache
eligibility is gated on solution time, never wall-clock** — a response goes
`immutable` only when its right edge is provably settled.

### 2b. WebSocket — one socket, `eth_subscribe` with `pod_*` types

`eth_subscribe(sub_type, params)` / `eth_unsubscribe`; notifications arrive as
`eth_subscription`. `params`: `depth?`, `orderbook_ids` (alias `clob_ids`, empty
= all), `bidder` (alias `account`). Every push is fanned out from one batched
`SolutionExecuted` per tick.

| `sub_type` | params | push payload |
|---|---|---|
| `pod_orderbook` | `orderbook_ids`, `depth` | `OrderbookSnapshot` per book/tick |
| `pod_orders` | `orderbook_ids`, `bidder?` | `OrderUpdate[]` — `new`/`fill`/`expired`/`canceled`/**`modified`**/`invalid` |
| `pod_candles` | `orderbook_ids` | per-tick hint `{orderbook, timestamp_us, price, volume}` — client folds into the forming bar |
| `pod_markets` | `orderbook_ids` | market-dynamics per book/tick (clearing/24h/mark/oracle/funding/OI) |
| `pod_positions` | `bidder`(req) | `{account, data: GetPositionsResponse}`, only when the tick touched the account |
| `pod_triggers` | `bidder`(req) | `{account, triggers, total_count, next_cursor}`, only when touched |

So **every entity the app polls today now has a push channel.**

### 2c. Server-side machinery worth knowing

- In-memory **candle ring** per `(orderbook, resolution)` (cap 1440 for 1m, 1000
  others) → recent ranges served without hitting DuckDB.
- **24h stats** derived incrementally from the 1m ring; served by
  `/clob/markets/stats` and `pod_markets`.
- **Warm first-page account-feed cache** (orders), patched in place from the
  broadcast; later pages via SQL with a deterministic `OrderCursor`
  (`"{ts_us}:{nonce}:{order_id_hex}"`). Orders/backstop split into two routes.
- `admin_reset_caches` exists server-side; not a client concern.

## 3. Design goals → how each is met

| Goal | Mechanism |
|---|---|
| Stop polling | One multiplexed WS; every entity has a `pod_*` channel (§4). |
| Maximize cacheability | Seed reads hit the server's `immutable`/`max-age` headers; SDK aligns requests so they qualify (§5). |
| Read-once-then-stream | `seed (REST) → subscribe (pod_*) → patch in memory` per entity (§4). |
| Keep values in memory | Normalized observable stores; one source of truth (§4). |
| Easy React | `useSyncExternalStore`-backed hooks; reading never refetches (§6). |
| Maximize cache *hit rate* | Canonical, settled-boundary-aligned requests → identical across clients/time **and** server-flagged `immutable` (§5). |

## 4. Architecture (layers)

```
┌───────────────────────────────────────────────────────────────┐
│ React bindings  useMarkets / useOrderbook / useCandles / ...    │  ← useSyncExternalStore
├───────────────────────────────────────────────────────────────┤
│ Stores (in-memory, observable)  one source of truth             │
│   MarketStore  OrderbookStore  CandleStore  OrderStore  ...     │
├───────────────────────────────────────────────────────────────┤
│ Sync engine   per-entity: seed(REST) → live(pod_*) → patch      │
│   + live-candle folder (from pod_candles hints, all resolutions)│
├───────────────────────────────────────────────────────────────┤
│ Cache         candle-page planner (canonical boundaries) +      │
│   in-flight dedupe + solution_now watermark + optional IndexedDB│
├───────────────────────────────────────────────────────────────┤
│ Codec         decimal-1e18 ↔ bigint, µs ↔ ms, secs for params   │
├───────────────────────────────────────────────────────────────┤
│ Transport     RestClient (fetch + HTTP cache) + WsClient        │
│   (1 socket, ref-counted subs, backoff, auto-resubscribe)       │
└───────────────────────────────────────────────────────────────┘
```

**Transport.**
- `RestClient`: plain `fetch` so the **browser HTTP cache and any CDN honor the
  server's `Cache-Control`** — that's where most caching lives now. Adds
  in-flight dedupe (concurrent identical reads collapse to one request). No
  manual TTLs needed; the SDK's leverage is *which URL it asks for* (§5).
- `WsClient`: **one** WebSocket for the app. Ref-counted subscriptions (N
  components on the same market depth → one server subscription). Exponential
  backoff + jitter, idle-timeout reconnect, and **automatic resubscribe** of the
  live set on reconnect, each followed by a fresh REST re-seed so no ticks leak.

**Codec.** Decimal-1e18 → `bigint` (+ display helpers) and µs → ms happen once,
here; query params serialized to seconds. The app's scattered conversions go
away.

**Stores.** Each entity is a normalized in-memory store exposing
`getSnapshot()` + `subscribe(listener)` — exactly `useSyncExternalStore`'s
contract. Both REST seeds and WS pushes write here; this is the single source of
truth.

**Sync engine — read-once-then-stream.** Per entity: `seed` one REST read →
attach the `pod_*` channel → `patch` pushes into the store in place (no refetch).
Mapping:
- **Markets** — seed `/clob/markets` (cache 900s) once; seed `/clob/markets/stats`;
  live via `pod_markets`. Static identity cached effectively forever.
- **Orderbook** — seed `/clob/orderbook/{ob}`; replace from `pod_orderbook`.
- **Orders / history** — seed `/clob/orders/{acct}` (first page); apply
  `pod_orders` with `bidder=<acct>`, handling all variants incl. `modified`.
  Historical pages paged by `until`/`cursor` (§5) are `immutable`.
- **Positions / triggers** — seed `/clob/positions|triggers/{acct}`; live via
  `pod_positions` / `pod_triggers` (account-scoped, pushed only when touched).
- **Candles** — §5.

This deletes every `setInterval`/`refetchInterval` and the manual
`setQueryData`/`invalidateQueries` bridge.

## 5. Caching — canonical boundaries meet the server's `immutable` flag

The new server already classifies a response as `immutable` (cache a year) vs
`no-store` **based on whether its right edge is settled**. The SDK's job is to
phrase requests so the historical ones *qualify* and are *identical across all
clients and over time* — that's where cache hit rate actually comes from.

**(a) Candles.** `/clob/candles` withholds the forming bar and flags the response
`immutable` exactly when the requested window's right-edge bucket is already
closed. So if we align `to` to a **settled UTC calendar boundary**, the response
is both immutable *and* byte-identical for every user forever. Pick, per
resolution, the largest calendar unit whose bar count ≤ 500 (the hard cap):

| Resolution | Canonical page | Count |
|---|---|---|
| `1m`  | 6h boundary (00/06/12/18 UTC) | 360 |
| `5m`  | 1 day | 288 |
| `15m` | 1 day | 96 |
| `1h`  | 1 week (ISO, Mon 00:00 UTC) | 168 |
| `4h`  | 1 month | ≤186 |
| `1d`  | 1 year | 365–366 |

General rule (handles 30m/1W/1M too): a **page = a fixed block of K buckets,
anchored at the Unix epoch** (`pageIndex = floor(bucketIndex / K)`), with K the
largest count ≤ 500 for that resolution. Because pages are epoch-anchored and
K-bucket-sized, every client computes identical boundaries and every page edge
lands on a real bucket edge — so a fully-past page has a settled right edge and
the server flags it `immutable`. K is chosen to approximate a calendar unit where
one divides evenly (readability), but correctness only needs epoch-anchoring:

| Resolution | K (page size) |
|---|---|
| `1m`  | 360 (6h) |
| `5m`  | 288 (1 day) |
| `15m` | 96 (1 day) |
| `30m` | 336 (1 week) |
| `1h`  | 168 (1 week) |
| `4h`  | 180 (~30 days) |
| `1d`  | 365 (1 year) |
| `1W`  | 260 (~5 years) |
| `1M`  | 120 (decade, calendar-anchored — months are variable-width) |

Reading `[from,to]`: expand to enclosing page boundaries, enumerate pages;
**closed pages** (end ≤ `solution_now`) are fetched with `to=pageEnd` → server
returns `immutable` → browser/CDN/SDK-dedupe all hit. Only the **trailing page**
(touching now) is `no-store`, and we never fetch it on a loop — see (d).

**(b) Market stats.** Same trick: `/clob/markets/stats?to=<settled boundary>`
returns `immutable`; the live view seeds without `to` (60s) then streams via
`pod_markets`.

**(c) Order history.** `/clob/orders?until=<settled boundary>&cursor=…` returns
`immutable` once the window is settled and all orders terminal. So deep history
pages cache permanently; only the live first page is `no-store` and maintained by
`pod_orders`. Same boundary-alignment principle as candles, applied to `until`.

**(d) The live/forming candle — no polling.** `pod_candles` pushes a per-tick
`{timestamp_us, price, volume}`. The SDK folds each tick into the forming bar for
**every** displayed resolution from that one subscription (bucket by
`resolution_secs`, roll at boundaries, append the just-closed bar into the cache).
This replaces the datafeed's 5s `setInterval` outright — and because the server
already withholds the forming bar from REST, the streamed bar is the *only*
source of "now," with no double-counting.

**Net caching model:** the server provides the cache *semantics* (headers gated
on solution time); the SDK provides cache *hit rate* (canonical, settled-aligned,
client-invariant request URLs) + dedupe + optional IndexedDB persistence + the
live fold that removes the need to ever poll the hot edge.

## 6. React integration

A thin `@pod-network/trade-sdk/react` entry:
- `<PodTradeProvider client={client}>` puts the SDK on context.
- Hooks back onto stores via `useSyncExternalStore`: `useMarkets()`,
  `useMarket(id)`, `useOrderbook(id, depth)`, `useCandles(id, resolution,
  range)`, `useOrders(acct, query)`, `usePositions(acct)`, `useTriggers(...)`.
  Reading **never triggers a refetch** — returns the in-memory snapshot,
  re-renders only on the changed slice; mounting ref-counts the underlying WS
  subscription. Tearing-safe, Suspense-friendly.
- Optional **react-query adapter** so existing call sites migrate incrementally:
  the SDK store backs the query; WS pushes update it — a drop-in before fully
  switching to native hooks.
- **TradingView datafeed** adapter: `getBars` → the canonical-page range read
  (cached/immutable pages); `subscribeBars` → store subscription fed by the
  `pod_candles` fold. Replaces `custom-datafeed.ts` + `fetch-candles-chunked` +
  its 5s loop.

## 7. Module layout

```
packages/trade-sdk/
  src/
    transport/   rest-client.ts  ws-client.ts  reconnect.ts
    codec/       units.ts (dec1e18↔bigint, µs↔ms, secs)  enums.ts
    cache/       candle-pages.ts  dedupe.ts  persistent-cache.ts(opt)  watermark.ts
    stores/      market.ts  orderbook.ts  candle.ts  order.ts  position.ts  trigger.ts
    sync/        engine.ts  live-candle.ts  subscriptions.ts
    methods/     status.ts markets.ts candles.ts orders.ts positions.ts triggers.ts ...
    types/       (mirror node/src/rpc/types.rs + rest.rs projections)
    client.ts    PodTradeClient
    index.ts
  react/         provider.tsx  hooks/*  tradingview-datafeed.ts
```

ESM + types; `react` and the TradingView adapter are separate optional entry
points so non-React consumers stay light.

## Implementation status

Implemented in `ts-sdk/` (read/stream only):

- **Transport** — `src/transport/rest.ts` (typed `/clob/*` one-shots, in-flight
  dedupe), `src/transport/ws.ts` (one multiplexed `eth_subscribe` socket,
  ref-counted subs, backoff + idle reconnect + auto-resubscribe).
- **Codec** — `src/codec/units.ts` (decimal-1e18 ↔ bigint, µs ↔ ms),
  `decode.ts` (wire → public), `resolution.ts` (canonical page table).
- **Resources** — `src/stores/resource.ts` (ref-counted observable),
  `src/sync/{sources,candles,orders}.ts` (per-entity seed→subscribe→patch; the
  candle canonical-page planner + `pod_candles` live fold; order-history seed +
  `pod_orders` updates + cursor paging).
- **Client** — `src/client.ts` (memoized factories), `src/index.ts`.
- **React** — `src/react/index.tsx` (`useResource` + typed sugar),
  `datafeed.ts` (TradingView adapter).
- **Example** — `examples/minimal/` (one-page demo; selector, chart, book,
  stats, order history).

The candle REST response is the `{candles, resolution, range, solution_now_us}`
envelope, so the forming-bar gap is closed by `since`-replay: the series loads
the window first, captures `solution_now_us`, then subscribes `pod_candles` with
`since` (advanced as ticks arrive, so reconnects resume gaplessly).

Verified: `tsc` typechecks + builds the package, and the example typechecks and
Vite-bundles against the built package. Not yet verified against a live indexer —
wire field names/shapes are taken from the `new-indexer-on-trading-rewrite`
source and may need small adjustments when run end-to-end.

## 8. Rollout

1. Transport (`RestClient` + `WsClient`) + codec + types mirrored from
   `types.rs`/`rest.rs`.
2. Stores + sync engine; wire all six `pod_*` channels.
3. Candle-page planner (canonical boundaries) + `pod_candles` live fold +
   TradingView adapter.
4. React hooks + react-query adapter for incremental migration.
5. Migrate the app entity-by-entity, deleting `setInterval`/`refetchInterval`
   and the manual WS→cache bridge as each store goes live.

## 9. Locked decisions

- **Base URLs** (`restUrl`, `wsUrl`) are **consumer configuration** — the SDK
  never hardcodes them and assumes a cache/CDN may sit in front.
- **Numeric surface:** `bigint` + display helpers. No `BigNumber.js`.
- **Resolutions:** 1m/5m/15m/30m/1h/4h/1d/1W/1M, all assumed served natively by
  the API (no client-side synthesis).
- **No IndexedDB.** Caching relies solely on the browser/CDN HTTP cache; the SDK
  maximizes hit rate via request shaping, not its own persistent store.
