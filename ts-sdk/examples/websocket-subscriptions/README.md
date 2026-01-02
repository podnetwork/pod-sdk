# WebSocket Subscriptions Example

Demonstrates real-time WebSocket subscriptions on the pod network.

## What This Example Shows

1. Connecting to the WebSocket endpoint
2. Subscribing to orderbook updates
3. Subscribing to bid events (new, cancelled, filled)
4. Using AsyncIterable with for-await-of
5. Cancelling subscriptions with AbortController

## Prerequisites

- Node.js 18+
- pnpm
- Access to Chronos devnet WebSocket endpoint

## Setup

```bash
# From the ts-sdk root
pnpm install
pnpm build

# Navigate to this example
cd examples/websocket-subscriptions
```

## Running

```bash
# With default orderbook
pnpm start

# With custom orderbook
ORDERBOOK_ID=0x... pnpm start
```

## Configuration

Environment variables:

- `ORDERBOOK_ID` (optional): Orderbook to subscribe to

Edit `src/index.ts` to customize:

- `SUBSCRIPTION_TIMEOUT_MS`: How long to run (default 30s)

## Subscription Types

### Orderbook Updates

```typescript
for await (const update of ws.subscribeOrderbook([orderbookId], depth)) {
  console.log(`Best bid: ${update.bids[0]?.price}`);
  console.log(`Best ask: ${update.asks[0]?.price}`);
}
```

### Bid Events

```typescript
for await (const event of ws.subscribeBids([orderbookId])) {
  if (isNewBidEvent(event)) {
    console.log(`New bid: ${event.info.price}`);
  } else if (isFilledBidEvent(event)) {
    console.log(`Filled: ${event.filledAmount}`);
  } else if (isCancelledBidEvent(event)) {
    console.log(`Cancelled: ${event.reason}`);
  }
}
```

### Auction Bid Events

```typescript
for await (const event of ws.subscribeAuctionBids([auctionId])) {
  console.log(`Auction bid: ${event.amount}`);
}
```

## Cancellation Pattern

```typescript
const controller = new AbortController();

// Start subscription with signal
const task = async () => {
  for await (const update of ws.subscribeOrderbook([orderbookId], 10, {
    signal: controller.signal,
  })) {
    console.log(update);
  }
};

// Cancel after 10 seconds
setTimeout(() => controller.abort(), 10_000);
```

## Connection Management

The WebSocket client handles:

- Automatic reconnection with exponential backoff
- Connection state tracking
- Subscription limit enforcement (default 10)
- Graceful cleanup on close

## Related Examples

- [OrderBook Trading](../orderbook-trading/) - Place and cancel bids
- [Auction Bidding](../auction-bidding/) - Auction participation
