! content id="eth_subscribe"

! lang-tab

## Subscribe

Creates a subscription for specific events. This endpoint streams the new events, for historical data use the other endpoints (pod_receipts, pod_pastPerfectTime, eth_getLogs). Each subscription type has different parameter requirements.

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
| Parameter | Type   | Description                                                                                                 |
| --------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| `[0]`     | string | Subscription type (required): `logs`, `pod_receipts`, `pod_pastPerfectTime`                                  |
| `[1]`     | object | Parameters object (varies by subscription type)                                                             |
! content end
! lang-content end

! lang-content lang="bash"
! content
| Parameter | Type   | Description                                                                                                 |
| --------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| `[0]`     | string | Subscription type (required): `logs`, `pod_receipts`, `pod_pastPerfectTime`                                  |
| `[1]`     | object | Parameters object (varies by subscription type)                                                             |
! content end
! lang-content end



### Subscription Types and Parameters:

! lang-content lang="rust"
! content

! codeblock title="logs"

```rust
let account = Address::from_str("0xbabebabebabe0000000000000000000000000000")?;
let topic = U256::from_str(&account.to_string())?;
let filter = Filter::new().address(contract_address).topic2(topic);
```

! codeblock end

! codeblock title="pod_receipts"

```rust
let account = Address::from_str("0xbabebabebabe0000000000000000000000000000")?;
let since = 1687245924000000u64;
```
! codeblock end

! content end
! lang-content end

! lang-content lang="js"
! content

! codeblock title="logs"

```json
{
	"address": "0x1234567890123456789012345678901234567890",
	"topics": ["0x71a5674c44b823bc0df08201dfeb2e8bdf698cd684fd2bbaa79adcf2c99fc186"],
	"fromBlock": "0x1",
	"toBlock": "latest",
	"minAttestations": 3
}
```

! codeblock end

! codeblock title="pod_accountReceipts"

```json
{
	"address": "0x13791790Bef192d14712D627f13A55c4ABEe52a4",
	"since": 1687245924000000 // Timestamp in microseconds
}
```

! codeblock end

! codeblock title="pod_pastPerfectTime"

```bash
1687245924000000 // Timestamp in microseconds
```

! codeblock end

! content end
! lang-content end

! lang-content lang="bash"
! content

! codeblock title="logs"

```json
{
	"address": "0x1234567890123456789012345678901234567890",
	"topics": ["0x71a5674c44b823bc0df08201dfeb2e8bdf698cd684fd2bbaa79adcf2c99fc186"],
	"fromBlock": "0x1",
	"toBlock": "latest",
	"minAttestations": 3
}
```

! codeblock end

! codeblock title="pod_accountReceipts"

```json
{
	"address": "0x13791790Bef192d14712D627f13A55c4ABEe52a4",
	"since": 1687245924000000 // Timestamp in microseconds
}
```

! codeblock end

! codeblock title="pod_pastPerfectTime"

```bash
1687245924000000 // Timestamp in microseconds
```

! codeblock end

! content end
! lang-content end

### Response

! lang-content lang="rust"
! content
| Type                      | Description                                                                 |
|---------------------------|-----------------------------------------------------------------------------|
| `Subscription<VerifiableLog>` | A live stream of verifiable logs as they are emitted                     |
|                           | Each `VerifiableLog` is a `MetadataWrappedItem<Log, PodLogMetadata>`        |
| └─ `inner`                | `alloy_rpc_types_eth::Log`             | Consensus log object from Ethereum JSON-RPC |
| └─ `pod_metadata`         | `PodLogMetadata`                                                              |
|    └─ `attestations`      | `Vec<TimestampedHeadlessAttestation>` | Attestations for verifying the log        |
|       └─ `timestamp`      | `Timestamp`                         | Timestamp when the attestation was made     |
|       └─ `public_key`     | `AddressECDSA`                      | Public key of the attestor                  |
|       └─ `signature`      | `SignatureECDSA`                    | Signature over the attested log             |
|    └─ `receipt`           | `Receipt`                                                                    |
|       └─ `status`         | `bool`                              | Whether the transaction succeeded           |
|       └─ `actual_gas_used`| `u64`                               | Actual gas used by the transaction          |
|       └─ `logs`           | `Vec<Log>`                          | Logs emitted by the transaction             |
|       └─ `logs_root`      | `Hash`                              | Logs root of the transaction receipt        |
|       └─ `tx`             | `Signed<Transaction>`              | Signed transaction data                     |
|       └─ `contract_address`| `Option<Address>`                  | Contract address created (if any)           |
! content end
! lang-content end

! lang-content lang="js"
! content
| Type   | Description     |
| ------ | --------------- |
| string | Subscription ID |
! content end
! lang-content end

! lang-content lang="bash"
! content
| Type   | Description     |
| ------ | --------------- |
| string | Subscription ID |
! content end
! lang-content end

! content end

! content

! sticky

! codeblock title="Example request"

```rust alias="rust"
use tokio::net::TcpStream;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message, WebSocketStream, MaybeTlsStream};
use futures_util::{StreamExt, SinkExt};
use serde_json::json;

async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let committee = pod_provider.get_committee().await.unwrap();

    let address = Address::from_str("0x12296f2d128530a834460df6c36a2895b793f26d").unwrap();

    let event_signature =
        hex::decode("98b6b180756c849b5bfbbd2bbd091f3fe64b0935ac195418c0b619b9b661c78d").unwrap();
    let event_signature = U256::from_be_slice(&event_signature);
    let filter = Filter::new()
        .from_block(0)
        .event_signature(event_signature)
        .address(address);
    let mut stream = pod_provider
        .subscribe_verifiable_logs(&filter)
        .await
        .unwrap()
        .into_stream();

    println!("waiting for new logs");
    while let Some(log) = stream.next().await {
        println!("got log {:?}", log);
        if log.verify(&committee).unwrap() {
            println!("Found verified auction contract event: {log:?}");
            println!("Event merkle multi-proof: {:?}", log.generate_multi_proof())
        }
    }

    Ok(())
}
```

