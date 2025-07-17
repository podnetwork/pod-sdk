! content id="confirmation"

## Wait for the confirmation and get the receipt

Finally, we wait for the transaction to be confirmed and fetch the receipts

! content end

! content

! sticky

! codeblock title="Get a transaction receipt"

<!-- prettier-ignore -->
```rust
use eyre::Result;
use alloy_rpc_types_eth::H256;
use std::time::SystemTime;
use network::PodTransactionReceipt;
use pod_core::time::SystemClock;
use alloy_primitives::TxKind;

pub async fn wait_for_receipts_and_verify<P: Provider>(
    pod_provider: &P,
    recipient: Address,
    start_time: u128
) -> Result<()> {
    // 1) Get newly confirmed receipts since `start_time`
    let receipts = pod_provider.get_confirmed_receipts(start_time).await?;
    let committee = pod_provider.get_committee().await?;

    // 2) Inspect each receipt
    for receipt in receipts {
        // Confirm it's calling `recipient`
        if receipt.transaction().to == TxKind::Call(recipient) {
            // Attempt to verify with the committee
            if matches!(receipt.verify(&committee), Ok(true)) {
                println!("Found verified receipt: {:?}", receipt);
            }
        }
    }

    // 3) Wait for past perfect time => transaction is final
    let now = SystemClock.now().as_seconds();
    println!("Waiting for chain's past perfect time to reach {}...", now);
    pod_provider.wait_past_perfect_time(now as u64).await?;
    println!("Perfect time reached. Transaction final and cannot be reversed.");

    Ok(())
}
```

! codeblock end

! sticky end

! content end
