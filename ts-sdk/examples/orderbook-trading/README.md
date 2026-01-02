# OrderBook Trading Example

Demonstrates CLOB (Central Limit Order Book) trading on the pod network.

## What This Example Shows

1. Connecting to Chronos devnet
2. Creating an orderbook client
3. Querying orderbook state (bids, asks, spread, depth)
4. Building a bid with the builder pattern
5. Placing a bid
6. (Optionally) Cancelling a bid

## Prerequisites

- Node.js 18+
- pnpm
- A wallet with POD tokens
- An orderbook ID to trade on

## Setup

```bash
# From the ts-sdk root
pnpm install
pnpm build

# Navigate to this example
cd examples/orderbook-trading
```

## Running

```bash
# With required environment variables
PRIVATE_KEY=0x... ORDERBOOK_ID=0x... pnpm start
```

## Configuration

Environment variables:

- `PRIVATE_KEY` (required): Your wallet's private key
- `ORDERBOOK_ID` (optional): Target orderbook address

Or edit `src/index.ts` to customize:

- `BID_PRICE`: Price per unit in POD
- `BID_VOLUME`: Volume to bid

## Understanding the OrderBook

The pod network orderbook uses a CLOB model:

- **Bids**: Buy orders (sorted by price descending)
- **Asks**: Sell orders (sorted by price ascending)
- **Spread**: Difference between best bid and best ask
- **Mid Price**: (best bid + best ask) / 2
- **Depth**: Number of orders on each side

## Bid Builder

```typescript
const bid = OrderBookBid.builder()
  .side("buy") // 'buy' or 'sell'
  .price(parsePod("99.5")) // Price in POD
  .volume(parsePod("1.0")) // Volume in units
  .orderbookId(orderbookId) // Target orderbook
  .ttl(3_600_000_000n) // Time-to-live in microseconds
  .build();
```

## Related Examples

- [Basic Transfer](../basic-transfer/) - Simple token transfers
- [WebSocket Subscriptions](../websocket-subscriptions/) - Real-time orderbook
  updates
