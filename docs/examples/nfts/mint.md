! content id="transfer"

## Mint an NFT

Users can mint an NFT given a Uniform Resource Identifier (URI)

Mints (NFT creations) are tracked via the `Minted` event, which can be fetched and verified. 
Pod provides additional metadata with logs, allowing verification that the logs were signed by the expected committee members, without having to rely on the RPC server for safety.

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
        event Minted(uint256 indexed tokenId, address indexed owner, string  uri);
        
        function mint(uint256 tokenId, string calldata uri) external;
    }
}

async fn mint_nft(pod_provider: &PodProvider, contract_address: Address, token_id: U256, uri: U256) -> Result<(), Box<dyn Error>> {
    let contract = Tokens::new(contract_address, provider.clone());
    let call = contract.mint(token_id, uri).send().await?;
    let tx_hash = call.tx_hash();
    let response = provider.get_transaction_receipt(*tx_hash).await?;
    if let Some(receipt) = tx.get_receipt().await? {
        println!("NFT minted with receipt: {:?}", receipt);
    }

    let filter = Filter::new().event_signature(Minted::SIGNATURE).topic1(token_id);
    let logs = pod_provider.get_verifiable_logs(&filter).await?;
    for log in logs {
        if rpc_is_trusted || log.verify(committee)? {
            println!("Verified mint at {:?}: {:?}", log.confirmation_time(), log);
        }
    }
    Ok(())
}
```

! codeblock end

! sticky end

! content end
