<script>
    async function play() {
        return fetch('https://rpc.dev.pod.network/', {
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

! lang-tab

## Get Transaction Receipt

Returns the receipt of a transaction by transaction hash.

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
| Key            | Type                                      | Description                                 |
|----------------|-------------------------------------------|---------------------------------------------|
| `receipt`      | `receipt` | Standard Ethereum transaction receipt       |
| `pod_metadata` | `PodMetadata`                             | Additional metadata for the receipt         |
|                | └─ `attestations` | `Vec<AttestationData>`               | List of attestation data                   |
|                | └─ `transaction`  | `Signed<TxLegacy>`                   | Signed transaction object                  |
|                               | └─ `signed`     | `TxLegacy`                         | The raw legacy transaction                 |
|                               | └─ `signature`  | `PrimitiveSignature`              | Signature of the transaction               |
|                               | └─ `signer`     | `Address`                        | Signer address                             |
| `AttestationData` (structure) |                                           |                                             |
| └─ `public_key`               | `AddressECDSA`                            | Public key of the attestor                 |
| └─ `signature`                | `SignatureECDSA`                          | Signature over the attested message        |
| └─ `timestamp`                | `Timestamp`                               | Time of attestation                        |
! content end
! lang-content end

! lang-content lang="rust"
! content
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
! lang-content end

! lang-content lang="rust"
! content
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
! lang-content end

! content end

! content

! sticky

! codeblock title="POST rpc.dev.pod.network" runCode={play}

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
curl -X POST https://rpc.dev.pod.network \
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
await fetch('https://rpc.dev.pod.network/', {
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

! lang-content lang="rust"
! codeblock
```rust
Some(Transaction { inner: Legacy(Signed { tx: TxLegacy { chain_id: Some(1293), nonce: 0, gas_price: 1000000000, gas_limit: 21000, to: Call(0x90f60dfc0f375c69855ff4bc2033478870dc76f4), value: 1000000, input: 0x }, signature: PrimitiveSignature { y_parity: false, r: 70351553061713098136807172705612520955809753423534234903642753712893068906931, s: 41539568276899119968257492052025091227410390983329029542388307456661501681282 }, hash: 0xd3923bcf1925e0b35a0f39b212275045c9801547cabab9afab369a2737e26cbe }), block_hash: Some(0x0000000000000000000000000000000000000000000000000000000000000000), block_number: Some(1), transaction_index: Some(1), effective_gas_price: Some(1000000000), from: 0x78392b6ca2be6389a50ec127c4fe7214bd860073 })
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
