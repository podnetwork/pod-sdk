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

## Get Balance

Returns the balance of a given address.

### Parameters

| Parameter  | Type   | Description                                                                                                                     |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `string 1` | string | 20-byte address to check balance for                                                                                            |
| `string 2` | string | Past perfect timestamp to query, specified in seconds(hexadecimal format). Can also be the tags: earliest, finalized or latest. |

> Note: Currently returns the current balance regardless of timestamp

### Response

| Key                | Type    | Description                         |
| ------------------ | ------- | ----------------------------------- |
| `statusCode`       | integer | HTTP status code                    |
| `response.jsonrpc` | string  | same value as request               |
| `response.id`      | integer | unique value as request             |
| `response.result`  | string  | balance in hexadecimal format |

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
            "method": "eth_getBalance",
            "params": [
                "0x13791790Bef192d14712D627f13A55c4ABEe52a4",
                "0x1"
            ],
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
    "result": "0x0",
    "id": 1
}
```

! codeblock end

! sticky end

! content end
