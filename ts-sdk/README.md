# @pod-network/trade-sdk

Read/stream market-data SDK for the pod trading indexer. It seeds initial values
from the cacheable REST API, then keeps everything live over **one multiplexed
WebSocket**, holds it in memory, and exposes it through a tiny, framework-agnostic
`Resource` abstraction. No polling.

> **Scope:** read/stream only. Order submission (nonce management, recovery) is a
> separate library — see `doc/ts-sdk-design.md`.

## Install

```bash
npm install @pod-network/trade-sdk
```

## Quick start

```ts
import { PodTradeClient } from "@pod-network/trade-sdk";

const client = new PodTradeClient({
  restUrl: "https://<indexer-rest-host>",  // /clob/* REST API (consumer config)
  wsUrl: "wss://<indexer-ws-host>",         // eth_subscribe WebSocket
});
client.connect();

const markets = client.markets;
const off = markets.subscribe(() => console.log(markets.get()));
await markets.ready();
```

## Framework bindings

The SDK ships no framework bindings — every resource is a `{ get(), subscribe(cb) }`
store, so it drops straight into React's `useSyncExternalStore`, Vue's
`shallowRef`, Svelte stores, etc.

```ts
// React, in one line — no provider, no library hook needed:
const ob = useSyncExternalStore(
  (cb) => client.orderbook(id, { depth: 20 }).subscribe(cb),
  () => client.orderbook(id, { depth: 20 }).get(),
);
```

## API surface

- **Layer 1 (low-level, exposed):** `client.rest.*` typed one-shot reads and
  `client.ws.subscribe(channel, params, onMessage)` raw subscriptions.
- **Layer 2 (resources):** `client.status`, `.markets`, `.market(id)`,
  `.orderbook(id,{depth})`, `.positions(account)`, `.triggers(account)`,
  `.backstopTransfers(account)`, `.candles(id, resolution, range)` (a
  `SeriesResource` with `setWindow`/`loadOlder`), `.orders(account, query)`.
- **Charting:** `createPodDatafeed(client)` returns an `IDatafeedChartApi`-shaped
  object for the TradingView Charting Library (framework-agnostic, no React).

All monetary values are `bigint` (1e18-scaled; use `formatAmount`/`toNumber`/
`parseAmount`); all timestamps are millisecond `number`s.

## How caching / low traffic works

- Each resource **seeds once** over REST, then lives off WS pushes — no polling.
- One WebSocket, ref-counted: N subscribers to the same market = one server
  subscription.
- Candle history is fetched as **epoch-anchored canonical pages** (per
  resolution), so settled pages are byte-identical across clients/time and the
  server flags them `immutable` — the browser/CDN serve them, the SDK never
  re-requests them. The forming bar is built in memory from the `pod_candles`
  tick stream, so the hot edge costs zero extra requests.

## Build

```bash
npm install && npm run build      # build the package to dist/
```

## Working on the SDK and a consumer together

The consumer's committed dependency is always the published version. To iterate
locally, link this package into it instead of editing that dependency:

```bash
cd ts-sdk && npm run build && npm link
cd ../../frontend && npm link @pod-network/trade-sdk
# undo
npm unlink @pod-network/trade-sdk && npm ci
```

`dist/` is what consumers import, so rebuild after each change. Nothing is
committed on either side, so a local path can never leak into a release.

## Releasing

Publishing is driven by a **`ts-sdk-v*`** tag, which is deliberately distinct
from the repo-wide `v*` tag that `release.yml` uses to zip every SDK into a
GitHub Release — so a TypeScript release doesn't drag `rust-sdk` along:

```bash
# 1. bump the version in package.json, commit it
# 2. tag it — the tag must match package.json or the job fails
git tag ts-sdk-v0.1.0 && git push origin ts-sdk-v0.1.0
```

`publish-ts-sdk.yml` then typechecks, builds and publishes to npm with
provenance. Two things worth knowing:

- A version containing a hyphen (`0.2.0-rc.0`) publishes under the **`rc`**
  dist-tag, leaving `latest` alone — so prereleases never become the default
  install. Use one to rehearse a release; npm versions can never be reused.
- `dist/` is gitignored and built during the release, and `prepublishOnly`
  rebuilds it on any manual `npm publish` too, so a stale or empty `dist/`
  can't ship.
