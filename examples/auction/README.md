# Auction CLI Example

This example demonstrates how to interact with the Pod auction contract using a command-line interface. The CLI provides two main functionalities:

1. Submitting bids for auctions
2. Watching auctions for bids and deadlines

## Prerequisites

- Rust and Cargo installed
- Access to a Pod network node
- A private key for submitting bids

## Building

```bash
cargo build --release
```

## Usage

### Submitting a Bid

To submit a bid for an auction, use the `vote` command:

```bash
./target/release/auction vote <auction_id> <deadline> --value <bid_amount> --data <bid_data> --private-key <your_private_key>
```

Parameters:
- `auction_id`: The ID of the auction to bid on
- `deadline`: The auction deadline timestamp
- `--value`: The bid amount in wei
- `--data`: Additional data for the bid
- `--private-key`: Your private key for signing the transaction

Example:
```bash
./target/release/auction vote 1 1735689600 --value 1000000000000000000 --data "My bid" --private-key 0x123...
```

### Watching an Auction

To watch an auction for bids and wait for its deadline, use the `watch` command:

```bash
./target/release/auction watch <auction_id> <deadline>
```

Parameters:
- `auction_id`: The ID of the auction to watch
- `deadline`: The auction deadline timestamp

Example:
```bash
./target/release/auction watch 1 1735689600
```

## Features

### Vote Command
- Submits a bid to the auction contract
- Displays transaction hash and explorer link
- Shows transaction receipt details
- Verifies receipt with committee attestations
- Displays attestation details

### Watch Command
- Subscribes to BidSubmitted events for the specified auction
- Displays real-time bid updates
- Tracks the highest bid and bidder
- Waits for the auction deadline
- Shows the auction winner and bid amount
- Provides explorer links for transactions and addresses

## Contract Address

The auction contract is deployed at: `0x3aE4f34B610bd21c65a787cCca1b3d00614a9C96`

## Explorer

View transactions and contract details on the Pod explorer:
https://explorer.pod.network 