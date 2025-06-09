! content id="together"

## Putting it all together

The following code snipped gives the full sequence of events from sending the transaction to waiting for the confirmation

! content end

! content

! sticky

! codeblock title="Full sample"

<!-- prettier-ignore -->
```rust
use eyre::Result;
use alloy_primitives::{Address, U256};
use std::str::FromStr;

#[tokio::main]
async fn main() -> Result<()> {
    // 1) Set RPC URL and private key
    let rpc_url = "https://rpc.dev.pod.network";
    let private_key_hex = "your-private-key";

    // 2) Build the Pod provider (from the Rust SDK approach)
    let pod_provider = build_pod_provider(&rpc_url, &private_key_hex).await?;

    // 3) Let's define your 'from' (sender) address and the 'to' (recipient)
    //    Typically, you already know your "from_address" from the private key, but
    //    you can also query it from the signer if needed.
    //    For example, if your `build_pod_provider` can return the signer's address.
    //    We'll assume you already know it:
    let from_address = Address::from_str("0xSender...")?;
    let recipient    = Address::from_str("0xabcDEF...")?;

    // 4) Send a payment transaction
    let value_wei = U256::from(1_000_000u64); // 1,000,000 Wei for example
    let (tx_hash, start_time) = send_payment_tx(
        &pod_provider,
        from_address,
        recipient,
        value_wei
    ).await?;

    println!("Transaction hash: {:?}, start_time: {}", tx_hash, start_time);

    // 5) Wait for confirmation & verify
    wait_for_receipts_and_verify(&pod_provider, recipient, start_time).await?;

    println!("Transaction fully confirmed!");
    Ok(())
}
```

! codeblock end

! sticky end

! content end
