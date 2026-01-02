# Basic Transfer Example

Demonstrates sending POD tokens on the pod network using the TypeScript SDK.

## What This Example Shows

1. Connecting to Chronos devnet
2. Creating/importing a wallet
3. Checking wallet balance
4. Sending POD tokens
5. Waiting for transaction confirmation
6. Error handling

## Prerequisites

- Node.js 18+
- pnpm
- A wallet with POD tokens (or use the faucet example first)

## Setup

```bash
# From the ts-sdk root
pnpm install
pnpm build

# Navigate to this example
cd examples/basic-transfer
```

## Running

```bash
# With a funded wallet
PRIVATE_KEY=0x... pnpm start

# Or generate a new wallet (will show mnemonic)
pnpm start
```

## Configuration

Edit `src/index.ts` to customize:

- `RECIPIENT_ADDRESS`: Where to send tokens
- `TRANSFER_AMOUNT`: How much POD to send

## Related Examples

- [Faucet](../faucet/) - Get testnet tokens
- [OrderBook Trading](../orderbook-trading/) - Place bids on the CLOB
- [Auction Bidding](../auction-bidding/) - Participate in auctions
