! content id="eth_subscribe_logs"

! lang-tab

## Subscribe Logs

Creates a subscription for logs. This endpoint streams the new events, for historical logs use the other endpoints eth_getLogs. Each subscription type has different parameter requirements.

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
| `[0]`     | string | Subscription type (required): `logs`                                                                        |
| `[1]`     | object | Parameters object (varies by subscription type)                                                             |
! content end
! lang-content end

! lang-content lang="bash"
! content
| Parameter | Type   | Description                                                                                                 |
| --------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| `[0]`     | string | Subscription type (required): `logs`                                                                        |
| `[1]`     | object | Parameters object (varies by subscription type)                                                             |
! content end
! lang-content end



### Subscription Types and Parameters:



! lang-content lang="rust"
! content
```rust
let account = Address::from_str("0xbabebabebabe0000000000000000000000000000")?;
let topic = U256::from_str(&account.to_string())?;
let filter = Filter::new().address(contract_address).topic2(topic);
```
! content end
! lang-content end

! lang-content lang="js"
! content
```json
{
	"address": "0x1234567890123456789012345678901234567890",
	"topics": ["0x71a5674c44b823bc0df08201dfeb2e8bdf698cd684fd2bbaa79adcf2c99fc186"],
	"fromBlock": "0x1",
	"toBlock": "latest",
	"minAttestations": 3
}
```
! content end
! lang-content end

! lang-content lang="bash"
! content
```json
{
	"address": "0x1234567890123456789012345678901234567890",
	"topics": ["0x71a5674c44b823bc0df08201dfeb2e8bdf698cd684fd2bbaa79adcf2c99fc186"],
	"fromBlock": "0x1",
	"toBlock": "latest",
	"minAttestations": 3
}
```
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
        params: [
    				'logs',
    				{
    					address: '0x1234567890123456789012345678901234567890',
    					topics: ['0x71a5674c44b823bc0df08201dfeb2e8bdf698cd684fd2bbaa79adcf2c99fc186'],
    					fromBlock: '0x1',
    					toBlock: 'latest'
    				}
    			]
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

! sticky end

! content end

! content

### Subscription Messages

Each subscription type returns different data in its subscription messages.

! content end

! content

! sticky

! codeblock title="Example sub"

