<script>
    async function play() {
        return fetch('https://rpc.dev.pod.network/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'pod_listAccountReceipts',
                params: {
                    address: '0x13791790Bef192d14712D627f13A55c4ABEe52a4',
                    since: 0
                },
                id: 1
            })
        });
    }
</script>

! content id="pod_listAccountReceipts"

! lang-tab

## List Account Receipts

Retrieves transaction receipts originating from or directed to a specific address.

### Parameters

! lang-content lang="rust"
! content
| Parameter   | Type                             | Description                                      |
|-------------|----------------------------------|--------------------------------------------------|
| `address`   | `Address`                        | Address to filter on                             |
| `since`     | `u64`                            | Timestamp or logical clock to start listing from |
| `pagination`| `Option<CursorPaginationRequest>`| Optional pagination cursor and limit             |
! content end
! lang-content end

! lang-content lang="js"
! content
| Key                | Type    | Description                                                                      |
| ------------------ | ------- | -------------------------------------------------------------------------------- |
| `[1]`              | string  | 20-byte address                                                                  |
| `[2]`              | string  | Timestamp specified in microseconds representing the start of the range to query |
| `[3]`              | object  | (optional) Pagination object                                                     |
| `[3].cursor`       | string  | (optional) Cursor for pagination                                                 |
| `[3].limit`        | integer | (optional) Number of results to return                                           |
| `[3].newest_first` | boolean | (optional) Whether to start the query from the most recent receipts              |
! content end
! lang-content end

! lang-content lang="bash"
! content
| Key                | Type    | Description                                                                      |
| ------------------ | ------- | -------------------------------------------------------------------------------- |
| `[1]`              | string  | 20-byte address                                                                  |
| `[2]`              | string  | Timestamp specified in microseconds representing the start of the range to query |
| `[3]`              | object  | (optional) Pagination object                                                     |
| `[3].cursor`       | string  | (optional) Cursor for pagination                                                 |
| `[3].limit`        | integer | (optional) Number of results to return                                           |
| `[3].newest_first` | boolean | (optional) Whether to start the query from the most recent receipts              |
! content end
! lang-content end

> Note: If cursor is provided, newest_first must NOT be provided.

### Response

! lang-content lang="rust"
! content
| Key            | Type                                      | Description                                 |
|----------------|-------------------------------------------|---------------------------------------------|
| `receipt`      | `TxReceipt` | Standard Ethereum transaction receipt       |
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

! lang-content lang="js"
! content
| Key                | Type    | Description             |
| ------------------ | ------- | ----------------------- |
| `statusCode`       | integer | HTTP status code        |
| `response.jsonrpc` | string  | same value as request   |
| `response.id`      | integer | unique value as request |
| `response.result`  | object  | Response object         |

| Key              | Type   | Description                                                                   |
| ---------------- | ------ | ----------------------------------------------------------------------------- |
|              | object | Pagination Response Object                                                    |
| `items`       | array  | List of transaction receipts with metadata                                    |
| `next_cursor` | string | Cursor to start the next query from. null if there are no more items to fetch |
! content end
! lang-content end

! lang-content lang="bash"
! content
| Key                | Type    | Description             |
| ------------------ | ------- | ----------------------- |
| `statusCode`       | integer | HTTP status code        |
| `response.jsonrpc` | string  | same value as request   |
| `response.id`      | integer | unique value as request |
| `response.result`  | object  | Response object         |

