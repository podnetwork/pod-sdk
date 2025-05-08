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
pod-client = "0.1.0"
```

! codeblock end

! sticky end

! content end

! content

### Building the pod provider

! anchor building-provider

Helper function for building pod provider can be seen.

! content end

! content

! sticky

! codeblock title="Example"

```rust
use alloy::providers::{Provider, WsConnect};
use alloy_network::EthereumWallet;
use pod_sdk::PrivateKeySigner;
use eyre::Result;

async fn build_pod_provider(ws_url: Url, private_key_hex: &str) -> Result<impl Provider> {
    // Create a signer from the private key
    let wallet = EthereumWallet::from_hex(private_key_hex)
        .expect("Invalid private key format for PRIVATE_KEY");

    // Initialize WebSocket
    let ws = WsConnect::new(ws_url);

    // Build the PodProvider
    let pod_provider = provider::PodProviderBuilder::new()
        .wallet(wallet)
        .on_ws(ws)
        .await?;

    Ok(pod_provider)
}
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
    let ws = WsConnect::new(ws_url);
    
    let pod_client = provider::PodProviderBuilder::new()
        .on_ws(ws)
        .await?;
    
    // Get transaction by hash
    let tx_hash = B256::from_str("0x...")?;
    // Get transaction without attestations
    let tx = pod_client.get_transaction_by_hash(&tx_hash).await?;
        
    Ok(())
}
```

! codeblock end

! sticky end

! content end
