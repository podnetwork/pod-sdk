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
                method: 'eth_getBlockByHash',
                params: ['0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', false],
                id: 1
            })
        });
    }
</script>

! content id="eth_getBlockByHash"

## Get Block by Hash

Returns information about a block by its hash. Returns an empty block structure for compatibility.

### Parameters

| Parameter   | Type    | Description                                                                     |
| ----------- | ------- | ------------------------------------------------------------------------------- |
| `element 1` | string  | Block hash                                                                      |
| `element 2` | boolean | If true, returns full transaction objects; if false, returns transaction hashes |

### Response

| Key                | Type    | Description             |
| ------------------ | ------- | ----------------------- |
| `statusCode`       | integer | HTTP status code        |
| `response.jsonrpc` | string  | same value as request   |
| `response.id`      | integer | unique value as request |
| `response.result`  | object  | block information       |

| Key                       | Type   | Description                                                          |
| ------------------------- | ------ | -------------------------------------------------------------------- |
| `result`                  | object | block information                                                    |
| `result.number`           | string | 0                                                                    |
| `result.mixHash`          | string | `0x0` followed by 64 zeros                                           |
| `result.hash`             | string | Requested block hash                                                 |
| `result.parentHash`       | string | `0x0` followed by 64 zeros                                           |
| `result.nonce`            | string | `0x0000000000000000`                                                 |
| `result.sha3Uncles`       | string | `0x0` followed by 64 zeros                                           |
| `result.logsBloom`        | string | `0x0` followed by 256 zeros                                          |
| `result.transactionsRoot` | string | `0x0` followed by 64 zeros                                           |
| `result.stateRoot`        | string | `0x0` followed by 64 zeros                                           |
| `result.receiptsRoot`     | string | `0x0` followed by 64 zeros                                           |
| `result.miner`            | string | `0x0` followed by 40 zeros                                           |
| `result.difficulty`       | string | `0x0000000000000000`                                                 |
| `result.extraData`        | string | `0x0` followed by 40 zeros                                           |
| `result.size`             | string | `0x0`                                                                |
| `result.gasLimit`         | string | `0x0`                                                                |
| `result.gasUsed`          | string | `0x0`                                                                |
| `result.timestamp`        | string | `0x0`                                                                |
| `result.transactions`     | array  | Empty array                                                          |
| `result.uncles`           | array  | Empty array                                                          |

! content end

! content

! sticky

! codeblock title="POST rpc.v2.pod.network" runCode={play}

```rust alias="rust"
use reqwest::Client;
use serde_json::{json, Value};

async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let block = pod_provider
            .get_block_by_hash(
                b256!("0x000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045"),
                BlockTransactionsKind::Full,
            )
            .await?;
    println!("{}", block);

    Ok(())
}
```

```bash alias="curl"
curl -X POST https://rpc.v2.pod.network \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "method": "eth_getBlockByHash",
        "params": [
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            false
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
		method: 'eth_getBlockByHash',
		params: ['0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', false],
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
