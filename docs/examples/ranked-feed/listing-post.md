---
layout: simple
---

! content id="listing-posts"

## Listing Posts

Posts are tracked via the `PostCreated` event, which can be fetched and verified. Pod provides additional metadata with logs, allowing verification that the logs were signed by the expected committee members, without having to rely on the RPC server for safety.

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
    event PostCreated(bytes32 indexed feed_id, bytes32 indexed post_id, address indexed poster, bytes post_data);
}

async fn list_posts(provider: &PodProvider, committee: &Committee, feed_id: B256, rpc_is_trusted: bool) -> Result<(), Box<dyn Error>> {
    let filter = Filter::new().event_signature(PostCreated::SIGNATURE).topic1(feed_id);
    let logs = provider.get_verifiable_logs(&filter).await?;
    for log in logs {
        if rpc_is_trusted || log.verify(committee)? {
            println!("Verified post at {:?}: {:?}", log.confirmation_time(), log);
        }
    }
    Ok(())
}
```

! codeblock end

! sticky end

! content end