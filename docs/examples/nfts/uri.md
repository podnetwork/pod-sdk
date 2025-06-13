! content id="transfer"

## NFT Uniform Resource Identifier

Users can query the Uniform Resource Identifier (URI) given an NFT ID.

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
    contract NFTs {
        function tokenURI(uint256 tokenId) external;
    }
}

async fn nft_uri(pod_provider: &PodProvider, contract_address: Address, token_id: U256) -> Result<(), Box<dyn Error>> {
    let contract = Tokens::new(contract_address, provider.clone());
    let uri = contract.token_uri(alice).call().await?;
    println!("URI: {:?}", balance);
    Ok(())
}
```

! codeblock end

! sticky end

! content end
