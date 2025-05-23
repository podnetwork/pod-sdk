<script>
    async function play() {
        return fetch('https://rpc.dev.pod.network/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getLogs',
                params: [{
                    address: '0x1234567890123456789012345678901234567890',
                    topics: [
                        '0x71a5674c44b823bc0df08201dfeb2e8bdf698cd684fd2bbaa79adcf2c99fc186'
                    ],
                    fromBlock: '0x1',
                    toBlock: 'latest'
                }],
                id: 1
            })
        });
    }
</script>

! content id="eth_getLogs"

! lang-tab

## Get Logs

Returns an array of event logs matching the given filter criteria.

### Parameters

! lang-content lang="rust"
! content
| Parameter | Type                        | Description                                                                 |
|-----------|-----------------------------|-----------------------------------------------------------------------------|
| `filter`  | `&Filter`                   | Filter criteria for selecting logs. Includes block range, address, and topics. |
|           | └─ `block_option` | `FilterBlockOption`        | Block range or tag to apply the filter (see [EIP-234](https://eips.ethereum.org/EIPS/eip-234)) |
|           | └─ `address`      | `FilterSet<Address>`        | One or more addresses to filter logs by                                      |
|           | └─ `topics`       | `[Topic; 4]`                | Array of up to 4 optional topics to match against log entries                |
! content end
! lang-content end

! lang-content lang="js"
! content
| Parameter                 | Type   | Description                                                                                                                      |
| ------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `fromBlock`            | string | (optional) From block timestamp specified in seconds in hexadecimal format. Can also be the tags: earliest, finalized or latest. |
| `toBlock`              | string | (optional) To block timestamp specified in seconds in hexadecimal format. Can also be the tags: earliest, finalized or latest.   |
| `address`              | string | (optional) Contract address                                                                                                      |
| `topics`               | array  | (optional) Array of topic filters (up to 4 topics):                                                                              |
|                           |        | - Each topic can be either a string or null                                                                                      |
|                           |        | - Topics are ordered and must match in sequence                                                                                  |
|                           |        | - Null values match any topic                                                                                                    |
| `minimum_attestations` | number | (optional) Minimum number of attestations required for the log to be returned                                                    |
! content end
! lang-content end

! lang-content lang="bash"
! content
| Parameter                 | Type   | Description                                                                                                                      |
| ------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `fromBlock`            | string | (optional) From block timestamp specified in seconds in hexadecimal format. Can also be the tags: earliest, finalized or latest. |
| `toBlock`              | string | (optional) To block timestamp specified in seconds in hexadecimal format. Can also be the tags: earliest, finalized or latest.   |
| `address`              | string | (optional) Contract address                                                                                                      |
| `topics`               | array  | (optional) Array of topic filters (up to 4 topics):                                                                              |
|                           |        | - Each topic can be either a string or null                                                                                      |
|                           |        | - Topics are ordered and must match in sequence                                                                                  |
|                           |        | - Null values match any topic                                                                                                    |
| `minimum_attestations` | number | (optional) Minimum number of attestations required for the log to be returned                                                    |
! content end
! lang-content end

### Response

! lang-content lang="rust"
! content
| Type                | Description                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| `Vec<VerifiableLog>`| A list of log entries with associated attestation metadata                  |
|                     | Each `VerifiableLog` is a `MetadataWrappedItem<Log, PodLogMetadata>`        |
| └─ `inner`          | `Log`                                                                       |
|    └─ `inner`       | `alloy_primitives::Log<T>`                                                  |
|    └─ `block_hash`  | `Option<BlockHash>`         | Hash of the block the log was included in         |
|    └─ `block_number`| `Option<u64>`              | Number of the block the log was included in       |
|    └─ `block_timestamp`| `Option<u64>`           | Timestamp of the block                            |
|    └─ `transaction_hash`| `Option<TxHash>`       | Hash of the transaction that emitted the log      |
|    └─ `transaction_index`| `Option<u64>`         | Index of the transaction within the block         |
|    └─ `log_index`   | `Option<u64>`              | Index of the log entry within the block           |
|    └─ `removed`     | `bool`                     | Whether this log was removed (Geth compatibility) |
| └─ `pod_metadata`   | `PodLogMetadata`                                                           |
|    └─ `attestations`| `Vec<TimestampedHeadlessAttestation>` | Attestations for log verification         |
|       └─ `timestamp`| `Timestamp`               | Timestamp of the attestation                      |
|       └─ `public_key`| `AddressECDSA`           | Public key of the attestor                        |
|       └─ `signature`| `SignatureECDSA`          | Signature over the attested message               |
|    └─ `receipt`     | `Receipt`                                                                 |
|       └─ `status`   | `bool`                    | Status of the transaction                         |
|       └─ `actual_gas_used` | `u64`              | Gas used by the transaction                       |
|       └─ `logs`     | `Vec<Log>`                | Logs emitted during transaction execution         |
|       └─ `logs_root`| `Hash`                    | Logs root of the receipt                          |
|       └─ `tx`       | `Signed<Transaction>`     | Signed transaction data                           |
|       └─ `contract_address` | `Option<Address>` | Contract address created (if applicable)          |
! content end
! lang-content end

! lang-content lang="js"
! content
| Key                | Type    | Description             |
| ------------------ | ------- | ----------------------- |
| `statusCode`       | integer | HTTP status code        |
| `response.jsonrpc` | string  | same value as request   |
| `response.id`      | integer | unique value as request |
| `response.result`  | array   | Array of log objects    |

| Key                   | Type   | Description                                                                                    |
| --------------------- | ------ | ---------------------------------------------------------------------------------------------- |
|                   | object | block information                                                                              |
| `address`          | string | Address from which this log originated                                                         |
| `blockNumber`      | string | Block number in hexadecimal format, supported for completeness, the block number returned is 1 |
| `blockHash`        | string | Block hash. Supported for completeness, the block hash returned is the 0 hash                  |
| `transactionHash`  | string | Transaction hash                                                                               |
| `transactionIndex` | string | Transaction index                                                                              |
| `logIndex`         | string | Log index                                                                                      |
| `topics`           | array  | Array of indexed log parameters                                                                |
| `data`             | string | Contains non-indexed log parameters                                                            |
| `pod_metadata`     | object | Additional pod-specific information including attestations                                     |
! content end
! lang-content end

! lang-content lang="bash"
! content
| Key                | Type    | Description             |
| ------------------ | ------- | ----------------------- |
| `statusCode`       | integer | HTTP status code        |
| `response.jsonrpc` | string  | same value as request   |
| `response.id`      | integer | unique value as request |
| `response.result`  | array   | Array of log objects    |

| Key                   | Type   | Description                                                                                    |
| --------------------- | ------ | ---------------------------------------------------------------------------------------------- |
|                   | object | block information                                                                              |
| `address`          | string | Address from which this log originated                                                         |
| `blockNumber`      | string | Block number in hexadecimal format, supported for completeness, the block number returned is 1 |
| `blockHash`        | string | Block hash. Supported for completeness, the block hash returned is the 0 hash                  |
| `transactionHash`  | string | Transaction hash                                                                               |
| `transactionIndex` | string | Transaction index                                                                              |
| `logIndex`         | string | Log index                                                                                      |
| `topics`           | array  | Array of indexed log parameters                                                                |
| `data`             | string | Contains non-indexed log parameters                                                            |
| `pod_metadata`     | object | Additional pod-specific information including attestations                                     |
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
    let topic = U256::from_str(
            &"0x71a5674c44b823bc0df08201dfeb2e8bdf698cd684fd2bbaa79adcf2c99fc186".to_string(),
        )?;

    let filter = Filter::new()
        .address(Address::from_str(
            "0x1234567890123456789012345678901234567890",
        )?)
        .topic2(topic);

    let verifiable_logs = pod_provider.get_verifiable_logs(&filter).await?;
    println!("{:?}", verifiable_logs);

    for v_log in &verifiable_logs {
        let is_valid = v_log.verify(&committee)?;
        println!("{:?}", is_valid);
    }

    Ok(())
}
```

```bash alias="curl"
curl -X POST https://rpc.dev.pod.network \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "method": "eth_getLogs",
        "params": [{
            "address": "0x1234567890123456789012345678901234567890",
            "topics": [
                "0x71a5674c44b823bc0df08201dfeb2e8bdf698cd684fd2bbaa79adcf2c99fc186"
            ],
            "fromBlock": "0x1",
            "toBlock": "latest"
        }],
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
		method: 'eth_getLogs',
		params: [
			{
				address: '0x1234567890123456789012345678901234567890',
				topics: ['0x71a5674c44b823bc0df08201dfeb2e8bdf698cd684fd2bbaa79adcf2c99fc186'],
				fromBlock: '0x1',
				toBlock: 'latest'
			}
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
[MetadataWrappedItem { inner: Log { inner: Log { address: 0x4cf3f1637bfef1534e56352b6ebaae243af464c3, data: LogData { topics: [0xed6e6fdf99cd5e97145c7e59ade93923be1979557a77e639ed95a203c7a8e861, 0x8ceaf286a47379747b8d5afc8eb3f4a835aeb071ddb474375f0e450d59aeb429, 0x00000000000000000000000045d6b2f75d260f8d1a374ac05ff6c5f18d20b01f], data: 0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000717b227469746c65223a225465737420506f7374207769746820457861637420476173222c22636f6e74656e74223a2254657374696e6720636f6e74726163742063616c6c20776974682065786163742066756e6473222c22637265617465644174223a313732353030303030303030307d000000000000000000000000000000 } }, block_hash: Some(0x0000000000000000000000000000000000000000000000000000000000000000), block_number: Some(0), block_timestamp: Some(1747904645), transaction_hash: Some(0x580dce63e15644c63e3990c2259bffdc3a9e0720e15db0c51c5cf9ea77b0e848), transaction_index: Some(0), log_index: Some(0), removed: false }, pod_metadata: PodLogMetadata { attestations: [TimestampedHeadlessAttestation { timestamp: Timestamp(1747904645194243), public_key: AddressECDSA(0x7d5761b7b49fc7bfdd499e3ae908a4acfe0807e6), signature: SignatureECDSA(ac9be38323d88ad8b72d9654fd795fe2807e2f2adac921721ce25e2d24fb3b274a2b68926adb74f5e4874183a393138b571123616bce02295c3efa011cac000b1c) }, TimestampedHeadlessAttestation { timestamp: Timestamp(1747904645194208), public_key: AddressECDSA(0xd64c0a2a1bae8390f4b79076ceae7b377b5761a3), signature: SignatureECDSA(761f4d570e3fc1a31862370f465bfde6a7bed9633e00621692b17f9706b44ca43ecc016d97bce2679e735ec8f114871f228119b6a97891532d1f143d89d9427b1c) }, TimestampedHeadlessAttestation { timestamp: Timestamp(1747904645194346), public_key: AddressECDSA(0x06ad294f74dc98be290e03797e745cf0d9c03da2), signature: SignatureECDSA(d32e73c69e49d90fd21d56471deabd030d5aed7bf2a39b790f3cbd3bbe02b113239c44c92968b7af8badeb87ce38afc52bce2be412a4b630bc0363de36d343731b) }, TimestampedHeadlessAttestation { timestamp: Timestamp(1747904645193980), public_key: AddressECDSA(0x8646d958225301a00a6cb7b6609fa23bab87da7c), signature: SignatureECDSA(1c2263212163167988f126e5e22b0eed50af2561e1c3b7fc838a1ffec10ed0a449f903ac994d1bb9c15e0cf67cae3caa3256753993222f8ccc15434e3f52b68a1b) }], receipt: Receipt { status: true, actual_gas_used: 72943, logs: [Log { address: 0x4cf3f1637bfef1534e56352b6ebaae243af464c3, data: LogData { topics: [0xed6e6fdf99cd5e97145c7e59ade93923be1979557a77e639ed95a203c7a8e861, 0x8ceaf286a47379747b8d5afc8eb3f4a835aeb071ddb474375f0e450d59aeb429, 0x00000000000000000000000045d6b2f75d260f8d1a374ac05ff6c5f18d20b01f], data: 0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000717b227469746c65223a225465737420506f7374207769746820457861637420476173222c22636f6e74656e74223a2254657374696e6720636f6e74726163742063616c6c20776974682065786163742066756e6473222c22637265617465644174223a313732353030303030303030307d000000000000000000000000000000 } }], logs_root: 0x5f0f8029d888373b24b3543b4cc37143961770c20f753e026cd54e1a6c0492e6, tx: Signed { signed: TxLegacy { chain_id: Some(1293), nonce: 0, gas_price: 1000000000, gas_limit: 72943, to: Call(0x4cf3f1637bfef1534e56352b6ebaae243af464c3), value: 0, input: 0xdfbaa2fb000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000717b227469746c65223a225465737420506f7374207769746820457861637420476173222c22636f6e74656e74223a2254657374696e6720636f6e74726163742063616c6c20776974682065786163742066756e6473222c22637265617465644174223a313732353030303030303030307d000000000000000000000000000000 }, signature: PrimitiveSignature { y_parity: true, r: 56763389657353304422166881749384798948604480141505526760079464105140389284767, s: 25976622952547024465840204005188821148002320847533035480551040625899498850022 }, signer: 0x45d6b2f75d260f8d1a374ac05ff6c5f18d20b01f, _private: () }, contract_address: None } } }]
```
! codeblock end
! lang-content end

! lang-content lang="js"
! codeblock
```json
{
	"jsonrpc": "2.0",
	"result": [],
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
	"result": [],
	"id": 1
}
```
! codeblock end
! lang-content end

! sticky end

! content end
