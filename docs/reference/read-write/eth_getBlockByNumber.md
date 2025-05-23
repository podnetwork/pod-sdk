<script>
    async function play() {
        return await fetch('https://rpc.dev.pod.network/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getBlockByNumber',
                params: ['0x1', false],
                id: 1
            })
        });
    }
</script>

! content id="eth_getBlockByNumber"

## Get Block by Number

Returns information about a block by its number. Returns an empty block structure for compatibility.

! lang-tab

### Parameters

! lang-content lang="rust"
! content
| Name                | Type    | Description             |
| ------------------ | ------- | ----------------------- |
| `number`  | BlockNumberOrTag  | block Number (or tag - "latest", "earliest", "pending")      |
| `kind`  | BlockTransactionsKind  | Determines how the transactions field of block should be filled    |
! content end
! lang-content end

! lang-content lang="js"
! content
| Parameter   | Type    | Description                                                                     |
| ----------- | ------- | ------------------------------------------------------------------------------- |
| `element 1` | string  | Block number in hexadecimal format                                              |
| `element 2` | boolean | If true, returns full transaction objects; if false, returns transaction hashes |
! content end
! lang-content end

! lang-content lang="bash"
! content
| Parameter   | Type    | Description                                                                     |
| ----------- | ------- | ------------------------------------------------------------------------------- |
| `element 1` | string  | Block number in hexadecimal format                                              |
| `element 2` | boolean | If true, returns full transaction objects; if false, returns transaction hashes |
! content end
! lang-content end

### Response

! lang-content lang="rust"
! content
| Key                | Type    | Description             |
| ------------------ | ------- | ----------------------- |
| `result`  | Block  | Block information   |
! content end
! lang-content end

! lang-content lang="js"
! content
| Key                | Type    | Description             |
| ------------------ | ------- | ----------------------- |
| `statusCode`       | integer | HTTP status code        |
| `response.jsonrpc` | string  | same value as request   |
| `response.id`      | integer | unique value as request |
| `response.result`  | object  | block information       |

| Key                       | Type   | Description                                                          |
| ------------------------- | ------ | -------------------------------------------------------------------- |
| `result`                  | object | block information                                                    |
| `result.number`           | string | Requested block number                                               |
| `result.mixHash`          | string | `0x0` followed by 64 zeros                                           |
| `result.hash`             | string | `0x0` followed by 64 zeros                                           |
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
! lang-content end

! lang-content lang="bash"
! content
| Key                | Type    | Description             |
| ------------------ | ------- | ----------------------- |
| `statusCode`       | integer | HTTP status code        |
| `response.jsonrpc` | string  | same value as request   |
| `response.id`      | integer | unique value as request |
| `response.result`  | object  | block information       |

| Key                       | Type   | Description                                                          |
| ------------------------- | ------ | -------------------------------------------------------------------- |
| `result`                  | object | block information                                                    |
| `result.number`           | string | Requested block number                                               |
| `result.mixHash`          | string | `0x0` followed by 64 zeros                                           |
| `result.hash`             | string | `0x0` followed by 64 zeros                                           |
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
! lang-content end


! content end

! content

! sticky

! codeblock title="POST rpc.dev.pod.network" runCode={play}

```rust alias="rust"
use reqwest::Client;
use serde_json::{json, Value};

async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let block = pod_provider
        .get_block_by_number(
            BlockNumberOrTag::Number(1),
            BlockTransactionsKind::Full,
        )
        .await?;
    println!("{}", block);

    Ok(())
}
```

```bash alias="curl"
curl -X POST https://rpc.dev.pod.network \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "method": "eth_getBlockByNumber",
        "params": [
            "0x1",
            false
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
		method: 'eth_getBlockByNumber',
		params: ['0x1', false],
		id: 1
	})
});
```

! codeblock end

Example Response:

! lang-content lang="rust"
! codeblock
```rust
Some(Block { header: Header { hash: 0x000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045, inner: Header { parent_hash: 0x0000000000000000000000000000000000000000000000000000000000000000, ommers_hash: 0x0000000000000000000000000000000000000000000000000000000000000000, beneficiary: 0x0000000000000000000000000000000000000000, state_root: 0x0000000000000000000000000000000000000000000000000000000000000000, transactions_root: 0x0000000000000000000000000000000000000000000000000000000000000000, receipts_root: 0x0000000000000000000000000000000000000000000000000000000000000000, logs_bloom: 0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000, difficulty: 0, number: 0, gas_limit: 0, gas_used: 0, timestamp: 0, extra_data: 0x0000000000000000000000000000000000000000, mix_hash: 0x0000000000000000000000000000000000000000000000000000000000000000, nonce: 0x0000000000000000, base_fee_per_gas: None, withdrawals_root: None, blob_gas_used: None, excess_blob_gas: None, parent_beacon_block_root: None, requests_hash: None }, total_difficulty: None, size: Some(0) }, uncles: [], transactions: Full([]), withdrawals: None })
```
! codeblock end
! lang-content end

! lang-content lang="js"
! codeblock
```json
{
  "statusCode": 200,
  "response": {
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
      "difficulty": "0x0000000000000000",
      "extraData": "0x0000000000000000000000000000000000000000",
      "gasLimit": "0x0",
      "gasUsed": "0x0",
      "hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      "miner": "0x0000000000000000000000000000000000000000",
      "mixHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "nonce": "0x0000000000000000",
      "number": "0",
      "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "receiptsRoot": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "sha3Uncles": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "size": "0x0",
      "stateRoot": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "timestamp": "0x0",
      "transactions": [],
      "transactionsRoot": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "uncles": []
    }
  }
}
```
! codeblock end
! lang-content end

! lang-content lang="bash"
! codeblock
```json
{
  "statusCode": 200,
  "response": {
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
      "difficulty": "0x0000000000000000",
      "extraData": "0x0000000000000000000000000000000000000000",
      "gasLimit": "0x0",
      "gasUsed": "0x0",
      "hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      "miner": "0x0000000000000000000000000000000000000000",
      "mixHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "nonce": "0x0000000000000000",
      "number": "0",
      "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "receiptsRoot": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "sha3Uncles": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "size": "0x0",
      "stateRoot": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "timestamp": "0x0",
      "transactions": [],
      "transactionsRoot": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "uncles": []
    }
  }
}
```
! codeblock end
! lang-content end

! sticky end

! content end
