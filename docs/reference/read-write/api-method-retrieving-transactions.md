! content id="retrieving-transactions"

### Retrieving Transactions

As shown in the introductory section, the transaction can be retreived by hash as

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

This method returns the transaction details along with pod-specific certificate information.

! sticky end

! content end
