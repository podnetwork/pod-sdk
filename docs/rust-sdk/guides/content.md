---
title: Rust SDK Guides
layout: simple

url: /rust-sdk/guides

toc:
  sending-transactions: Sending Transactions
  retrieving-transactions: Retrieving Transactions
  retrieving-transaction-receipts: Retrieving Transaction Receipts
---

! content id="sending-transactions"

### Sending Transactions

In order to submit a fund transfer transaction to the network, please follow the script.

! content end

! content

! sticky

! codeblock title="Example"

```rust
#[tokio::main]
async fn main() -> Result<()> {
    let ws_url = Url::parse("ws://127.0.0.1:8545")?;
    let ws = WsConnect::new(ws_url);

    let private_key_bytes =
        <[u8; 32]>::from_hex("abc...")?; /// Your Private key
    let field_bytes = FieldBytes::from_slice(&private_key_bytes);
    let signing_key = SigningKey::from_bytes(field_bytes)?;
    let signer = PrivateKeySigner::from(signing_key);
    let wallet = EthereumWallet::new(signer);

    let pod_provider = provider::PodProviderBuilder::new()
        .wallet(wallet)
        .on_ws(ws)
        .await?;

    let tx = TxLegacy {
        chain_id: Some(1293),
        nonce: 0,
        gas_price: 20_000_000_000,
        gas_limit: 21_000,
        to: TxKind::Call(Address::from_str("0x742d35Cc6634C0532925a3b844Bc454e4438f44e").unwrap()),
        value: U256::from(1000000000000000000u64),
        input: Bytes::default(),
    };
    
    let pending_tx = pod_provider.send_transaction(tx.into()).await?;
    let receipt = pending_tx.get_receipt().await?;
    
    println!("receipt: {:?}", receipt);
}
```

! codeblock end

! sticky end

! content end

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

! content id="retrieving-transaction-receipts"

### Retrieving Transaction Receipts

To obtain the transaction receipt with Pod-specific metadata and verify whether the signatures have passed the quorum threshold. For a pending transaction the receipt can be obtained as

! content end

! content

! sticky

! codeblock title="Example"

```rust
let pending_tx = pod_provider.send_transaction(tx.into()).await?;
let receipt = pending_tx.get_receipt().await?; /// Wait for the transaction to be finalized
```

! codeblock end

If you need to obtain the transaction by the transaction hash, you can do it as follows

! codeblock

```rust
// Replace with your transaction hash
let tx_hash: B256 = "0xabc...".parse()?;

// Fetch the transaction receipt
let receipt = pod_provider.get_transaction_receipt(tx_hash).await?;

// Handle the result
match receipt {
    Some(receipt) => println!("Transaction Receipt: {:?}", receipt),
    None => println!("Transaction not mined yet or invalid hash."),
}
```

! codeblock end

! sticky end

! content end
