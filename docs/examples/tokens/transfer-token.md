---
layout: single
---

! anchor transfer

## Transfer token programmatically

This example demonstrates how to transfer tokens programmatically.

For more information about `pod_sdk` read [Interacting with pod](./rust-sdk/overview).

! codeblock

```rust
use pod_sdk::{PodProvider, Wallet};
use alloy_sol::sol;
use alloy_core::types::*;
use alloy_primitives::B256;
use std::error::Error;

sol! {
    interface Token {
        function transfer(address to, uint256 amount) external;
    }
}

async fn transfer_tokens(pod_provider: &PodProvider, contract_address: Address, destination_address: Address, amount: U256) -> Result<(), Box<dyn Error>> {
    let contract = Token::new(contract_address, provider.clone());
    let call = contract.transfer(destination_address, amount).send().await?;
    let tx_hash = call.tx_hash();
    if let Some(receipt) = provider.get_transaction_receipt(*tx_hash).await? {
        println!("Tokens sent with receipt: {:?}", receipt);
    }
    Ok(())
}
```

! codeblock end