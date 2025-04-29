<script>
    async function play() {
        return fetch('https://rpc.dev.pod.network/', {
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

## eth_chainId

Returns the chain ID of the current network.

### Parameters

None

### Response

| Key                | Type    | Description                                    |
| ------------------ | ------- | ---------------------------------------------- |
| `statusCode`       | integer | HTTP status code                               |
| `response.jsonrpc` | string  | same value as request                          |
| `response.id`      | integer | unique value as request                        |
| `response.result`  | string  | Chain ID in hexadecimal format, always `0x50d` |

! content end

! content

! sticky

! codeblock title="POST rpc.dev.pod.network" runCode={play}

```bash alias="curl"
curl -L \
  --request POST \
  --url 'https://rpc.dev.pod.network/' \
  --header 'Content-Type: application/json' \
  --data '{
    "jsonrpc": "2.0",
    "method": "eth_chainId",
    "params": [],
    "id": 1
  }'
```

```js alias="javascript"
await fetch('https://rpc.dev.pod.network/', {
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

```rust alias="rust"
use reqwest::Client;
use serde_json::{json, Value};

async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();
    let response = client
        .post("https://rpc.dev.pod.network/")
        .header("Content-Type", "application/json")
        .json(&json!({
            "jsonrpc": "2.0",
            "method": "eth_chainId",
            "params": [],
            "id": 1
        }))
        .send()
        .await?;

    let result: Value = response.json().await?;
    println!("{}", result);

    Ok(())
}
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
