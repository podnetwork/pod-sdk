! content id="initialize-credentials"

## Initialize credentials

First, we need to import all the necessary pod SDK libraries and Alloy types

! content end

! content

! sticky

! codeblock title="Import keys and credentials"

<!-- prettier-ignore -->
```rust
use eyre::Result;
use alloy_primitives::{Address, U256};
use std::str::FromStr;

#[tokio::main]
async fn main() -> Result<()> {
    let rpc_url = "https://rpc.v2.pod.network";
    let private_key_hex = "your-private-key";

    // ...
}
```

! codeblock end

! sticky end

! content end

---

! content id="initialize-provider"

## Initialize provider

Second, we initialize the provider

! content end

! content

! sticky

! codeblock title="Initialize your provider"

<!-- prettier-ignore -->
```rust
use eyre::Result;
use std::sync::Arc;
use alloy_signer::k256::ecdsa::SigningKey;
use pod_sdk::PrivateKeySigner;
use alloy_network::EthereumWallet;
use alloy_primitives::Address;
use alloy::transports::http::Http;
use alloy::providers::{Provider, HttpProvider};

use crate::provider;

/// Builds the Pod Provider from the given RPC URL (HTTP) and hex-encoded private key.
pub async fn build_pod_provider(
    rpc_url: &str,
    private_key_hex: &str
) -> Result<impl Provider> {
    // 1) Decode the private key into raw bytes
    let private_key_bytes = hex::decode(private_key_hex)?;

    // 2) Create a SigningKey
    let signing_key = SigningKey::from_slice(&private_key_bytes)?;

    // 3) Wrap it into a `pod_sdk::PrivateKeySigner`
    let signer = PrivateKeySigner::from_signing_key(signing_key);

    // 4) Construct an EthereumWallet using that signer
    let wallet = EthereumWallet::new(signer);

    // 5) Create an HTTP transport
    let transport = Http::new(rpc_url)?;

    // 6) Build the final provider. This is a Pod-aware extension of a typical `HttpProvider`.
    let pod_provider = provider::PodProviderBuilder::new()
        .with_recommended_fillers()
        .wallet(wallet)
        .on_http(transport)
        .await?;

    Ok(pod_provider)
}
```

! codeblock end

! sticky end

! content end
