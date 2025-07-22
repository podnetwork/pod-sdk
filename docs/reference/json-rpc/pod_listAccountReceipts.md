---
layout: simple
---

<script>
    async function play() {
        return fetch('https://rpc.v1.dev.pod.network/', {
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

## List Account Receipts

Retrieves transaction receipts originating from or directed to a specific address.

### Parameters

! table style1
| Key                | Type    | Description                                                                      |
| ------------------ | ------- | -------------------------------------------------------------------------------- |
| `[1]`              | string  | 20-byte address                                                                  |
| `[2]`              | string  | Timestamp specified in microseconds representing the start of the range to query |
| `[3]`              | object  | (optional) Pagination object                                                     |
| `[3].cursor`       | string  | (optional) Cursor for pagination                                                 |
| `[3].limit`        | integer | (optional) Number of results to return                                           |
| `[3].newest_first` | boolean | (optional) Whether to start the query from the most recent receipts              |
! table end

> Note: If cursor is provided, newest_first must NOT be provided.

### Response

! table style1
| Key                | Type    | Description             |
| ------------------ | ------- | ----------------------- |
| `statusCode`       | integer | HTTP status code        |
| `response.jsonrpc` | string  | same value as request   |
| `response.id`      | integer | unique value as request |
| `response.result`  | object  | Response object         |
! table end

! table style1
| Key              | Type   | Description                                                                   |
| ---------------- | ------ | ----------------------------------------------------------------------------- |
|              | object | Pagination Response Object                                                    |
| `items`       | array  | List of transaction receipts with metadata                                    |
| `next_cursor` | string | Cursor to start the next query from. null if there are no more items to fetch |
! table end

! content end

! content

! sticky

! codeblock title="POST rpc.v1.dev.pod.network" runCode={play}

```bash alias="curl"
curl -X POST https://rpc.v1.dev.pod.network \
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
await fetch('https://rpc.v1.dev.pod.network/', {
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

```rust alias="rust"
use reqwest::Client;
use serde_json::{json, Value};

async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();
    let response = client
        .post("https://rpc.v1.dev.pod.network/")
        .header("Content-Type", "application/json")
        .json(&json!({
            "jsonrpc": "2.0",
            "method": "pod_listAccountReceipts",
            "params": {
                "address": "0x13791790Bef192d14712D627f13A55c4ABEe52a4",
                "since": 0
            },
            "id": 1
        }))
        .send()
        .await?;

    let result: Value = response.json().await?;
    println!("{}", result);

    Ok(())
}
```

! codeblock end

! codeblock title="Example Response"

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

! codeblock end

! sticky end

! content end
