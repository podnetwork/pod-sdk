# pod sdk

This repository contains the Software Development Kit for the pod Network. It provides a simplified interface for interacting with the pod network.

## Features

- Simple connection to pod nodes using WebSocket or HTTP
- Transaction creation and submission
- Receipt verification
- Event subscription and verification
- Lightclient support for verifying transactions and events  

## Repository Structure
- **rust-sdk/**: Custom alloy provider to support pod-specific features.
- **solidity-sdk/**: Solidity contracts to build a verifying pod client. 
- **examples**: Example contracts and scripts to demonstrate the SDK usage. 
- **types**: Common types.

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

    // Connect to a pod node
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

## ⚠️ Warning

**This is a pre-release version under active development. APIs are subject to change without notice and may contain bugs. Not recommended for production use.**
