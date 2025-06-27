---
layout: simple
---

! content

### Basic Usage

! anchor basic-usage

Here's a simple example demonstrating how to initialize the client and perform basic operations.

! content end

! content

! sticky

! codeblock title="Example"

```rust
use pod_sdk::provider;
use alloy_primitives::B256;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let ws_url = Url::parse("ws://127.0.0.1:8545")?;
```

! codeblock end

! sticky end

! content end
