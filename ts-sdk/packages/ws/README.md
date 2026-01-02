# @podnetwork/ws

[![npm version](https://img.shields.io/npm/v/@podnetwork/ws.svg)](https://www.npmjs.com/package/@podnetwork/ws)
[![npm downloads](https://img.shields.io/npm/dm/@podnetwork/ws.svg)](https://www.npmjs.com/package/@podnetwork/ws)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)

Real-time WebSocket subscriptions for pod network.

Part of the [pod network SDK](https://github.com/pod-network/pod-sdk) ·
[Documentation](https://docs.v1.pod.network/) ·
[Discord](http://discord.gg/kB935J4hMd)

## Installation

```bash
pnpm add @podnetwork/ws
```

Peer dependencies:

```bash
pnpm add @podnetwork/core zod
```

## Requirements

- Node.js 24+
- TypeScript 5.7+

## Quick Start

```typescript
import { PodClient } from "@podnetwork/core";

const client = PodClient.chronosDev();

// Subscribe to orderbook updates
for await (const update of client.ws.subscribeOrderbook([orderbookId])) {
  console.log(`Best bid: ${update.bestBid()}`);
  console.log(`Best ask: ${update.bestAsk()}`);
}
```

## Features

- **Real-time orderbook snapshots** — Stream live orderbook updates with best
  bid/ask helpers
- **CLOB bid events** — Subscribe to new bids on limit orderbooks
- **Auction bid events** — Monitor batch auction bid submissions
- **Automatic reconnection** — Exponential backoff with configurable retry
  policies
- **Async iterators** — Consume events with standard `for await` loops
- **Type-safe** — Full TypeScript support with Zod runtime validation

## Usage

### Orderbook Updates

Subscribe to real-time orderbook snapshots. The SDK yields an
`OrderBookUpdateHelper` with convenient methods for common operations.

```typescript
import { PodClient } from "@podnetwork/core";

const client = PodClient.chronosDev();
const controller = new AbortController();

for await (const update of client.ws.subscribeOrderbook([orderbookId], {
  signal: controller.signal,
  depth: 20, // Get top 20 levels
})) {
  console.log(`Orderbook ${update.clobId} updated`);
  console.log(`Best bid: ${update.bestBid()}`);
  console.log(`Best ask: ${update.bestAsk()}`);
  console.log(`Spread: ${update.spread()}`);
  console.log(`Mid-price: ${update.midPrice()}`);

  // Access raw bid/ask levels
  console.log(`Bids: ${update.bids.length}, Asks: ${update.asks.length}`);
}
```

### CLOB Bid Events

Subscribe to new bid events on limit orderbooks. Yields a `BidEvent` whenever
bids are added.

```typescript
for await (const event of client.ws.subscribeBids([orderbookId])) {
  console.log(`New bids on ${event.clobId}:`);
  for (const bid of event.bids) {
    console.log(`  ${bid.side} ${bid.volume} @ ${bid.price}`);
    console.log(`  From: ${bid.bidder}`);
    console.log(`  TX: ${bid.txHash}`);
  }
}
```

### Auction Bid Events

Subscribe to batch auction bid submissions. The node broadcasts all auction bids
to all subscribers.

```typescript
for await (const event of client.ws.subscribeAuctionBids()) {
  console.log(`New auction bids at ${event.timestamp}:`);
  for (const bid of event.bids) {
    console.log(`  Auction ${bid.auctionId}: ${bid.value} from ${bid.bidder}`);
  }
}
```

### Standalone Usage

You can use the WebSocket client without `PodClient`.

```typescript
import { createWsNamespace } from "@podnetwork/ws";

const ws = createWsNamespace("wss://ws.chronos.dev.pod.network");

for await (const update of ws.subscribeOrderbook([orderbookId])) {
  console.log(update.bestBid());
}

await ws.disconnect();
```

### Reconnection Policy

The SDK automatically reconnects when the connection drops. Configure the
reconnection strategy with `reconnectPolicy`.

```typescript
// Exponential backoff (default)
for await (const update of client.ws.subscribeOrderbook([orderbookId], {
  reconnectPolicy: {
    type: "exponentialBackoff",
    initialDelay: 100, // Start with 100ms
    maxDelay: 30000, // Cap at 30 seconds
    multiplier: 2, // Double each time
    maxAttempts: 10, // Give up after 10 attempts
  },
})) {
  // Handle update
}

// Never reconnect (useful for one-shot subscriptions)
for await (const update of client.ws.subscribeOrderbook([orderbookId], {
  reconnectPolicy: { type: "never" },
})) {
  // Handle update
}
```

### Connection Events

Listen to connection state changes with `addEventListener`.

```typescript
client.ws.addEventListener((event) => {
  switch (event.type) {
    case "connected":
      console.log("Connected to WebSocket");
      break;
    case "disconnected":
      console.log("Disconnected:", event.reason);
      break;
    case "reconnecting":
      console.log("Reconnecting, attempt:", event.attempt);
      break;
    case "error":
      console.error("WebSocket error:", event.error);
      break;
  }
});
```

### Cancellation

Use `AbortController` to cancel subscriptions.

```typescript
const controller = new AbortController();

// Cancel after 60 seconds
setTimeout(() => controller.abort(), 60000);

for await (const update of client.ws.subscribeOrderbook([orderbookId], {
  signal: controller.signal,
})) {
  console.log(update.bestBid());

  // Or cancel conditionally
  if (update.spread() < 1000n) {
    controller.abort();
  }
}
```

## API Reference

For complete API documentation, see the
[API Reference](http://aaronbassett.github.io/pod-docs/typescript-sdk/).

### Core Classes

- **`WsNamespace`** — WebSocket subscription manager
- **`OrderBookUpdateHelper`** — Helper for orderbook snapshots
- **`AuctionBidEventHelper`** — Helper for auction bid events
- **`WebSocketConnection`** — Low-level WebSocket connection (internal)
- **`ReconnectionManager`** — Reconnection logic (internal)

### Main Methods

- **`subscribeOrderbook(orderbookIds, options?)`** — Subscribe to orderbook
  updates
- **`subscribeBids(orderbookIds, options?)`** — Subscribe to CLOB bid events
- **`subscribeAuctionBids(options?)`** — Subscribe to auction bid events

### Factory Functions

- **`createWsNamespace(wsUrl, maxSubscriptions?)`** — Create a standalone
  WebSocket client

## Coming from Ethereum?

pod network's WebSocket subscriptions differ from Ethereum in a few key ways:

| Concept        | Ethereum (ethers/viem)                            | pod SDK                                                          |
| -------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| Event source   | Contract logs via `eth_subscribe`                 | Tagged message protocol (not JSON-RPC)                           |
| Subscriptions  | `provider.on('block')`, `contract.on('Transfer')` | `client.ws.subscribeOrderbook()`                                 |
| Message format | JSON-RPC 2.0                                      | Custom tagged messages (`orderbook_snapshot`, `clob_bids_added`) |
| Reconnection   | Manual                                            | Automatic with exponential backoff                               |

Unlike Ethereum's JSON-RPC subscriptions, pod network uses a specialized tagged
message protocol optimized for high-frequency orderbook updates. The SDK handles
parsing and validation automatically.

## Related Packages

| Package                                 | Description                             |
| --------------------------------------- | --------------------------------------- |
| [`@podnetwork/core`](../core)           | PodClient and RPC methods               |
| [`@podnetwork/orderbook`](../orderbook) | CLOB limit orderbook trading            |
| [`@podnetwork/auction`](../auction)     | Batch auction participation             |
| [`@podnetwork/react`](../react)         | React hooks for WebSocket subscriptions |

## Contributing

We welcome contributions! Please see our
[Contributing Guide](../../CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE) © pod network
