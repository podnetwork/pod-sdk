<script>
    async function play() {
        return fetch('https://rpc.dev.pod.network/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getTransactionCount',
                params: ['0x13791790Bef192d14712D627f13A55c4ABEe52a4', 'latest'],
                id: 1
            })
        });
    }
</script>

! content id="eth_getTransactionCount"

! lang-tab

## Get Transaction Count

Returns the number of transactions sent from an address.

### Parameters

! lang-content lang="rust"
! content
| Parameter | Type   | Description                                                                                                  |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| `address`     | Address | Address to check the number of transactions sent                                                        |
! content end
! lang-content end

! lang-content lang="js"
! content
| Parameter | Type   | Description                                                                                                  |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| `[1]`     | string | 20-byte address                                                                                              |
| `[2]`     | string | Past perfect timestamp in seconds (hexadecimal format). Can also be the tags: earliest, finalized or latest. |
! content end
! lang-content end

! lang-content lang="bash"
! content
| Parameter | Type   | Description                                                                                                  |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| `[1]`     | string | 20-byte address                                                                                              |
| `[2]`     | string | Past perfect timestamp in seconds (hexadecimal format). Can also be the tags: earliest, finalized or latest. |
! content end
! lang-content end

> Note: Currently returns the current transaction count regardless of timestamp

### Response

! lang-content lang="rust"
! content
| Type   | Description                                  |
|--------|----------------------------------------------|
| `u64` | Number of sent transactions by the sender prior to this one |
! content end
! lang-content end

! lang-content lang="js"
! content
| Key                | Type    | Description                                                 |
| ------------------ | ------- | ----------------------------------------------------------- |
| `statusCode`       | integer | HTTP status code                                            |
| `response.jsonrpc` | string  | same value as request                                       |
| `response.id`      | integer | unique value as request                                     |
| `response.result`  | string  | Number of transactions sent by the sender prior to this one |
! content end
! lang-content end

! lang-content lang="bash"
! content
| Key                | Type    | Description                                                 |
| ------------------ | ------- | ----------------------------------------------------------- |
| `statusCode`       | integer | HTTP status code                                            |
| `response.jsonrpc` | string  | same value as request                                       |
| `response.id`      | integer | unique value as request                                     |
| `response.result`  | string  | Number of transactions sent by the sender prior to this one |
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
    let address = Address::from_word(b256!("0x000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045"));
    let txs = pod_provider
        .get_transaction_count(
            address,
        )
        .await?;
    println!("{}", txs);

    Ok(())
}
```

```bash alias="curl"
curl -X POST https://rpc.dev.pod.network \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "method": "eth_getTransactionCount",
        "params": [
            "0x13791790Bef192d14712D627f13A55c4ABEe52a4",
            "latest"
        ],
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
		method: 'eth_getTransactionCount',
		params: ['0x13791790Bef192d14712D627f13A55c4ABEe52a4', 'latest'],
		id: 1
	})
});
```

! codeblock end

Example Response:

! lang-content lang="rust"
! codeblock
```rust
100u64
```
! codeblock end
! lang-content end

! lang-content lang="js"
! codeblock
```json
{
	"jsonrpc": "2.0",
	"result": "100",
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
	"result": "100",
	"id": 1
}
```
! codeblock end
! lang-content end

! sticky end

! content end
