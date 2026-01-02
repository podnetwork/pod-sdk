# @podnetwork/auction

[![npm version](https://img.shields.io/npm/v/@podnetwork/auction.svg)](https://www.npmjs.com/package/@podnetwork/auction)
[![npm downloads](https://img.shields.io/npm/dm/@podnetwork/auction.svg)](https://www.npmjs.com/package/@podnetwork/auction)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

Submit and manage bids in pod network's batch auction system with optimistic
execution.

Part of the [pod network SDK](https://github.com/podnetwork/pod-sdk) ·
[Documentation](https://docs.v1.pod.network/) ·
[Discord](http://discord.gg/kB935J4hMd)

## Installation

```bash
pnpm add @podnetwork/auction
```

**Peer dependencies:**

```bash
pnpm add @podnetwork/core @podnetwork/ws
```

## Requirements

- Node.js 24+ / ES2022+ browser
- TypeScript 5.7+

## Quick Start

```typescript
import { PodClient } from "@podnetwork/core";
import { AuctionBid, parsePod } from "@podnetwork/auction";

const client = PodClient.chronosDev();

// Create a bid (1.5 WETH with 30-minute deadline)
const bid = AuctionBid.builder()
  .amount(parsePod("1.5"))
  .deadlineMinutes(30)
  .build();

// Submit the bid
const pending = await client.auction.submitBid(auctionId, bid, wallet);
console.log(`Bid submitted: ${pending.txHash}`);

// Wait for deadline to pass
await client.auction.waitForDeadline(bid.deadline);
console.log("Auction deadline reached");
```

## Features

- **Optimistic bid submission** — Submit bids with custom deadlines and optional
  calldata
- **Builder pattern** — Fluent API for creating bids with validation
- **Deadline tracking** — Wait for auction deadlines using local time or PPT
  (Past Perfection Time)
- **Type-safe** — Full TypeScript support with Zod schema validation
- **Real-time updates** — Subscribe to auction state via WebSocket (see
  [@podnetwork/ws](../ws))

## Usage

### Creating Bids

Use the builder pattern for convenient, validated bid construction.

```typescript
import { AuctionBid, parsePod } from "@podnetwork/auction";

// Minimum required: amount
const bid = AuctionBid.builder().amount(parsePod("1.5")).build();

// Explicit deadline (Date, milliseconds, or microseconds)
const bid = AuctionBid.builder()
  .amount(1500000000000000000n)
  .deadline(new Date("2026-01-15T12:00:00Z"))
  .build();

// Relative deadline helpers
const bid = AuctionBid.builder()
  .amount(parsePod("2.0"))
  .deadlineMinutes(30) // 30 minutes from now
  .build();

const bid = AuctionBid.builder()
  .amount(parsePod("0.5"))
  .deadlineSeconds(300) // 5 minutes from now
  .build();

// Optional calldata
const bid = AuctionBid.builder()
  .amount(parsePod("1.0"))
  .deadlineMinutes(15)
  .data("0x1234abcd")
  .build();
```

**Default values:**

- `deadline`: 10 minutes from now
- `data`: `'0x'`

### Submitting Bids

Submit bids through the `client.auction` namespace.

```typescript
import { PodClient } from "@podnetwork/core";
import { LocalWallet } from "@podnetwork/wallet";

const client = PodClient.chronosDev();
const wallet = LocalWallet.createRandom();

const auctionId = 123n;
const bid = AuctionBid.builder()
  .amount(parsePod("1.5"))
  .deadlineMinutes(30)
  .build();

const pending = await client.auction.submitBid(auctionId, bid, wallet);
console.log(`Bid submitted: ${pending.txHash}`);
```

**Note:** The bid `amount` is encoded as a contract parameter, not sent as
`msg.value`. The transaction's value is always `0`.

### Waiting for Deadlines

Wait for auction deadlines using local time or network-synchronized PPT.

```typescript
// Local time (faster, default)
await client.auction.waitForDeadline(bid.deadline);

// PPT mode (stronger timing guarantees)
await client.auction.waitForDeadline(bid.deadline, { usePPT: true });

// Custom timeout (local mode only)
await client.auction.waitForDeadline(bid.deadline, {
  pollIntervalMs: 500, // Check every 500ms
  timeoutMs: 1800000, // Timeout after 30 minutes
});
```

**When to use PPT mode:**

- Production scenarios requiring precise timing coordination
- Multi-node setups where clock sync matters
- Critical auction operations

### Working with Bid Objects

Bid objects provide helper methods for deadline management.

```typescript
const bid = AuctionBid.builder()
  .amount(parsePod("1.0"))
  .deadlineMinutes(30)
  .build();

// Get deadline as Date
const deadlineDate = bid.deadlineAsDate();
console.log(`Auction ends at: ${deadlineDate.toISOString()}`);

// Check time remaining
const remaining = bid.timeRemaining();
if (remaining !== undefined) {
  console.log(`${remaining / 1000} seconds remaining`);
}

// Check if deadline passed
if (bid.isPastDeadline()) {
  console.log("Auction has ended");
}
```

### Monitoring Auction State

Real-time auction updates require WebSocket subscription (auction state is not
available via RPC).

```typescript
import { WebSocketClient } from "@podnetwork/ws";

const ws = WebSocketClient.chronosDev();
const subscription = await ws.subscribeAuction(auctionId);

for await (const status of subscription) {
  console.log(`Highest bid: ${formatPod(status.highestBid ?? 0n)} WETH`);
  console.log(`Highest bidder: ${status.highestBidder ?? "none"}`);
  console.log(`Time remaining: ${status.timeRemaining()} ms`);

  if (status.isEnded) {
    console.log("Auction ended");
    break;
  }
}
```

See [@podnetwork/ws](../ws) for WebSocket subscription details.

### Error Handling

Auction operations throw typed errors for specific failure cases.

```typescript
import { PodAuctionError } from "@podnetwork/auction";

try {
  await client.auction.waitForDeadline(bid.deadline);
} catch (error) {
  if (error instanceof PodAuctionError) {
    console.log(`Auction error [${error.code}]: ${error.message}`);

    // Error-specific properties
    if (error.deadline) {
      console.log(`Deadline: ${error.deadline}`);
    }
    if (error.auctionId) {
      console.log(`Auction ID: ${error.auctionId}`);
    }
  }
}
```

**Error codes:**

- `POD_5001` — Auction not found
- `POD_5002` — Timeout waiting for deadline
- `POD_5003` — Auction already ended
- `POD_5004` — Bid amount too low
- `POD_5005` — Failed to decode auction data

## API Reference

For complete API documentation, see the
[TypeScript SDK API Reference](http://aaronbassett.github.io/pod-docs/typescript-sdk/).

### Core Exports

| Export                      | Description                                     |
| --------------------------- | ----------------------------------------------- |
| `AuctionNamespace`          | Auction operations namespace (`client.auction`) |
| `AuctionBid`                | Bid object with deadline helpers                |
| `AuctionBidBuilder`         | Fluent builder for creating bids                |
| `AuctionStatus`             | Auction state wrapper (from WebSocket)          |
| `PendingAuctionTransaction` | Pending bid submission tracking                 |
| `PodAuctionError`           | Typed auction errors                            |

### Schema Exports

| Export                    | Description                   |
| ------------------------- | ----------------------------- |
| `AuctionBidData`          | Bid data interface            |
| `AuctionBidDataSchema`    | Zod schema for bid validation |
| `AuctionStatusData`       | Auction state interface       |
| `AuctionStatusDataSchema` | Zod schema for auction state  |

## Coming from Ethereum?

pod network's auction system uses batch auctions instead of a continuous
mempool, providing MEV resistance and fairer price discovery.

### Key Differences

| Concept                  | Traditional Blockchain         | pod network                   |
| ------------------------ | ------------------------------ | ----------------------------- |
| **Transaction ordering** | Mempool + priority gas auction | Batch auction settlement      |
| **MEV**                  | Vulnerable to frontrunning     | MEV-resistant batch execution |
| **Finality**             | 12+ seconds (Ethereum)         | Sub-200ms                     |
| **Bidding**              | Continuous (gas auctions)      | Discrete auction rounds       |

### Auction Workflow

1. **Create a bid** — Specify amount, deadline, and optional calldata
2. **Submit bid** — Send to the optimistic auction contract
3. **Wait for deadline** — Auction settles when deadline passes
4. **Settlement** — Highest bid wins, executed in batch with other transactions

Unlike Ethereum's gas auction (where miners order by gas price), pod network
uses explicit batch auctions with deadlines, ensuring all participants have
equal access to block space.

## Related Packages

| Package                                 | Description                               |
| --------------------------------------- | ----------------------------------------- |
| [`@podnetwork/core`](../core)           | PodClient, RPC methods, types             |
| [`@podnetwork/wallet`](../wallet)       | Wallet management for bid signing         |
| [`@podnetwork/ws`](../ws)               | WebSocket subscriptions for auction state |
| [`@podnetwork/orderbook`](../orderbook) | CLOB trading (separate from auctions)     |

## Contributing

We welcome contributions! Please see our
[Contributing Guide](../../CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE) © pod network
