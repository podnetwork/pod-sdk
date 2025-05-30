! content id="token-creation"

## Creation of a Token

In order to create a Token, this contract should be deployed and constructed with your chosen name, symbol, and initial supply; the constructor then mints that supply, assigns it entirely to the deployer’s address, and emits a Transfer event from the zero address—establishing both the token’s identity and its first on-chain ledger entry in a single transaction.

Once the contract is deployed, the caller address will hold the total supply of tokens.
! content end

! content

! sticky

! codeblock

```rust
use pod_sdk::{PodProvider, Wallet};
use alloy_sol_types::sol;
use alloy_contract::SolCallBuilder;
use alloy_core::types::*;
use alloy_primitives::B256;
use std::error::Error;

sol! {
    #[sol(rpc)]
    contract Tokens {
        constructor(
            string  memory name_,
            string  memory symbol_,
            uint256 initialSupply_
        );
    }
}

async fn create_token(pod_provider: &PodProvider) -> Result<(), Box<dyn Error>> {
    let name   = "DemoToken".to_string();
    let symbol = "DMT".to_string();
    let supply = U256::from(1_000_000u64);

    let token_addr = Tokens::deploy_builder(&pod_provider, (name.clone(), symbol.clone(), supply))
        .from(alice)
        .deploy()
        .await?;

    let token = Tokens::new(token_addr, &pod_provider);
    Ok(())
}
```

! codeblock end

! sticky end

! content end