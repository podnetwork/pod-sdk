<script>
    async function play() {
        return fetch('https://rpc.dev.pod.network/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [
                    '0x13791790Bef192d14712D627f13A55c4ABEe52a4',
                    '0x1'
                ],
                id: 1
            })
        });
    }
</script>

! content id="eth_getBalance"

! lang-tab

## Get Balance

Returns the balance of a given address.

### Parameters

! lang-content lang="rust"
! content
| Parameter | Type   | Description                                                                                                  |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| `address`     | Address | Address to check the number of transactions sent                                                        |
! content end
! lang-content end

! lang-content lang="bash"
! content
| Parameter  | Type   | Description                                                                                                                     |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `string 1` | string | 20-byte address to check balance for                                                                                            |
| `string 2` | string | Past perfect timestamp to query, specified in seconds(hexadecimal format). Can also be the tags: earliest, finalized or latest. |
! content end
! lang-content end

! lang-content lang="js"
! content
| Parameter  | Type   | Description                                                                                                                     |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `string 1` | string | 20-byte address to check balance for                                                                                            |
| `string 2` | string | Past perfect timestamp to query, specified in seconds(hexadecimal format). Can also be the tags: earliest, finalized or latest. |
! content end
! lang-content end

> Note: Currently returns the current balance regardless of timestamp

### Response

! lang-content lang="rust"
! content
| Type   | Description                                  |
|--------|----------------------------------------------|
| `U256` | Balance of the given address in wei (as a 256-bit unsigned integer) |
! content end
! lang-content end

! lang-content lang="js"
! content
| Key                | Type    | Description                         |
| ------------------ | ------- | ----------------------------------- |
| `statusCode`       | integer | HTTP status code                    |
| `response.jsonrpc` | string  | same value as request               |
| `response.id`      | integer | unique value as request             |
| `response.result`  | string  | balance in hexadecimal format |
! content end
! lang-content end

! lang-content lang="bash"
! content
| Key                | Type    | Description                         |
| ------------------ | ------- | ----------------------------------- |
| `statusCode`       | integer | HTTP status code                    |
| `response.jsonrpc` | string  | same value as request               |
| `response.id`      | integer | unique value as request             |
| `response.result`  | string  | balance in hexadecimal format |
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

    let balance = pod_provider.get_balance(address).await?;
    println!("{}", balance);

    Ok(())
}
```

```bash alias="curl"
curl -X POST https://rpc.dev.pod.network \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "method": "eth_getBalance",
        "params": [
            "0x13791790Bef192d14712D627f13A55c4ABEe52a4",
            "0x1"
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
		method: 'eth_getBalance',
		params: [
			'0x13791790Bef192d14712D627f13A55c4ABEe52a4',
			'0x1'
		],
		id: 1
	})
});
```

! codeblock end

Example Response:

! lang-content lang="rust"
! codeblock
```rust
1999978999999000000u256
```
! codeblock end
! lang-content end

! lang-content lang="js"
! codeblock
```json
{
    "jsonrpc": "2.0",
    "result": "0x0",
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
    "result": "0x0",
    "id": 1
}
```
! codeblock end
! lang-content end

! sticky end

! content end
