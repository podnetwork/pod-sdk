! content id="posting-data"

## Posting Data

To create a new post, a user calls the `createPost` function on the contract. This operation emits a `PostCreated` event that announces the new post and includes the associated post_id.

Since pod does not have blocks, when send a transaction you don't wait for a particular number of confirmations, instead you wait for the receipt to be returned, which will typically be available right after sending the transaction.

! content end

! content

! sticky

! codeblock

``` rust
use pod_sdk::{PodProvider, Wallet};
use alloy_sol_types::sol;
use alloy_contract::SolCallBuilder;
use alloy_core::types::*;
use alloy_primitives::B256;
use std::error::Error;

sol! {
    contract RankedFeed {
        function createPost(bytes32 feed_id, bytes calldata post_data) external;
    }
}

async fn create_post(provider: &PodProvider, contract_address: Address, feed_id: B256) -> Result<(), Box<dyn Error>> {
    let post_data = b"Hello, this is a post!";
    
    let contract = RankedFeed::new(contract_address, &pod_provider);
    let call = contract.createPost(feed_id, post_data.into()).send().await?;
    let tx_hash = call.tx_hash();
    let response = provider.get_transaction_receipt(*tx_hash).await?;
    if let Some(receipt) = response {
        println!("post created with tx hash: {}", receipt.transaction_hash);
    }
    Ok(())
}
```

! codeblock end

! sticky end

! content end