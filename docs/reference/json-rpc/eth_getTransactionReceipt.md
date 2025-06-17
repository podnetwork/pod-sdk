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
                method: 'eth_getTransactionReceipt',
                params: [
                    '0xf74e07ff80dc54c7e894396954326fe13f07d176746a6a29d0ea34922b856402'
                ],
                id: 1
            })
        });
    }
</script>

! content id="eth_getTransactionReceipt"

## Get Transaction Receipt

Returns the receipt of a transaction by transaction hash.

### Parameters

| Parameter  | Type   | Description              |
| ---------- | ------ | ------------------------ |
| `string 1` | string | 32-byte transaction hash |

### Response

| Key                | Type    | Description                                                                               |
| ------------------ | ------- | ----------------------------------------------------------------------------------------- |
| `statusCode`       | integer | HTTP status code                                                                          |
| `response.jsonrpc` | string  | same value as request                                                                     |
| `response.id`      | integer | unique value as request                                                                   |
| `response.result`  | object  | A transaction receipt object with pod-specific metadata, or null if no receipt was found. |

| Key               | Type   | Description                                       |
| ----------------- | ------ | ------------------------------------------------- |
|               | object | Standard Ethereum receipt fields                  |
| `pod_metadata` | object | Contains pod-specific data including attestations |

! content end

! content

! sticky

! codeblock title="POST rpc.v2.pod.network" runCode={play}

```rust alias="rust"
use reqwest::Client;
use serde_json::{json, Value};

async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let tx_receipt = pod_provider
        .get_transaction_receipt(
            b256!("0xf74e07ff80dc54c7e894396954326fe13f07d176746a6a29d0ea34922b856402"),
        )
        .await?;
    println!("{:?}", tx_receipt);

    let committee = pod_provider.get_committee().await?;

    let verification = tx_receipt.verify(&committee)?;
    println!("{:?}", verification);

    Ok(())
}
```

```bash alias="curl"
curl -X POST https://rpc.v2.pod.network \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "method": "eth_getTransactionReceipt",
        "params": [
            "0xf74e07ff80dc54c7e894396954326fe13f07d176746a6a29d0ea34922b856402"
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
		method: 'eth_getTransactionReceipt',
		params: [
			'0xf74e07ff80dc54c7e894396954326fe13f07d176746a6a29d0ea34922b856402'
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
	"result": {},
	"id": 1
}
```

! codeblock end

! sticky end

! content end
