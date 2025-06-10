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
