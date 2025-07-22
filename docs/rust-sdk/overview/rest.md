---
layout: single
---

## PodProvider

! anchor provider

The PodProvider serves as the primary interface for interacting with the Pod network. It manages RPC communication and provides methods for executing common operations. PodProvider is built on top of the Alloy Provider trait, making most of its methods Alloy-compatible.

---

### Initialization

Create a new PodProvider instance by using PodProviderBuilder and passing your url.

! codeblock title="Example"

```rust
let ws_url = Url::parse("ws://127.0.0.1:8545")?;
let ws = WsConnect::new(ws_url);
let pod_client = provider::PodProviderBuilder::new().on_ws(ws).await?;
```

! codeblock end

The same procedure can be repeated for http endpoint

! codeblock title="Example"

```rust
let rpc_url = "http://127.0.0.1:8545".parse()?;
let pod_client = provider::ProviderBuilder::new().on_http(rpc_url).await?;
```

! codeblock end

---

! anchor error-handling

## Error Handling

The error handling is identical to the Alloy error handling framework:

- [alloy rs: event errors](https://github.com/alloy-rs/examples/blob/main/examples/sol-macro/examples/events_errors.rs)
- [alloy rs: jsonrpc error decoding](https://github.com/alloy-rs/examples/blob/main/examples/contracts/examples/jsonrpc_error_decoding.rs)