! lang-content lang="rust"
! content
```rust
[
   "MetadataWrappedItem"{
      "inner":"Log"{
         "inner":"Log"{
            "address":0x4cf3f1637bfef1534e56352b6ebaae243af464c3,
            "data":"LogData"{
               "topics":[
                  0xed6e6fdf99cd5e97145c7e59ade93923be1979557a77e639ed95a203c7a8e861,
                  0x8ceaf286a47379747b8d5afc8eb3f4a835aeb071ddb474375f0e450d59aeb429,
                  0x00000000000000000000000045d6b2f75d260f8d1a374ac05ff6c5f18d20b01f
               ],
               "data":0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000717b227469746c65223a225465737420506f7374207769746820457861637420476173222c22636f6e74656e74223a2254657374696e6720636f6e74726163742063616c6c20776974682065786163742066756e6473222c22637265617465644174223a313732353030303030303030307d000000000000000000000000000000
            }
         },
         "block_hash":Some(0x0000000000000000000000000000000000000000000000000000000000000000),
         "block_number":Some(0),
         "block_timestamp":Some(1747904645),
         "transaction_hash":Some(0x580dce63e15644c63e3990c2259bffdc3a9e0720e15db0c51c5cf9ea77b0e848),
         "transaction_index":Some(0),
         "log_index":Some(0),
         "removed":false
      },
      "pod_metadata":"PodLogMetadata"{
         "attestations":[
            "TimestampedHeadlessAttestation"{
               "timestamp":Timestamp(1747904645194243),
               "public_key":AddressECDSA(0x7d5761b7b49fc7bfdd499e3ae908a4acfe0807e6),
               "signature":SignatureECDSA(ac9be38323d88ad8b72d9654fd795fe2807e2f2adac921721ce25e2d24fb3b274a2b68926adb74f5e4874183a393138b571123616bce02295c3efa011cac000b1c)
            },
            "TimestampedHeadlessAttestation"{
               "timestamp":Timestamp(1747904645194208),
               "public_key":AddressECDSA(0xd64c0a2a1bae8390f4b79076ceae7b377b5761a3),
               "signature":SignatureECDSA(761f4d570e3fc1a31862370f465bfde6a7bed9633e00621692b17f9706b44ca43ecc016d97bce2679e735ec8f114871f228119b6a97891532d1f143d89d9427b1c)
            },
            "TimestampedHeadlessAttestation"{
               "timestamp":Timestamp(1747904645194346),
               "public_key":AddressECDSA(0x06ad294f74dc98be290e03797e745cf0d9c03da2),
               "signature":SignatureECDSA(d32e73c69e49d90fd21d56471deabd030d5aed7bf2a39b790f3cbd3bbe02b113239c44c92968b7af8badeb87ce38afc52bce2be412a4b630bc0363de36d343731b)
            },
            "TimestampedHeadlessAttestation"{
               "timestamp":Timestamp(1747904645193980),
               "public_key":AddressECDSA(0x8646d958225301a00a6cb7b6609fa23bab87da7c),
               "signature":SignatureECDSA(1c2263212163167988f126e5e22b0eed50af2561e1c3b7fc838a1ffec10ed0a449f903ac994d1bb9c15e0cf67cae3caa3256753993222f8ccc15434e3f52b68a1b)
            }
         ],
         "receipt":"Receipt"{
            "status":true,
            "actual_gas_used":72943,
            "logs":[
               "Log"{
                  "address":0x4cf3f1637bfef1534e56352b6ebaae243af464c3,
                  "data":"LogData"{
                     "topics":[
                        0xed6e6fdf99cd5e97145c7e59ade93923be1979557a77e639ed95a203c7a8e861,
                        0x8ceaf286a47379747b8d5afc8eb3f4a835aeb071ddb474375f0e450d59aeb429,
                        0x00000000000000000000000045d6b2f75d260f8d1a374ac05ff6c5f18d20b01f
                     ],
                     "data":0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000717b227469746c65223a225465737420506f7374207769746820457861637420476173222c22636f6e74656e74223a2254657374696e6720636f6e74726163742063616c6c20776974682065786163742066756e6473222c22637265617465644174223a313732353030303030303030307d000000000000000000000000000000
                  }
               }
            ],
            "logs_root":0x5f0f8029d888373b24b3543b4cc37143961770c20f753e026cd54e1a6c0492e6,
            "tx":"Signed"{
               "signed":"TxLegacy"{
                  "chain_id":Some(1293),
                  "nonce":0,
                  "gas_price":1000000000,
                  "gas_limit":72943,
                  "to":Call(0x4cf3f1637bfef1534e56352b6ebaae243af464c3),
                  "value":0,
                  "input":0xdfbaa2fb000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000717b227469746c65223a225465737420506f7374207769746820457861637420476173222c22636f6e74656e74223a2254657374696e6720636f6e74726163742063616c6c20776974682065786163742066756e6473222c22637265617465644174223a313732353030303030303030307d000000000000000000000000000000
               },
               "signature":"PrimitiveSignature"{
                  "y_parity":true,
                  "r":56763389657353304422166881749384798948604480141505526760079464105140389284767,
                  "s":25976622952547024465840204005188821148002320847533035480551040625899498850022
               },
               "signer":0x45d6b2f75d260f8d1a374ac05ff6c5f18d20b01f,
               "_private":"()"
            },
            "contract_address":"None"
         }
      }
   }
]
```
! content end
! lang-content end

! lang-content lang="js"
! content
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
! content end
! lang-content end

! lang-content lang="bash"
! content
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
! content end
! lang-content end

! codeblock end

! sticky end

! content end

! content

### Error Handling

! lang-content lang="rust"
! content
| Error Variant           | Description                                                                 |
|-------------------------|-----------------------------------------------------------------------------|
| `MissingBatchResponse(Id)` | Response for a batch request is missing; includes the missing request ID     |
| `BackendGone`           | The backend connection task has stopped                                     |
| `PubsubUnavailable`     | The provider does not support pubsub (e.g., HTTP instead of WebSocket)      |
| `HttpError(HttpError)`  | Underlying HTTP error during transport (e.g., timeout, status code error)   |
| `Custom(Box<dyn Error>)`| A custom transport-layer error                                               |
! content end
! lang-content end

! lang-content lang="json"
! content
| Error Code | Message                             | Description                                              |
| ---------- | ----------------------------------- | -------------------------------------------------------- |
| -32602     | Invalid subscription type           | The requested subscription type is not supported         |
| -32602     | Invalid parameters for subscription | The parameters provided for the subscription are invalid |
| -32602     | Missing required parameters         | Required parameters for the subscription are missing     |
! content end
! lang-content end

! lang-content lang="bash"
! content
| Error Code | Message                             | Description                                              |
| ---------- | ----------------------------------- | -------------------------------------------------------- |
| -32602     | Invalid subscription type           | The requested subscription type is not supported         |
| -32602     | Invalid parameters for subscription | The parameters provided for the subscription are invalid |
| -32602     | Missing required parameters         | Required parameters for the subscription are missing     |
! content end
! lang-content end

! content end

! content

! sticky

! codeblock title="Example request"

```json
{
	"jsonrpc": "2.0",
	"error": {
		"code": -32602,
		"message": "invalid parameters, expected [\"eth_getLogs\", {\"address\": <address>, \"since\": <since>}]"
	},
	"id": 1
}
```

! codeblock end

! sticky end

! content end
