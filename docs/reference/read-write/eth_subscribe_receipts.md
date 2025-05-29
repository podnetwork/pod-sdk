! content id="eth_subscribe_receipts"

! lang-tab

## Subscribe Receipts

Creates a subscription for receipts. This endpoint streams the new events, for historical receipts use the other endpoint pod_receipts.

### Parameters

! lang-content lang="rust"
! content
| Parameter | Type              | Description                                                        |
|-----------|-------------------|--------------------------------------------------------------------|
| `address` | `Option<Address>` | Optional filter: only receive receipts related to this address     |
| `since`   | `Timestamp`       | Start streaming from this timestamp onward                         |
! content end
! lang-content end

! lang-content lang="js"
! content
| Parameter | Type   | Description                                                                                                 |
| --------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| `[0]`     | string | Subscription type (required): `pod_receipts`                                                                        |
| `[1]`     | object | Parameters object (varies by subscription type)                                                             |
! content end
! lang-content end

! lang-content lang="bash"
! content
| Parameter | Type   | Description                                                                                                 |
| --------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| `[0]`     | string | Subscription type (required): `pod_receipts`                                                                        |
| `[1]`     | object | Parameters object (varies by subscription type)                                                             |
! content end
! lang-content end



### Subscription Types and Parameters:



! lang-content lang="rust"
! content
```rust
let account = Address::from_str("0xbabebabebabe0000000000000000000000000000")?;
let since = 1687245924000000u64;
```
! content end
! lang-content end

! lang-content lang="js"
! content
```json
{
	"address": "0x13791790Bef192d14712D627f13A55c4ABEe52a4",
	"since": 1687245924000000 // Timestamp in microseconds
}
```
! content end
! lang-content end

! lang-content lang="bash"
! content
```json
{
	"address": "0x13791790Bef192d14712D627f13A55c4ABEe52a4",
	"since": 1687245924000000 // Timestamp in microseconds
}
```
! content end
! lang-content end

### Response

