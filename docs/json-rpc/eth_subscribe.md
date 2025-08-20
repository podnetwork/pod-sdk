---
layout: simple
---

! content id="eth_subscribe"

## Subscribe

Creates a subscription for specific events. This endpoint streams the new events, for historical data use the other endpoints (pod_listReceipts, pod_pastPerfectTime, eth_getLogs). Each subscription type has different parameter requirements.

### Parameters

! table style1
| Parameter | Type   | Description                                                                 |
| --------- | ------ | --------------------------------------------------------------------------- |
| `[0]`     | string | Subscription type (required): `logs`, `pod_receipts`, `pod_pastPerfectTime` |
| `[1]`     | object | Parameters object (varies by subscription type)                             |
! table end

### Subscription Types and Parameters:

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

! codeblock title="pod_receipts"

```json
{
  // optional account to filter receipts by (matches either sender or recipient)
  "address": "0x13791790Bef192d14712D627f13A55c4ABEe52a4",
  // Timestamp in microseconds
  "since": 1687245924000000
}
```

! codeblock end

! codeblock title="pod_pastPerfectTime"

```bash
1687245924000000 // Timestamp in microseconds
```

! codeblock end

### Response

! table style1
| Type   | Description     |
| ------ | --------------- |
| string | Subscription ID |
! table end

! content end

! content

! sticky

! codeblock title="Example request"

```bash alias="curl"
wscat -c ws://rpc.v1.dev.pod.network \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "method": "eth_subscribe",
        "params": ["<subscription_type>", <parameters>],
        "id": 1
    }'
```

```js alias="javascript"
const socket = new WebSocket('ws://rpc.v1.dev.pod.network');

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

```rust alias="rust"
use tokio::net::TcpStream;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message, WebSocketStream, MaybeTlsStream};
use futures_util::{StreamExt, SinkExt};
use serde_json::json;

async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let (ws_stream, _) = connect_async("ws://rpc.v1.dev.pod.network").await?;
    let (mut write, mut read) = ws_stream.split();

    // Subscribe to logs
    let subscribe_msg = json!({
        "jsonrpc": "2.0",
        "method": "eth_subscribe",
        "params": ["logs", {
            "address": "0x1234567890123456789012345678901234567890",
            "topics": ["0x71a5674c44b823bc0df08201dfeb2e8bdf698cd684fd2bbaa79adcf2c99fc186"]
        }],
        "id": 1
    });

    write.send(Message::Text(subscribe_msg.to_string())).await?;

    // Process incoming messages
    while let Some(msg) = read.next().await {
        let msg = msg?;
        if let Message::Text(text) = msg {
            println!("Received: {}", text);
        }
    }

    Ok(())
}
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

! codeblock title="pod_receipts"

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

! table style1
| Error Code | Message                             | Description                                              |
| ---------- | ----------------------------------- | -------------------------------------------------------- |
| -32602     | Invalid subscription type           | The requested subscription type is not supported         |
| -32602     | Invalid parameters for subscription | The parameters provided for the subscription are invalid |
| -32602     | Missing required parameters         | Required parameters for the subscription are missing     |
! table end

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