| Key              | Type   | Description                                                                   |
| ---------------- | ------ | ----------------------------------------------------------------------------- |
|              | object | Pagination Response Object                                                    |
| `items`       | array  | List of transaction receipts with metadata                                    |
| `next_cursor` | string | Cursor to start the next query from. null if there are no more items to fetch |
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
    let recipient_address = Address::from_word(b256!("0x000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045"));
    let start_time = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)?
            .as_micros()
            .try_into()?;
    let receipts = pod_provider
            .get_account_receipts(recipient_address, start_time, None)
            .await?;
    println!("{:?}", receipts);

    Ok(())
}
```

```bash alias="curl"
curl -X POST https://rpc.dev.pod.network \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "method": "pod_listAccountReceipts",
        "params": {
            "address": "0x13791790Bef192d14712D627f13A55c4ABEe52a4",
            "since": 0
        },
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
		method: 'pod_listAccountReceipts',
		params: {
			address: '0x13791790Bef192d14712D627f13A55c4ABEe52a4',
			since: 0
		},
		id: 1
	})
});
```

! codeblock end

Example Response:

! lang-content lang="rust"
! content
```rust
"ApiPaginatedResult"{
   "items":[
      "PodReceiptResponse"{
         "receipt":"TransactionReceipt"{
            "inner":"Legacy(ReceiptWithBloom"{
               "receipt":"Receipt"{
                  "status":Eip658(true),
                  "cumulative_gas_used":21000,
                  "logs":[

                  ]
               },
               "logs_bloom":0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
            }")",
            "transaction_hash":0x4daeceb4aedde77d784b7a63466c9bd66a6fd16dccffe5029c697f4ff7474965,
            "transaction_index":Some(0),
            "block_hash":Some(0x0000000000000000000000000000000000000000000000000000000000000000),
            "block_number":Some(1),
            "gas_used":21000,
            "effective_gas_price":1000000000,
            "blob_gas_used":"None",
            "blob_gas_price":"None",
            "from":0xb8aa43999c2b3cbb10fbe2092432f98d8f35dcd7,
            "to":Some(0xd2a14d8b64a613ffd83148b3f6a447be340bcf9f),
            "contract_address":"None",
            "authorization_list":"None"
         },
         "pod_metadata":"PodMetadata"{
            "attestations":[
               "AttestationData"{
                  "public_key":AddressECDSA(0x7d5761b7b49fc7bfdd499e3ae908a4acfe0807e6),
                  "signature":SignatureECDSA(3de161df5a2d4f56111588dfe395cff817f4c7aedfa38399cfcace94026bf28000ec7818f02c10098817def0c36d1e0e793197fb48eb43424e2b798a72d184a01c),
                  "timestamp":Timestamp(1747838626660543)
               },
               "AttestationData"{
                  "public_key":AddressECDSA(0xd64c0a2a1bae8390f4b79076ceae7b377b5761a3),
                  "signature":SignatureECDSA(88263accd04a383f05443f24f0b0b06098e0aaf9a709ec037c04890e0ff67eed3cb7ef0b5832b1ac453b86f3aca37403dffca33dd8d78311f0606544bac0f41f1c),
                  "timestamp":Timestamp(1747838626660655)
               },
               "AttestationData"{
                  "public_key":AddressECDSA(0x06ad294f74dc98be290e03797e745cf0d9c03da2),
                  "signature":SignatureECDSA(e53548d0735430591cdcf8b9894e5f25361bcf619175a0bc622f96772a7efdbf10862e1c2fae7e62d64d310a50fc6cd91beff68261ee1775d5daa8e7f3438e571b),
                  "timestamp":Timestamp(1747838626661260)
               },
               "AttestationData"{
                  "public_key":AddressECDSA(0x8646d958225301a00a6cb7b6609fa23bab87da7c),
                  "signature":SignatureECDSA(f4571dbd17f8d631f56580b38a7d507640048ffa80a6d25939bf8b8ba8b0808208ff93cb241caf47fc7bf0a16d0662d41b7bfdf2c877cf4492aca7e89de4c9061c),
                  "timestamp":Timestamp(1747838626661307)
               }
            ],
            "transaction":"Signed"{
               "signed":"TxLegacy"{
                  "chain_id":Some(1293),
                  "nonce":4,
                  "gas_price":1000000000,
                  "gas_limit":21000,
                  "to":Call(0xd2a14d8b64a613ffd83148b3f6a447be340bcf9f),
                  "value":1000000,
                  "input":0x
               },
               "signature":"PrimitiveSignature"{
                  "y_parity":false,
                  "r":88116149726414403175556358829904558692123077910018604704265665916361413466543,
                  "s":973843630084249314221103943807950942576778953777363320541932188608317630545
               },
               "signer":0xb8aa43999c2b3cbb10fbe2092432f98d8f35dcd7,
               "_private":"()"
            }
         }
      },
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
      }
      ],
   "cursor":"None"
}
```
! content end
! lang-content end

! lang-content lang="js"
! content
```json
{
	"jsonrpc": "2.0",
	"id": 1,
	"result": {
		"items": [
			{
				"blockHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
				"blockNumber": "0x1",
				"contractAddress": null,
				"cumulativeGasUsed": "0x5208",
				"effectiveGasPrice": "0x3b9aca00",
				"from": "0xb8aa43999c2b3cbb10fbe2092432f98d8f35dcd7",
				"gasUsed": "0x5208",
				"logs": [],
				"logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
				"pod_metadata": {
					"attestations": [
						{
							"public_key": "0x7d5761b7b49fc7bfdd499e3ae908a4acfe0807e6",
							"signature": {
								"r": "0x30262c9f183a9f7219d260affbf6c8f92bff24a094d63ff9ed3c7366076f7bd7",
								"s": "0x6a6ff240bbab35626d6f4ea2a27a2d9d739f9305a5f1bcabe0eaf1e14364390a",
								"v": "0x0",
								"yParity": "0x0"
							},
							"timestamp": 1740419698722233
						},
						{
							"public_key": "0xd64c0a2a1bae8390f4b79076ceae7b377b5761a3",
							"signature": {
								"r": "0x45a87fdf1455b5f93660c5e265767325afbd1e0cfa327970a63e188290625f9d",
								"s": "0x65343279465e0f1e43729b669589c2c80d12e95a72a5a52c63b70b3abf1ebef5",
								"v": "0x1",
								"yParity": "0x1"
							},
							"timestamp": 1740419698722014
						},
						{
							"public_key": "0x06ad294f74dc98be290e03797e745cf0d9c03da2",
							"signature": {
								"r": "0xf9d7f79e339b68f75eb6d172dc68539a1d0750c555979f998cb8a9211fdc1511",
								"s": "0x7239b2efc00415dd5866bf564366272af8fb4738c7697fec50628b9969521493",
								"v": "0x1",
								"yParity": "0x1"
							},
							"timestamp": 1740419698721922
						},
						{
							"public_key": "0x8646d958225301a00a6cb7b6609fa23bab87da7c",
							"signature": {
								"r": "0x8c8256bea8c0e919618abd973646d344e8ffe3c50c0757ce902d28659f1524b4",
								"s": "0x3b76b3818666a418572cc465d30638533d4bd987bfb5dd0550a311521f167719",
								"v": "0x1",
								"yParity": "0x1"
							},
							"timestamp": 1740419698722052
						}
					]
				},
				"status": "0x1",
				"to": "0x13791790bef192d14712d627f13a55c4abee52a4",
				"transactionHash": "0xfa71ee80b1bc58e00f4fe11ae1de362201de43ff65e849dcb5d8b92e0be71e87",
				"transactionIndex": "0x0",
				"type": "0x0"
			}
		],
		"next_cursor": "Y3I6MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAxNzQwNDE5Njk3MjQ3NTczXzB4NzRjOWM0MTFkZDJjMDg0ZWE4NmZjOThjMDUwYWU0OTI4YTgzZjVlN2I3N2UyN2NkYTA5NWFiYmY0YTk1ZjJmY3xjcjowMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDBfMHgwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAw"
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
	"id": 1,
	"result": {
		"items": [
			{
				"blockHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
				"blockNumber": "0x1",
				"contractAddress": null,
				"cumulativeGasUsed": "0x5208",
				"effectiveGasPrice": "0x3b9aca00",
				"from": "0xb8aa43999c2b3cbb10fbe2092432f98d8f35dcd7",
				"gasUsed": "0x5208",
				"logs": [],
				"logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
				"pod_metadata": {
					"attestations": [
						{
							"public_key": "0x7d5761b7b49fc7bfdd499e3ae908a4acfe0807e6",
							"signature": {
								"r": "0x30262c9f183a9f7219d260affbf6c8f92bff24a094d63ff9ed3c7366076f7bd7",
								"s": "0x6a6ff240bbab35626d6f4ea2a27a2d9d739f9305a5f1bcabe0eaf1e14364390a",
								"v": "0x0",
								"yParity": "0x0"
							},
							"timestamp": 1740419698722233
						},
						{
							"public_key": "0xd64c0a2a1bae8390f4b79076ceae7b377b5761a3",
							"signature": {
								"r": "0x45a87fdf1455b5f93660c5e265767325afbd1e0cfa327970a63e188290625f9d",
								"s": "0x65343279465e0f1e43729b669589c2c80d12e95a72a5a52c63b70b3abf1ebef5",
								"v": "0x1",
								"yParity": "0x1"
							},
							"timestamp": 1740419698722014
						},
						{
							"public_key": "0x06ad294f74dc98be290e03797e745cf0d9c03da2",
							"signature": {
								"r": "0xf9d7f79e339b68f75eb6d172dc68539a1d0750c555979f998cb8a9211fdc1511",
								"s": "0x7239b2efc00415dd5866bf564366272af8fb4738c7697fec50628b9969521493",
								"v": "0x1",
								"yParity": "0x1"
							},
							"timestamp": 1740419698721922
						},
						{
							"public_key": "0x8646d958225301a00a6cb7b6609fa23bab87da7c",
							"signature": {
								"r": "0x8c8256bea8c0e919618abd973646d344e8ffe3c50c0757ce902d28659f1524b4",
								"s": "0x3b76b3818666a418572cc465d30638533d4bd987bfb5dd0550a311521f167719",
								"v": "0x1",
								"yParity": "0x1"
							},
							"timestamp": 1740419698722052
						}
					]
				},
				"status": "0x1",
				"to": "0x13791790bef192d14712d627f13a55c4abee52a4",
				"transactionHash": "0xfa71ee80b1bc58e00f4fe11ae1de362201de43ff65e849dcb5d8b92e0be71e87",
				"transactionIndex": "0x0",
				"type": "0x0"
			}
		],
		"next_cursor": "Y3I6MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAxNzQwNDE5Njk3MjQ3NTczXzB4NzRjOWM0MTFkZDJjMDg0ZWE4NmZjOThjMDUwYWU0OTI4YTgzZjVlN2I3N2UyN2NkYTA5NWFiYmY0YTk1ZjJmY3xjcjowMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDBfMHgwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAw"
	}
}
```
! content end
! lang-content end

! sticky end

! content end
