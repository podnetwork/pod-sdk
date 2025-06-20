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
                method: 'eth_getTransactionByHash',
                params: [
                    '0xf74e07ff80dc54c7e894396954326fe13f07d176746a6a29d0ea34922b856402'
                ],
                id: 1
            })
        });
    }
</script>

! content id="eth_getTransactionByHash"

## Get Transaction by Hash

Returns information about a transaction by its hash.

### Parameters

! table style1
| Parameter  | Type   | Description              |
| ---------- | ------ | ------------------------ |
| `string 1` | string | 32-byte transaction hash |
! table end

### Response

! table style1
| Key                | Type    | Description                                              |
| ------------------ | ------- | -------------------------------------------------------- |
| `statusCode`       | integer | HTTP status code                                         |
| `response.jsonrpc` | string  | same value as request                                    |
| `response.id`      | integer | unique value as request                                  |
| `response.result`  | object  | Transaction object, or null if no transaction was found  |
! table end

! table style1
| Key                   | Type   | Description                                                                                    |
| --------------------- | ------ | ---------------------------------------------------------------------------------------------- |
|                    | object | block information                                                                              |
| `hash`             | string | 32-byte transaction hash                                                                       |
| `nonce`            | string | Number of transactions sent by the sender prior to this one                                    |
| `blockHash`        | string | 32-byte block hash, or null if pending                                                         |
| `blockNumber`      | string | Block number, or null if pending                                                               |
| `transactionIndex` | string | Integer index position in the block, or null if pending                                        |
| `from`             | string | 20-byte address of the sender                                                                  |
| `to`               | string | 20-byte address of the recipient, or null for contract creation                                |
| `value`            | string | Value transferred in wei                                                                       |
| `gasPrice`         | string | Gas price in wei                                                                               |
| `gas`              | string | Gas provided for transaction execution                                                         |
| `input`            | string | Contract code or encoded function call data                                                    |
| `v`                | string | ECDSA recovery ID                                                                              |
| `r`                | string | ECDSA signature r                                                                              |
| `s`                | string | ECDSA signature s                                                                              |
| `pod_metadata`     | object | Additional pod-specific information                                                            |
! table end

! content end

! content

! sticky

! codeblock title="POST rpc.v2.pod.network" runCode={play}

```rust alias="rust"
use reqwest::Client;
use serde_json::{json, Value};

async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let tx = pod_provider
        .get_transaction_by_hash(
            b256!("0xf74e07ff80dc54c7e894396954326fe13f07d176746a6a29d0ea34922b856402"),
        )
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
        "method": "eth_getTransactionByHash",
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
		method: 'eth_getTransactionByHash',
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
