! content id="transfer"

## Transfer token

Users can transfer tokens from one address to another.

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
    contract Tokens {
        function transfer(address to, uint256 amount) external;
    }
}

async fn transfer_tokens(pod_provider: &PodProvider, contract_address: Address, destination_address: Address, amount: U256) -> Result<(), Box<dyn Error>> {
    let contract = Tokens::new(contract_address, provider.clone());
    let call = contract.transfer(destination_address, amount).send().await?;
    let tx_hash = call.tx_hash();
    let response = provider.get_transaction_receipt(*tx_hash).await?;
    if let Some(receipt) = tx.get_receipt().await? {
        println!("Tokens sent with receipt: {:?}", receipt);
    }
    Ok(())
}
```

! codeblock end

! sticky end

! content end
