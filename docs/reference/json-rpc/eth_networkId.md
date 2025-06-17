---
layout: simple
---

<script>
    async function play() {
        return fetch('https://rpc.v2.pod.network/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_networkId',
                params: [],
                id: 1
            })
        });
    }

    async function play2() {
        return fetch('https://rpc.v2.pod.network/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'net_version',
                params: [],
                id: 1
            })
        });
    }
</script>

! content id="eth_networkId"

## Get Network Id

Returns the current network ID.

### Parameters

None

### Response

! table style1
| Key                | Type    | Description                                                                               |
| ------------------ | ------- | ----------------------------------------------------------------------------------------- |
| `statusCode`       | integer | HTTP status code                                                                          |
| `response.jsonrpc` | string  | same value as request                                                                     |
| `response.id`      | integer | unique value as request                                                                   |
| `response.result`  | string  | The network ID in decimal format |
! table end

! content end

! content

! sticky

! codeblock title="POST rpc.v2.pod.network" runCode={play}

```rust alias="rust"
use reqwest::Client;
use serde_json::{json, Value};

async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let network_id = pod_provider.network_id().await?;
    println!("{:?}", network_id);

    Ok(())
}
```

```bash alias="curl"
# Using eth_networkId
curl -X POST https://rpc.v2.pod.network \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "method": "eth_networkId",
        "params": [],
        "id": 1
    }'
```

```js alias="javascript"
await fetch('https://rpc.v2.pod.network/', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({
		jsonrpc: '2.0',
		method: 'eth_networkId',
		params: [],
		id: 1
	})
});
```

! codeblock end

! codeblock title="POST rpc.v2.pod.network" runCode={play2}

```rust alias="rust"
use reqwest::Client;
use serde_json::{json, Value};

async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let rpc_url = "ws://rpc.v2.pod.network:8545";
    let ws_url = Url::parse(&rpc_url)?;
    let ws = WsConnect::new(ws_url);
    let pod_provider = PodProviderBuilder::new()
            .with_recommended_fillers()
            .on_ws(ws)
            .await?;

    let net_version = pod_provider.get_net_version().await?;
    println!("{:?}", net_version);

    Ok(())
}
```

```bash alias="curl"
# Using net_version alias
curl -X POST https://rpc.v2.pod.network \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "method": "net_version",
        "params": [],
        "id": 1
    }'
```

```js alias="javascript"
await fetch('https://rpc.v2.pod.network/', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({
		jsonrpc: '2.0',
		method: 'net_version',
		params: [],
		id: 1
	})
});
```

! codeblock end

Example Response:

! codeblock

```json
{
	"jsonrpc": "2.0",
	"result": "1",
	"id": 1
}
```

! codeblock end

! sticky end

! content end