! lang-content lang="rust"
! content
| Field         | Type             | Description                         |
|---------------|------------------|-------------------------------------|
| `inner`       | `TransactionReceipt` | Standard Ethereum receipt        |
| `pod_metadata`| `ReceiptMeta`    | Extra metadata for attestation      |
| └─ `attestations` | `Vec<Attestation>` | List of attestations           |
|    └─ `timestamp` | `Timestamp`       | Time of attestation               |
|    └─ `public_key`| `AddressECDSA`    | Attestor's public key             |
|    └─ `signature` | `SignatureECDSA`  | Attestation signature             |
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

    let account = Address::from_str("0xbabebabebabe0000000000000000000000000000").unwrap();
    let mut receipts_per_account_stream = pod_provider
        .subscribe_receipts(Some(account), Timestamp::zero())
        .await
        .unwrap()
        .into_stream();

    let mut receipts_stream = pod_provider
        .subscribe_receipts(None, Timestamp::zero())
        .await
        .unwrap()
        .into_stream();

    println!("waiting for new account and confirmation receipts");
    loop {
        tokio::select! {
            receipt = receipts_per_account_stream.next() => {
                println!("got receipt for account '{account}' {receipt:?}");
            }
            receipt = receipts_stream.next() => {
                println!("got receipt {receipt:?}");
            }
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
    				'pod_receipts',
    				{
    					address: '0x1234567890123456789012345678901234567890',

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
				'pod_receipts',
				{
					address: '0x1234567890123456789012345678901234567890',
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
"PodReceiptResponse"{
   "receipt":"TransactionReceipt"{
      "inner":"Legacy(ReceiptWithBloom"{
         "receipt":"Receipt"{
            "status":Eip658(true),
            "cumulative_gas_used":72943,
            "logs":[
               "Log"{
                  "inner":"Log"{
                     "address":0x4cf3f1637bfef1534e56352b6ebaae243af464c3,
                     "data":"LogData"{
                        "topics":[
                           0xed6e6fdf99cd5e97145c7e59ade93923be1979557a77e639ed95a203c7a8e861,
                           0xb5611cc2138f8963a8f9b231c4bbba488d6da4697939327dc88e1ca1a6100b69,
                           0x000000000000000000000000c7940e33cfa68da05d88e950dd7fa619584b9a74
                        ],
                        "data":0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000717b227469746c65223a225465737420506f7374207769746820457861637420476173222c22636f6e74656e74223a2254657374696e6720636f6e74726163742063616c6c20776974682065786163742066756e6473222c22637265617465644174223a313732353030303030303030307d000000000000000000000000000000
                     }
                  },
                  "block_hash":Some(0x0000000000000000000000000000000000000000000000000000000000000000),
                  "block_number":Some(1),
                  "block_timestamp":"None",
                  "transaction_hash":Some(0xa80f028be45b520814a942aaa61896ed05513b95b28acfb13cf93ad3cf994934),
                  "transaction_index":Some(0),
                  "log_index":Some(0),
                  "removed":false
               }
            ]
         },
         "logs_bloom":0x00000000000000000000000000000000000000000000000000020000000000800000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000002000000000004000000000000000000000000000000000000000000000000000000000080010000000000000000000000000000000000000000000000100000000000000000000000000000000000000000010000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000
      }")",
      "transaction_hash":0xa80f028be45b520814a942aaa61896ed05513b95b28acfb13cf93ad3cf994934,
      "transaction_index":Some(0),
      "block_hash":Some(0x0000000000000000000000000000000000000000000000000000000000000000),
      "block_number":Some(1),
      "gas_used":72943,
      "effective_gas_price":1000000000,
      "blob_gas_used":"None",
      "blob_gas_price":"None",
      "from":0xc7940e33cfa68da05d88e950dd7fa619584b9a74,
      "to":Some(0x4cf3f1637bfef1534e56352b6ebaae243af464c3),
      "contract_address":"None",
      "authorization_list":"None"
   },
   "pod_metadata":"PodMetadata"{
      "attestations":[
         "AttestationData"{
            "public_key":AddressECDSA(0x7d5761b7b49fc7bfdd499e3ae908a4acfe0807e6),
            "signature":SignatureECDSA(5abf1f266530f4ffdd73b6a27c31f563c89b5b3cbe420c81fd8e3a57ce0afaa21a3a980122c2da88b52f20f0400ed6c3fb6511eca0ac6acc76e92e908839eee41c),
            "timestamp":Timestamp(1747838626577722)
         },
         "AttestationData"{
            "public_key":AddressECDSA(0xd64c0a2a1bae8390f4b79076ceae7b377b5761a3),
            "signature":SignatureECDSA(9742532242ff86314ccb618811f8f6f099c07851176174b835110bfced7d5f192d5c7f97595a0eb451af2afe4b55c29e5fab63b25124bb5cde09f6526eafa99c1b),
            "timestamp":Timestamp(1747838626578682)
         },
         "AttestationData"{
            "public_key":AddressECDSA(0x06ad294f74dc98be290e03797e745cf0d9c03da2),
            "signature":SignatureECDSA(bc04ccd7460a4345976805c5d3ac10476893809158d5bd7c776771e3d6b86bc800905f799d87ddbde25a4bbca3812add552cfc7deb1fa6e987403fe49b21dce11c),
            "timestamp":Timestamp(1747838626578663)
         },
         "AttestationData"{
            "public_key":AddressECDSA(0x8646d958225301a00a6cb7b6609fa23bab87da7c),
            "signature":SignatureECDSA(aed3b4f13effd05a0abf4804f669cad5639c197ff8f05c1cc7967d6769fd9395107fe35bb01be11303737144e6cabcfae4b9b05d45197352b70b4b5ea28641dc1b),
            "timestamp":Timestamp(1747838626578245)
         }
      ],
      "transaction":"Signed"{
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
            "r":102111622572553983674892995435563854101741246973814911068201195170908604824775,
            "s":2371577272714340087266889293192028850401838593029254588250364470751379501638
         },
         "signer":0xc7940e33cfa68da05d88e950dd7fa619584b9a74,
         "_private":"()"
      }
   }
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
		"message": "invalid parameters, expected [\"pod_receipts\", {\"address\": <address>, \"since\": <since>}]"
	},
	"id": 1
}
```

! codeblock end

! sticky end

! content end
