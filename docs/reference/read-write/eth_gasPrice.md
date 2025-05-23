<script>
    async function play() {
        return fetch('https://rpc.dev.pod.network/', {
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

! lang-tab

## Get Gas Price

Returns the current gas price.

### Parameters

None

### Response

! lang-content lang="rust"
! content
| Key                | Type    | Description             |
| ------------------ | ------- | ----------------------- |
| `result`  | u128  | Current gas price in wei     |
! content end
! lang-content end


! lang-content lang="bash"
! content
| Key                | Type    | Description                                   |
| ------------------ | ------- | --------------------------------------------- |
| `statusCode`       | integer | HTTP status code                              |
| `response.jsonrpc` | string  | same value as request                         |
| `response.id`      | integer | unique value as request                       |
| `response.result`  | string  | Current gas price in wei (hexadecimal format) |
! content end
! lang-content end

! lang-content lang="js"
! content
| Key                | Type    | Description                                   |
| ------------------ | ------- | --------------------------------------------- |
| `statusCode`       | integer | HTTP status code                              |
| `response.jsonrpc` | string  | same value as request                         |
| `response.id`      | integer | unique value as request                       |
| `response.result`  | string  | Current gas price in wei (hexadecimal format) |
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
    let gas_price = pod_provider.get_gas_price().await?;
    println!("{}", gas_price);

    Ok(())
}
```

```bash alias="curl"
curl -X POST https://rpc.dev.pod.network \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "method": "eth_gasPrice",
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
		method: 'eth_gasPrice',
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
1000000000u128
```
! codeblock end
! lang-content end

! lang-content lang="bash"
! codeblock
```json
{
	"jsonrpc": "2.0",
	"result": "0x1",
	"id": 1
}
```
! codeblock end
! lang-content end

! lang-content lang="js"
! codeblock
```json
{
	"jsonrpc": "2.0",
	"result": "0x1",
	"id": 1
}
```
! codeblock end
! lang-content end

! sticky end

! content end
