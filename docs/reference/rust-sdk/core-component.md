! content

## Core Components

### PodClient

! anchor podclient

The PodClient serves as the primary interface for interacting with the Pod network. It manages RPC communication and provides methods for executing common operations. PodClient is built on top of the Alloy client, making most of its methods Alloy-compatible.

! content end

! content empty

! content

### Initialization

Create a new PodClient instance by using PodProviderBuilder and passing your url

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

! content end

! content empty
