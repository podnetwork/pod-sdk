! content id="voting-posts"

## Voting Posts

Users can vote on posts to rank content in a decentralized way. Voting follows a simple rule: each user can vote only once per post. This ensures that the voting mechanism remains fair and prevents vote manipulation.

! content end

! content

! sticky

! codeblock

```rust
use pod_sdk::{PodProvider, Wallet};
use alloy_sol::sol;
use alloy_core::types::*;
use alloy_primitives::B256;
use std::error::Error;

sol! {
    contract RankedFeed {
        function votePost(bytes32 feed_id, bytes32 post_id) external;
    }
}

async fn vote_post(provider: &PodProvider, wallet: &Wallet, contract_address: Address, feed_id: B256, post_id: B256) -> Result<(), Box<dyn Error>> {
    let contract = RankedFeed::new(contract_address, provider.clone());
    let call = contract.votePost(feed_id, post_id).send().await?;
    let tx_hash = call.tx_hash();
    let response = provider.get_transaction_receipt(*tx_hash).await?;
    if let Some(receipt) = tx.get_receipt().await? {
        println!("Voted on post with receipt: {:?}", receipt);
    }
    Ok(())
}
```

! codeblock end

! sticky end

! content end
