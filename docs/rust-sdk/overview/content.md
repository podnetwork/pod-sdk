---
title: Rust SDK Overview
layout: simple

url: /rust-sdk/overview

toc:
introduction: Introduction
getting-started: Getting started
coming-from-alloy: Coming from alloy
provider: PodProvider
error-handling: Error Handling
---

! content id="introduction"

# pod Rust SDK

Rust library for interacting with pod.

## Introduction

The pod Rust SDK provides a robust interface for interacting with the pod network through its [JSON-RPC API](/reference/rpc-api). This SDK enables developers to communicate with pod nodes, manage transactions, and handle network responses in a type-safe manner. The SDK includes comprehensive error handling, serialization management, and strongly-typed responses for pod-specific features.

! content end

! content empty

! content id="installation"

## Getting Started

### Installation

To begin using the pod Rust SDK, add the following dependency to your project's `Cargo.toml`

! content end

! content

! sticky

! codeblock title="Cargo.toml"

```toml
[dependencies]
pod-sdk = "0.1.0"
```

! codeblock end

! sticky end

! content end

! content

### Basic Usage

! anchor basic-usage

Here's a simple example demonstrating how to initialize the client and perform basic operations.

! content end

! content

! sticky

! codeblock title="Example"

```rust
use pod_sdk::provider;
use alloy_primitives::B256;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let ws_url = Url::parse("ws://127.0.0.1:8545")?;

! content id="coming-from-alloy"

## Coming from alloy

pod Rust SDK is built on top of alloy. Therefore, alloy could be used to interact with the pod
network, however, this is not recommended, as the pod SDK provides additional essential
functionality such as `wait_past_perfect_time`, which integrate pod-specific features. Additionally,
using alloy directly may lead to unexpected behavior when waiting for transaction confirmations or
fetching blocks.

The main different between using pod-sdk and alloy is that pod has its own ProviderBuilder, called
`PodProviderBuilder`. The rest of the API remains the same, as it's illustrated in the example.

! content end

! content

! sticky

! codeblock title="Send transaction with pod-sdk"

```rust
#[tokio::main]
async fn main() -> Result<()> {
    // Initialize a wallet - alloy compatible
    let private_key_bytes = <[u8; 32]>::from_hex("abc...")?;
    let field_bytes = FieldBytes::from_slice(&private_key_bytes);
    let signing_key = SigningKey::from_bytes(field_bytes)?;
    let signer = PrivateKeySigner::from(signing_key);
    let wallet = EthereumWallet::new(signer);

    let ws_url = Url::parse("ws://rpc.v2.pod.network:8545")?;
    let ws = WsConnect::new(ws_url);
    // Instantiate a provider
    // Use pod-specific Provider instead of use alloy::providers::ProviderBuilder
    let pod_provider = provider::PodProviderBuilder::new()
        .wallet(wallet)
        .on_ws(ws)
        .await?;

    // Send transaction
    // Use alloy structs
    let tx = TxLegacy {
        chain_id: Some(1293),
        nonce: 0,
        gas_price: 20_000_000_000,
        gas_limit: 21_000,
        to: TxKind::Call(Address::from_str("0x70997970C51812dc3A010C7d01b50e0d17dc79C8").unwrap()),
        value: U256::from(1000000000000000000u64),
        input: Bytes::default(),
    };
    // Use send_transaction - alloy compatible
    let pending_tx = pod_provider.send_transaction(tx.into()).await?;

    // Get receipt - alloy compatible
    let receipt = pending_tx.get_receipt().await?;
    println!("receipt: {:?}", receipt);

    Ok(())
}
```

! codeblock end

! sticky end

! content end

! content

## PodProvider

! anchor provider

The PodProvider serves as the primary interface for interacting with the Pod network. It manages RPC communication and provides methods for executing common operations. PodProvider is built on top of the Alloy Provider trait, making most of its methods Alloy-compatible.

! content end

! content empty

! content

### Initialization

Create a new PodProvider instance by using PodProviderBuilder and passing your url.

! codeblock title="Example"

```rust
let ws_url = Url::parse("ws://127.0.0.1:8545")?;
let ws = WsConnect::new(ws_url);
let pod_client = provider::PodProviderBuilder::new().on_ws(ws).await?;
```

! codeblock end

The same procedure can be repeated for http endpoint

! codeblock title="Example"

```rust
let rpc_url = "http://127.0.0.1:8545".parse()?;
let pod_client = provider::ProviderBuilder::new().on_http(rpc_url).await?;
```

! codeblock end

! content end

! content empty

! content id="error-handling"

## Error Handling

The error handling is identical to the Alloy error handling framework:

- [alloy rs: event errors](https://github.com/alloy-rs/examples/blob/main/examples/sol-macro/examples/events_errors.rs)
- [alloy rs: jsonrpc error decoding](https://github.com/alloy-rs/examples/blob/main/examples/contracts/examples/jsonrpc_error_decoding.rs)

! content end

! content empty
