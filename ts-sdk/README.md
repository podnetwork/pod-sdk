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
