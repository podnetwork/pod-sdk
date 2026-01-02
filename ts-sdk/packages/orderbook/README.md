# @podnetwork/orderbook

[![npm version](https://img.shields.io/npm/v/@podnetwork/orderbook.svg)](https://www.npmjs.com/package/@podnetwork/orderbook)
[![npm downloads](https://img.shields.io/npm/dm/@podnetwork/orderbook.svg)](https://www.npmjs.com/package/@podnetwork/orderbook)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

Central limit order book (CLOB) trading for pod network.

Part of the [pod network SDK](https://github.com/podnetwork/pod-sdk) ·
[Documentation](https://docs.v1.pod.network/) ·
[Discord](http://discord.gg/kB935J4hMd)

## Installation

```bash
pnpm add @podnetwork/orderbook
```

This package requires `@podnetwork/core` and `@podnetwork/wallet` as peer
dependencies:

```bash
pnpm add @podnetwork/core @podnetwork/wallet
```

## Requirements

- **Node.js**: >= 24
- **TypeScript**: >= 5.7 (for type support)

## Quick Start

```typescript
import { PodClient } from "@podnetwork/core";
import { PodWallet } from "@podnetwork/wallet";
import { OrderBookBid } from "@podnetwork/orderbook";
import { parsePod } from "@podnetwork/core";

const client = PodClient.chronosDev();
const wallet = PodWallet.fromPrivateKey(privateKey);

// Submit a buy order
const bid = OrderBookBid.builder()
  .side("buy")
  .price(parsePod("1.5"))
  .volume(parsePod("10"))
  .orderbookId(orderbookId)
  .build();

const pending = await client.orderbook.submitBid(bid, wallet);
console.log(`Bid placed: ${pending.txHash}`);
```

## Features

- **Bid Submission** — Submit buy and sell orders to the CLOB via precompile
  contract
- **Builder Pattern** — Fluent API for creating bids with validation
- **Orderbook Queries** — Helper methods for analyzing orderbook state (best
  bid/ask, spread, depth)
- **Real-time Updates** — WebSocket subscriptions for live orderbook data (via
  `@podnetwork/ws`)
- **Type Safety** — Full TypeScript support with Zod validation

## Usage

### Creating and Submitting Bids

Use the `OrderBookBid.builder()` pattern to create orders:

```typescript
import { OrderBookBid } from "@podnetwork/orderbook";
import { parsePod } from "@podnetwork/core";

// Create a buy order with 1-hour TTL (default)
const buyOrder = OrderBookBid.builder()
  .side("buy")
  .price(parsePod("100"))
  .volume(parsePod("5"))
  .orderbookId("0x1234...")
  .build();

// Create a sell order with custom TTL
const sellOrder = OrderBookBid.builder()
  .side("sell")
  .price(parsePod("105"))
  .volume(parsePod("3"))
  .orderbookId("0x1234...")
  .ttlSeconds(7200) // 2 hours
  .build();

// Submit to the network
const pending = await client.orderbook.submitBid(buyOrder, wallet);
```

### Working with Orderbook State

The `OrderBook` class provides helper methods for analyzing orderbook data
received via WebSocket subscriptions:

```typescript
import { OrderBook } from "@podnetwork/orderbook";
import { formatPod } from "@podnetwork/core";

// Subscribe to orderbook updates (requires @podnetwork/ws)
const subscription = await client.ws.subscribeOrderbook(orderbookId, (data) => {
  const book = OrderBook.from(data);

  // Get best prices
  const bestBid = book.bestBid();
  const bestAsk = book.bestAsk();

  if (bestBid && bestAsk) {
    console.log(`Bid: ${formatPod(bestBid)} | Ask: ${formatPod(bestAsk)}`);
    console.log(`Spread: ${formatPod(book.spread()!)}`);
    console.log(`Mid: ${formatPod(book.midPrice()!)}`);
  }

  // Check depth
  const { bids, asks } = book.depth();
  console.log(`${bids} bid levels, ${asks} ask levels`);

  // Get total volume
  console.log(`Total bid volume: ${formatPod(book.totalBidVolume())}`);
  console.log(`Total ask volume: ${formatPod(book.totalAskVolume())}`);
});
```

### Bid Expiry and Time-to-Live

Bids have built-in expiry tracking:

```typescript
const bid = OrderBookBid.builder()
  .side("buy")
  .price(parsePod("100"))
  .volume(parsePod("10"))
  .orderbookId(orderbookId)
  .ttlSeconds(3600) // 1 hour
  .build();

// Check expiry status
console.log(`Expires at: ${bid.expiryTs()}`);
console.log(`Is expired: ${bid.isExpired()}`);
console.log(`Time remaining: ${bid.timeRemaining()} microseconds`);
```

### Querying Specific Price Levels

```typescript
const book = OrderBook.from(orderbookData);

// Get volume at a specific price
const price = parsePod("100");
const volumeAtPrice = book.volumeAtPrice(price, "buy");
console.log(`Volume at ${formatPod(price)}: ${formatPod(volumeAtPrice)}`);

// Check if orderbook is empty
if (book.isEmpty()) {
  console.log("No orders in book");
}
```

## API Reference

For complete API documentation, see the
[API Reference](http://aaronbassett.github.io/pod-docs/typescript-sdk/).

### Core Exports

- **`OrderBookBid`** — Bid order builder and data class
- **`OrderBook`** — Orderbook state helper with query methods
- **`OrderbookNamespace`** — CLOB operations (accessed via `client.orderbook`)
- **`Side`** — TypeScript type for order side (`'buy'` | `'sell'`)

### Builder Methods

- `.side(side)` — Set order side ('buy' or 'sell')
- `.price(price)` — Set price in wei
- `.volume(volume)` — Set volume in wei
- `.orderbookId(id)` — Set target orderbook hash
- `.ttl(ttl)` — Set TTL in microseconds
- `.ttlSeconds(seconds)` — Set TTL in seconds (convenience method)
- `.build()` — Create the bid (validates required fields)

### OrderBook Methods

- `.bestBid()` — Highest bid price
- `.bestAsk()` — Lowest ask price
- `.spread()` — Bid-ask spread
- `.midPrice()` — Mid-market price
- `.depth()` — Number of price levels on each side
- `.totalBidVolume()` — Total volume on bid side
- `.totalAskVolume()` — Total volume on ask side
- `.volumeAtPrice(price, side)` — Volume at a specific price level
- `.isEmpty()` — Check if orderbook has no orders

## Coming from Ethereum?

pod network's orderbook is fundamentally different from Ethereum's DEX model:

| Aspect             | Ethereum DEXs                   | pod network CLOB                       |
| ------------------ | ------------------------------- | -------------------------------------- |
| **Order matching** | AMM pools or on-chain matching  | Off-chain batch auction settlement     |
| **Liquidity**      | Liquidity pools (UniswapV2/V3)  | Central limit order book               |
| **MEV exposure**   | High (frontrunning via mempool) | Resistant (batch auctions, no mempool) |
| **Settlement**     | Immediate swap execution        | Batch auction every ~200ms             |
| **Order types**    | Swaps (market orders)           | Limit orders with TTL                  |
| **State queries**  | On-chain via contract calls     | WebSocket subscriptions only           |

**Key differences:**

1. **No RPC orderbook queries** — Orderbook state is only available via
   WebSocket subscriptions (use `@podnetwork/ws`)
2. **Batch settlement** — Orders are matched in periodic batch auctions, not
   immediately
3. **TTL-based expiry** — Orders automatically expire after their time-to-live
   period
4. **CLOB precompile** — Orders are submitted to a precompile contract at
   `0x000000000000000000000000000000000000C10B`

## Related Packages

| Package                             | Description                                                |
| ----------------------------------- | ---------------------------------------------------------- |
| [`@podnetwork/core`](../core)       | Core SDK (PodClient, RPC, transactions)                    |
| [`@podnetwork/wallet`](../wallet)   | Local wallet implementation                                |
| [`@podnetwork/ws`](../ws)           | WebSocket subscriptions (required for live orderbook data) |
| [`@podnetwork/auction`](../auction) | Batch auction participation                                |

## Contributing

We welcome contributions! Please see our
[Contributing Guide](../../CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE) © pod network
