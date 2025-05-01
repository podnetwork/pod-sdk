! content id="send-transaction"

## Send the transaction

Now, we need to send our transaction to the client and broadcast it to the pod network

! content end

! content

! sticky

! codeblock title="Send a transaction"

<!-- prettier-ignore -->
```rust
use eyre::Result;
use alloy_primitives::{Address, U256};
use std::time::SystemTime;
use network::PodTransactionRequest;
use pod_sdk::TransactionBuilder;
use alloy_rpc_types_eth::transaction_request::TransactionRequest;

/// Builds and sends a transaction to the given `recipient` with the specified `value`.
/// Returns the (pending) transaction hash and the `start_time` for later receipt fetching.
pub async fn send_payment_tx<P: Provider>(
    pod_provider: &P,
    from_address: Address,
    recipient: Address,
    value: U256
) -> Result<(H256, u128)> {
    // 1) Build the transaction object
    let tx = PodTransactionRequest::default()
        .with_from(from_address)
        .with_to(recipient)
        .with_value(value);
    
    println!("Built transaction: {:?}", tx);

    // 2) Capture the time when we send the transaction
    let start_time = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)?
        .as_micros() as u128;

    // 3) Send the transaction
    let pending_tx = pod_provider.send_transaction(tx.into()).await?;
    let tx_hash = pending_tx.tx_hash();
    
    println!("Transaction sent. Hash: {:?}", tx_hash);

    Ok((tx_hash, start_time))
}
```

! codeblock end

! sticky end

! content end
