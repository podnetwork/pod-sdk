# Auction Bidding Example

Demonstrates participating in optimistic auctions on the pod network.

## What This Example Shows

1. Connecting to Chronos devnet
2. Creating an auction client
3. Querying existing auction bids
4. Building and submitting an auction bid
5. Waiting for auction deadline
6. Fetching final auction results

## Prerequisites

- Node.js 18+
- pnpm
- A wallet with POD tokens
- An active auction to bid on

## Setup

```bash
# From the ts-sdk root
pnpm install
pnpm build

# Navigate to this example
cd examples/auction-bidding
```

## Running

```bash
# With required environment variables
PRIVATE_KEY=0x... AUCTION_ID=1 pnpm start
```

## Configuration

Environment variables:

- `PRIVATE_KEY` (required): Your wallet's private key
- `AUCTION_ID` (optional): Target auction ID (defaults to 1)

Or edit `src/index.ts` to customize:

- `BID_AMOUNT`: Bid amount in POD

## Understanding Auctions

pod network uses an optimistic auction mechanism:

- **Bids**: Query all bids for an auction using `getBids()`
- **Deadline**: Each bid specifies a deadline timestamp
- **Results**: After deadline passes, query final bids to determine winner

## Auction Bid Builder

```typescript
const bid = AuctionBid.builder()
  .amount(parsePod("1.0")) // Bid amount in POD
  .deadlineMinutes(5) // Deadline 5 minutes from now
  .build();
```

## Waiting for Auction Results

```typescript
// Submit bid
const pending = await auction.submitBid(auctionId, bid, signer);

// Wait for deadline to pass
await auction.waitForDeadline(bid.deadline);

// Fetch final bids
const bids = await auction.getBids(auctionId);
const winner = bids.sort((a, b) => (b.amount > a.amount ? 1 : -1))[0];
console.log(`Winner: ${winner.bidder}`);
console.log(`Winning bid: ${formatPod(winner.amount)} POD`);
```

## Related Examples

- [Basic Transfer](../basic-transfer/) - Simple token transfers
- [OrderBook Trading](../orderbook-trading/) - CLOB trading
