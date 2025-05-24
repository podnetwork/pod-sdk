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

! lang-tab

## Get Chain Id

Returns the chain ID of the current network.

### Parameters

None

### Response

! lang-content lang="rust"
! content
| Key                | Type    | Description             |
| ------------------ | ------- | ----------------------- |
| `result`  | u64  | Chain ID, always 1293     |
! content end
! lang-content end

! lang-content lang="bash"
! content
| Key                | Type    | Description                                    |
| ------------------ | ------- | ---------------------------------------------- |
| `statusCode`       | integer | HTTP status code                               |
| `response.jsonrpc` | string  | same value as request                          |
| `response.id`      | integer | unique value as request                        |
| `response.result`  | string  | Chain ID in hexadecimal format, always `0x50d` |
! content end
! lang-content end

! lang-content lang="js"
! content
| Key                | Type    | Description                                    |
| ------------------ | ------- | ---------------------------------------------- |
| `statusCode`       | integer | HTTP status code                               |
| `response.jsonrpc` | string  | same value as request                          |
| `response.id`      | integer | unique value as request                        |
| `response.result`  | string  | Chain ID in hexadecimal format, always `0x50d` |
! lang-content end

! content end

! content

! sticky

! codeblock title="POST rpc.dev.pod.network" runCode={play}

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

! codeblock end

Example Response:

! lang-content lang="rust"
! codeblock
```rust
1293u64
```
! codeblock end
! lang-content end

! lang-content lang="js"
! codeblock
```json
{
	"jsonrpc": "2.0",
	"result": "0x50d",
	"id": 1
}
```
! codeblock end
! lang-content end

! lang-content lang="bash"
! codeblock
```json
{
	"jsonrpc": "2.0",
	"result": "0x50d",
	"id": 1
}
```
! codeblock end
! lang-content end

! sticky end

! content end
