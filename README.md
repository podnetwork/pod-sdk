# pod sdk

This repository contains the Software Development Kit for the pod Network. It provides a simplified interface for interacting with the pod network.

## Features

- Simple connection to pod nodes using WebSocket or HTTP
- Transaction creation and submission
- Receipt verification
- Event subscription and verification
- Committee-based consensus verification

## Repository Structure

The pod ecosystem is divided into several repositories:

- **pod sdk** (this repository): Client-side tools for interacting with the pod network
- **pod types**: The main implementation of the pod validator types
- **pod contracts**: Smart contracts powering the pod ecosystem

## Key Types

The SDK provides several key types:

- `PodProvider`: The main entry point for interacting with the pod network
- `PodProviderBuilder`: A builder pattern for creating configured providers
- `Hash`: A cryptographic hash representing transaction IDs or other hashed data
- `Receipt`: A proof of transaction inclusion in the blockchain
- `Committee`: The current set of validators for the network
- `VerifiableLog`: A log entry that can be cryptographically verified

## Usage

```rust
use pod_sdk::{PodProvider, PodProviderBuilder};
use alloy_network::EthereumWallet;
use alloy::consensus::TxLegacy;

#[tokio::main]
async fn main() -> Result<()> {
    let wallet = EthereumWallet::new(PrivateKeySigner::random());
    let ws_url = "ws://127.0.0.1:8546".parse()?;

    // Connect to a POD node
    let provider = PodProviderBuilder::new()
        .wallet(wallet)
        .on_ws(ws_url)
        .await?;

    // Create and send a transaction
    let tx = TxLegacy {
        // transaction details
    };

    let tx_hash = provider.send_transaction(tx).await?;
    println!("Transaction sent with hash: {tx_hash}");

    // Verify receipts with the current committee
    let committee = provider.get_committee().await?;
    let receipts = provider.get_confirmed_receipts(start_time, None).await?;

    for receipt in receipts.items {
        if receipt.verify(&committee).unwrap() {
            println!("Receipt verified: {:?}", receipt);
        }
    }

    // Subscribe to logs and verify them
    let filter = Filter::new()
        .address(contract_address)
        .event_signature(event_signature);

    let sub = provider.subscribe_verifiable_logs(&filter).await?;
    let mut stream = sub.into_stream();

    while let Some(log) = stream.next().await {
        if log.verify(&committee).unwrap() {
            println!("Verified event: {:?}", log);
            println!("Proof: {:?}", log.generate_multi_proof());
        }
    }

    Ok(())
}
```

## Installation

Add the following to your `Cargo.toml`:

```toml
[dependencies]
pod-sdk = "0.1.0"
```

## Using with Contracts

The SDK works seamlessly with contract bindings from the pod contracts repository:

```rust
use pod_sdk::PodProvider;
use pod_contracts::auction::Auction;

async fn interact_with_auction(provider: &PodProvider, auction_address: Address) -> Result<()> {
    // Create a contract instance
    let auction = Auction::new(auction_address, provider.clone());

    // Call view functions
    let highest_bid = auction.highest_bid().call().await?;
    println!("Highest bid: {}", highest_bid);

    // Submit transactions
    let tx = auction.bid().value(amount).send().await?;
    println!("Bid submitted with hash: {:?}", tx.tx_hash());

    // Wait for receipt
    let receipt = tx.get_receipt().await?;
    println!("Transaction confirmed: {:?}", receipt);

    // Listen for events
    let events = auction.events().bid_submitted().query().await?;
    for event in events {
        println!("Bid submitted by: {:?}, amount: {}", event.bidder, event.amount);
    }

    Ok(())
}
```

## ⚠️ Warning

**This is a pre-release version under active development. APIs are subject to change without notice and may contain bugs. Not recommended for production use.**
