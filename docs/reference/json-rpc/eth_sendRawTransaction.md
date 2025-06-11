<script>
    async function play() {
        return fetch('https://rpc.v2.pod.network/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_sendRawTransaction',
                params: [
                    '0xf8658001830493e0945fbdb2315678afecb367f032d93f642f64180aa3830f424080820a3da00f49d94d0d83d905d6372b3548d7e922d58c69e611a296d2ca3c9f762b9b5051a073e5602f6889390a284f421cc5184d05ec82923e64e86ff37e437f0600930d26'
                ],
                id: 1
            })
        });
    }
</script>

! content id="eth_sendRawTransaction"

## Send Raw Transaction

Submits a pre-signed transaction for broadcast to the POD network.

### Parameters

| Parameter | Type   | Description                                                                                                                                                                             |
| --------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[1]`     | string | Signed transaction data in hex format                                                                                                                                                   |
| `[2]`     | u64    | (optional) Timeout in milliseconds. Default is 0 milliseconds. The timeout allows the client to wait for the confirmation of the transaction instead of returning the hash immediately. |

### Response

| Key                | Type    | Description                                                                 |
| ------------------ | ------- | --------------------------------------------------------------------------- |
| `statusCode`       | integer | HTTP status code                                                            |
| `response.jsonrpc` | string  | same value as request                                                       |
| `response.id`      | integer | unique value as request                                                     |
| `response.result`  | string  | 32-byte transaction hash (or zero hash if transaction is not yet available) |

! content end

! content

! sticky

! codeblock title="POST rpc.v2.pod.network" runCode={play}

```rust alias="rust"
use reqwest::Client;
use serde_json::{json, Value};

async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let tx_data_hex = "0xf8658001830493e0945fbdb2315678afecb367f032d93f642f64180aa3830f424080820a3da00f49d94d0d83d905d6372b3548d7e922d58c69e611a296d2ca3c9f762b9b5051a073e5602f6889390a284f421cc5184d05ec82923e64e86ff37e437f0600930d26";
    let tx = pod_provider
        .send_raw_transaction(tx_data_hex.as_ref())
        .await?;

    println!("{:?}", tx);

    Ok(())
}
```

```bash alias="curl"
curl -X POST https://rpc.v2.pod.network \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "method": "eth_sendRawTransaction",
        "params": [
            "0xf8658001830493e0945fbdb2315678afecb367f032d93f642f64180aa3830f424080820a3da00f49d94d0d83d905d6372b3548d7e922d58c69e611a296d2ca3c9f762b9b5051a073e5602f6889390a284f421cc5184d05ec82923e64e86ff37e437f0600930d26"
        ],
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
		method: 'eth_sendRawTransaction',
		params: [
			'0xf8658001830493e0945fbdb2315678afecb367f032d93f642f64180aa3830f424080820a3da00f49d94d0d83d905d6372b3548d7e922d58c69e611a296d2ca3c9f762b9b5051a073e5602f6889390a284f421cc5184d05ec82923e64e86ff37e437f0600930d26'
		],
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
    "result": "0x9c3a42c40e708ad7c6c4643dcecc6cc3c38a3cfb14c19cd540612d63f3c0c218",
    "id": 1
}
```

! codeblock end

! sticky end

! content end
