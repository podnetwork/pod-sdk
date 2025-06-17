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
                method: 'eth_gasPrice',
                params: [],
                id: 1
            })
        });
    }
</script>

! content id="eth_gasPrice"

## Get Gas Price

Returns the current gas price.

### Parameters

None

### Response

| Key                | Type    | Description                                   |
| ------------------ | ------- | --------------------------------------------- |
| `statusCode`       | integer | HTTP status code                              |
| `response.jsonrpc` | string  | same value as request                         |
| `response.id`      | integer | unique value as request                       |
| `response.result`  | string  | Current gas price in wei (hexadecimal format) |

! content end

! content

! sticky

! codeblock title="POST rpc.v2.pod.network" runCode={play}

```rust alias="rust"
use reqwest::Client;
use serde_json::{json, Value};

async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let gas_price = pod_provider.get_gas_price().await?;
    println!("{}", gas_price);

    Ok(())
}
```

```bash alias="curl"
curl -X POST https://rpc.v2.pod.network \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "method": "eth_gasPrice",
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
		method: 'eth_gasPrice',
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
    "result": "0x1",
    "id": 1
}
```

! codeblock end

! sticky end

! content end
