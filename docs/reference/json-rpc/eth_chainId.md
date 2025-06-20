---
layout: simple
---

<script>
    async function play() {
        return fetch('https://rpc.v2.pod.network/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_chainId',
                params: [],
                id: 1
            })
        })
    }
</script>

! content id="eth_chainId"

## Get Chain Id

Returns the chain ID of the current network.

### Parameters

None

### Response

! table style1
| Key                | Type    | Description                                    |
| ------------------ | ------- | ---------------------------------------------- |
| `statusCode`       | integer | HTTP status code                               |
| `response.jsonrpc` | string  | same value as request                          |
| `response.id`      | integer | unique value as request                        |
| `response.result`  | string  | Chain ID in hexadecimal format, always `0x50d` |
! table end

! content end

! content

! sticky

! codeblock title="POST rpc.v2.pod.network" runCode={play}

```rust alias="rust"
use reqwest::Client;
use serde_json::{json, Value};

async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let chain_id = pod_provider.get_chain_id().await?;
    println!("{}", chain_id);

    Ok(())
}
```

```bash alias="curl"
curl -L \
  --request POST \
  --url 'https://rpc.v2.pod.network/' \
  --header 'Content-Type: application/json' \
  --data '{
    "jsonrpc": "2.0",
    "method": "eth_chainId",
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
		method: 'eth_chainId',
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
    "id": 1,
    "result": "0x50d"
}
```

! codeblock end

! sticky end

! content end
