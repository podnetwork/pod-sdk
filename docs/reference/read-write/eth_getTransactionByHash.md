<script>
    async function play() {
        return fetch('https://rpc.dev.pod.network/', {
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

! lang-tab

## Get Transaction by Hash

Returns information about a transaction by its hash.

### Parameters

! lang-content lang="rust"
! content
| Parameter  | Type   | Description              |
| ---------- | ------ | ------------------------ |
| `hash` | TxHash | 32-byte transaction hash |
! content end
! lang-content end

! lang-content lang="js"
! content
| Parameter  | Type   | Description              |
| ---------- | ------ | ------------------------ |
| `string 1` | string | 32-byte transaction hash |
! content end
! lang-content end

! lang-content lang="bash"
! content
| Parameter  | Type   | Description              |
| ---------- | ------ | ------------------------ |
| `string 1` | string | 32-byte transaction hash |
! content end
! lang-content end

### Response

! lang-content lang="rust"
! content
| Key                | Type    | Description             |
| ------------------ | ------- | ----------------------- |
| `result`           | Transaction  | Transaction object   |
! content end
! lang-content end

! lang-content lang="js"
! content
| Key                | Type    | Description                                              |
| ------------------ | ------- | -------------------------------------------------------- |
| `statusCode`       | integer | HTTP status code                                         |
| `response.jsonrpc` | string  | same value as request                                    |
| `response.id`      | integer | unique value as request                                  |
| `response.result`  | object  | Transaction object, or null if no transaction was found  |

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
! content end
! lang-content end

! lang-content lang="bash"
! content
| Key                | Type    | Description                                              |
| ------------------ | ------- | -------------------------------------------------------- |
| `statusCode`       | integer | HTTP status code                                         |
| `response.jsonrpc` | string  | same value as request                                    |
| `response.id`      | integer | unique value as request                                  |
| `response.result`  | object  | Transaction object, or null if no transaction was found  |

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
curl -X POST https://rpc.dev.pod.network \
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
await fetch('https://rpc.dev.pod.network/', {
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

! lang-content lang="rust"
! codeblock
```rust
Some(Transaction { inner: Legacy(Signed { tx: TxLegacy { chain_id: Some(1293), nonce: 0, gas_price: 1000000000, gas_limit: 21000, to: Call(0x1c4f61a4e4e6a42e7b84879580e0258b81194296), value: 1000000, input: 0x }, signature: PrimitiveSignature { y_parity: true, r: 6976401090730885875604575194427001793950962070345150447602876410963200747708, s: 24756735026488328969341560206409118278232302881014592081133610032490834567686 }, hash: 0xf2ec053c0c05bcd203c09a57caec97e86699a6c4b27883693feae952aaf5eae3 }), block_hash: Some(0x0000000000000000000000000000000000000000000000000000000000000000), block_number: Some(1), transaction_index: Some(1), effective_gas_price: Some(1000000000), from: 0xe5f74ed2222bf567e3c85037e1b38c67e094f9b9 })
```
! codeblock end
! lang-content end

! lang-content lang="js"
! codeblock
```json
{
	"jsonrpc": "2.0",
	"result": {},
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
	"result": {},
	"id": 1
}
```
! codeblock end
! lang-content end

! sticky end

! content end
