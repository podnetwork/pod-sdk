! content id="events"

## Transfer events

Posts are tracked via the `PostCreated` event, which can be fetched and verified. Pod provides additional metadata with logs, allowing verification that the logs were signed by the expected committee members, without having to rely on the RPC server for safety.

Transfers are tracked via the `Transfer` event, which can be fetched and verified. Pod provides additional metadata with logs, allowing verification that the logs were signed by the expected committee members, without having to rely on the RPC server for safety.

Each validator signs a timestamp when confirming an event. The `confirmation_time()` function returns the median timestamp from all validators, giving an approximate time of occurrence.


! content end

! content

! sticky

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

! sticky end

! content end