```bash alias="curl"
wscat -c ws://rpc.dev.pod.network \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "method": "eth_subscribe",
        "params": ["<subscription_type>", <parameters>],
        "id": 1
    }'
```

```js alias="javascript"
const socket = new WebSocket('ws://rpc.dev.pod.network');

socket.onopen = () => {
	socket.send(
		JSON.stringify({
			jsonrpc: '2.0',
			method: 'eth_subscribe',
			params: [
				'logs',
				{
					address: '0x1234567890123456789012345678901234567890',
					topics: ['0x71a5674c44b823bc0df08201dfeb2e8bdf698cd684fd2bbaa79adcf2c99fc186'],
					fromBlock: '0x1',
					toBlock: 'latest'
				}
			],
			id: 1
		})
	);
};

socket.onmessage = (event) => {
	const response = JSON.parse(event.data);
	console.log('Received:', response);
};

socket.onerror = (error) => {
	console.error('WebSocket Error:', error);
};

socket.onclose = () => {
	console.log('WebSocket connection closed');
};
```

! codeblock end

! codeblock title="Example Initial Response"

```json
{
	"jsonrpc": "2.0",
	"id": 1,
	"result": "0xcd0c3e8af590364c09d0fa6a1210faf5"
}
```

! codeblock end

! sticky end

! content end

! content

### Subscription Messages

Each subscription type returns different data in its subscription messages.

! content end

! content

! sticky

! codeblock title="logs"

```json
{
	"jsonrpc": "2.0",
	"method": "eth_subscription",
	"params": {
		"subscription": "0xcd0c3e8af590364c09d0fa6a1210faf5",
		"result": {
			"address": "0x1234567890123456789012345678901234567890",
			"topics": ["0x71a5674c44b823bc0df08201dfeb2e8bdf698cd684fd2bbaa79adcf2c99fc186"],
			"data": "0x0000000000000000000000000000000000000000000000000000000000000001",
			"pod_metadata": {
				"proof": {
					"generalized_index": "5",
					"path": [
						"0x17e9064016f07fc958206a993067e187e4f5d314191a42b92fb30a749c03836d",
						"0xa9cdde087f3cc534a93b1f728c5108c3f89b4505e07805691e40b0f6d4ffda22"
					]
				},
				"receipt_root": "0xd0180358d6fa534054f22b12235af25558bbdd2d84e26396cae1fbacdc9122bf",
				"signatures": [
					{
						"r": "0xa319f330b99ffd9ae9bf1d26dffc4643e2853d073e1100ef6aeced9b5cf0a5b4",
						"s": "0xef0980560aaa17c6c107096c494c304e30adf7f4985141ebe17e9c4e7c967bb",
						"v": "0x0",
						"yParity": "0x0"
					}
				]
			}
		}
	}
}
```

! codeblock end

! codeblock title="pod_accountReceipts and pod_confirmedReceipts"

```json
{
	"jsonrpc": "2.0",
	"method": "eth_subscription",
	"params": {
		"subscription": "0xcd0c3e8af590364c09d0fa6a1210faf5",
		"result": {
			"certified": {
				"actual_gas_used": 21000,
				"logs": [],
				"status": true,
				"tx": {
					"signature": {
						"r": "0x23feb2e5d0d64ee34aa10b4140a321452ba3306a51ce562b1fcf218d041ca8ab",
						"s": "0x7d62195ff365ec9887729675e2dbccb7c4127fe2e90717de3f61eb9f4b541d5d",
						"v": "0x1",
						"yParity": "0x1"
					},
					"signed": {
						"call_data": "",
						"gas_limit": 300000,
						"gas_price": 1,
						"nonce": 0,
						"to": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
						"value": "0xde0b6b3a7640000"
					},
					"signer": "0xb8aa43999c2b3cbb10fbe2092432f98d8f35dcd7"
				}
			},
			"signatures": [
				{
					"r": "0x52ca8bbfe8cda5060e8ebc001dbdbbf4fa2017ffc4debcfbf19df537cdb2595d",
					"s": "0x1e8ceee2a6cc129194acccb0013be717836e2ca86d33146dbac67ebfc5495019",
					"v": "0x1",
					"yParity": "0x1"
				}
			],
			"tx_hash": "0x4e5a4d444cf0614340425e18fd644d225c06514f933fa3814f4d407778c7859b"
		}
	}
}
```

! codeblock end

! codeblock title="pod_pastPerfectTime"

```json
{
	"jsonrpc": "2.0",
	"method": "eth_subscription",
	"params": {
		"subscription": "0xcd0c3e8af590364c09d0fa6a1210faf5",
		"result": "0x67505ef7"
	}
}
```

! codeblock end

! sticky end

! content end

! content

### Error Handling

| Error Code | Message                             | Description                                              |
| ---------- | ----------------------------------- | -------------------------------------------------------- |
| -32602     | Invalid subscription type           | The requested subscription type is not supported         |
| -32602     | Invalid parameters for subscription | The parameters provided for the subscription are invalid |
| -32602     | Missing required parameters         | Required parameters for the subscription are missing     |

! content end

! content

! sticky

! codeblock title="Example request"

```json
{
	"jsonrpc": "2.0",
	"error": {
		"code": -32602,
		"message": "invalid parameters, expected [\"pod_accountReceipts\", {\"address\": <address>, \"since\": <since>}]"
	},
	"id": 1
}
```

! codeblock end

! sticky end

! content end
