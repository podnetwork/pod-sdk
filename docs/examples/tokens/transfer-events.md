---
layout: single
---

! anchor events

## Transfer events

`Transfer` events are emitted on every token transfer.

Clients can request verifiable logs from the RPC full nodes. These proofs can be verified locally if the RPC node is not trusted, or submitted to light clients, ie smart contracts in other blockchains that verify that an event was emitted in pod.

! codeblock

```rust
use pod_sdk::{PodProvider, Committee};
use alloy_core::types::*;
use alloy_core::log::Filter;
use std::error::Error;

sol! {
    event Transfer(address indexed from, address indexed to, uint256 value);
}

async fn event_transfer(pod_provider: &PodProvider, committee: &Committee, destination_address: Address, rpc_is_trusted: bool) -> Result<(), Box<dyn Error>> {
    // Filter transfer by specifing a destination address
    let filter = Filter::new().event_signature(Transfer::SIGNATURE).topic1(destination_address);
    let logs = pod_provider.get_verifiable_logs(&filter).await?;
    for log in logs {
        if rpc_is_trusted || log.verify(committee)? {
            println!("Verified transfer at {:?}: {:?}", log.confirmation_time(), log);
        }
    }
    Ok(())
}
```

! codeblock end
