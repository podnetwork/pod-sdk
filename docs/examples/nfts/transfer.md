! content id="transfer"

## Transfer token

Users can transfer an NFT from one address to another.

Transfers are following ERC-721 standard: if accidentally an NFT is sent to a contract that lacks onERC721Received, the
token will be returned to the original owner.

Transfers are tracked via the `Transferred` event, which can be fetched and verified.
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
    contract Tokens {
        event Transferred(uint256 indexed tokenId, address indexed from, address indexed to);
        
        function safeTransfer(uint256 id, address to) external
    }
}

async fn transfer_nft(pod_provider: &PodProvider, contract_address: Address, destination_address: Address, token_id: U256) -> Result<(), Box<dyn Error>> {
    let contract = Tokens::new(contract_address, provider.clone());
    let call = contract.safeTransfer(destination_address, token_id).send().await?;
    let tx_hash = call.tx_hash();
    let response = provider.get_transaction_receipt(*tx_hash).await?;
    if let Some(receipt) = tx.get_receipt().await? {
        println!("NFT sent with receipt: {:?}", receipt);
    }

    let filter = Filter::new().event_signature(Minted::Transferred).topic1(source_address);
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
