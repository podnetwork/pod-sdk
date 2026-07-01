# @pod-network/trade-sdk

Read/stream market-data SDK for the pod trading indexer. It seeds initial values
from the cacheable REST API, then keeps everything live over **one multiplexed
WebSocket**, holds it in memory, and exposes it through a tiny `Resource`
abstraction with first-class React bindings. No polling.

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

## React

```tsx
import { PodTradeProvider, useMarkets, useCandles, useOrderbook } from "@pod-network/trade-sdk/react";

<PodTradeProvider client={client}>
  <App />
</PodTradeProvider>

function Ticker({ id }) {
  const ob = useOrderbook(id, { depth: 20 }); // never refetches on render; updates on WS push
  return <div>{ob?.clearingPrice?.toString()}</div>;
}
```

## API surface

- **Layer 1 (low-level, exposed):** `client.rest.*` typed one-shot reads and
  `client.ws.subscribe(channel, params, onMessage)` raw subscriptions.
- **Layer 2 (resources):** `client.status`, `.markets`, `.market(id)`,
  `.orderbook(id,{depth})`, `.positions(account)`, `.triggers(account)`,
  `.backstopTransfers(account)`, `.candles(id, resolution, range)` (a
  `SeriesResource` with `setWindow`/`loadOlder`), `.orders(account, query)`.
- **React:** `useResource(resource)` (the one real hook) + typed sugar
  (`useMarkets`, `useMarket`, `useOrderbook`, `useCandles`, `useOrders`,
  `usePositions`, `useTriggers`, `useStatus`) + `createPodDatafeed(client)` for
  the TradingView Charting Library.

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

## Build & example

```bash
npm install && npm run build      # build the package to dist/
cd examples/minimal && npm install && npm run dev   # run the demo app
```

The example (`examples/minimal`) is a single-page app — market selector,
TradingView (lightweight-charts) chart, order book, market stats, order history
— wired entirely through the hooks. Configure it with `VITE_POD_REST_URL` /
`VITE_POD_WS_URL`.
