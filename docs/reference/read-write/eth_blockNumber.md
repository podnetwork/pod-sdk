<script>
    async function play() {
        return fetch('https://rpc.dev.pod.network/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_blockNumber',
                params: [],
                id: 1
            })
        })
    }
</script>

! content id="eth_blockNumber"

! lang-tab

## Get Block Number

Returns the latest past perfection pod timestamp in microseconds.

### Parameters

None

### Response

! lang-content lang="rust"
! content
| Key                | Type    | Description             |
| ------------------ | ------- | ----------------------- |
| `result`  | u64  | latest past perfection pod timestamp in microseconds     |
! content end
! lang-content end

! lang-content lang="bash"
! content
| Key                | Type    | Description             |
| ------------------ | ------- | ----------------------- |
| `statusCode`       | integer | HTTP status code        |
| `response.jsonrpc` | string  | same value as request   |
| `response.id`      | integer | unique value as request |
| `response.result`  | string  | latest past perfection pod timestamp in microseconds    |
! content end
! lang-content end

! lang-content lang="js"
! content
| Key                | Type    | Description             |
| ------------------ | ------- | ----------------------- |
| `statusCode`       | integer | HTTP status code        |
| `response.jsonrpc` | string  | same value as request   |
| `response.id`      | integer | unique value as request |
| `response.result`  | string  | latest past perfection pod timestamp in microseconds     |
! content end
! lang-content end

! content end

! content

! sticky

! codeblock title="POST rpc.dev.pod.network" runCode={play}

```rust alias="rust"
use reqwest::Client;
use serde_json::{json, Value};

async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let pp_time = pod_provider.get_block_number().await?;
    println!("{}", pp_time);

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
    "method": "eth_blockNumber",
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
		method: 'eth_blockNumber',
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
1747754841u64
```
! codeblock end
! lang-content end

! lang-content lang="js"
! codeblock
```json
{
	"jsonrpc": "2.0",
	"result": "1747754841",
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
	"result": "1747754841",
	"id": 1
}
```
! codeblock end
! lang-content end

! sticky end

! content end
