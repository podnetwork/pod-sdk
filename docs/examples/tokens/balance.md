! content id="transfer"

## Token balance

Users can query balance of tokens from a given address.

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
        function balanceOf(address account) external;
    }
}

async fn balance(pod_provider: &PodProvider, contract_address: Address, address: Address) -> Result<(), Box<dyn Error>> {
    let contract = Tokens::new(contract_address, provider.clone());
    let balance = contract.balance_of(alice).call().await?;
    println!("Balance: {:?}", balance);
    Ok(())
}
```

! codeblock end

! sticky end

! content end
