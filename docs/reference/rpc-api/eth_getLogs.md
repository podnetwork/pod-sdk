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

## eth_getLogs

Returns an array of event logs matching the given filter criteria.

### Parameters

| Parameter                 | Type   | Description                                                                                                                      |
| ------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `{}.fromBlock`            | string | (optional) From block timestamp specified in seconds in hexadecimal format. Can also be the tags: earliest, finalized or latest. |
| `{}.toBlock`              | string | (optional) To block timestamp specified in seconds in hexadecimal format. Can also be the tags: earliest, finalized or latest.   |
| `{}.address`              | string | (optional) Contract address                                                                                                      |
| `{}.topics`               | array  | (optional) Array of topic filters (up to 4 topics):                                                                              |
|                           |        | - Each topic can be either a string or null                                                                                      |
|                           |        | - Topics are ordered and must match in sequence                                                                                  |
|                           |        | - Null values match any topic                                                                                                    |
| `{}.minimum_attestations` | number | (optional) Minimum number of attestations required for the log to be returned                                                    |

### Response

| Key                | Type    | Description             |
| ------------------ | ------- | ----------------------- |
| `statusCode`       | integer | HTTP status code        |
| `response.jsonrpc` | string  | same value as request   |
| `response.id`      | integer | unique value as request |
| `response.result`  | array   | Array of log objects    |

| Key                   | Type   | Description                                                                                    |
| --------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| `{}`                  | object | block information                                                                              |
| `{}.address`          | string | Address from which this log originated                                                         |
| `{}.blockNumber`      | string | Block number in hexadecimal format, supported for completeness, the block number returned is 1 |
| `{}.blockHash`        | string | Block hash. Supported for completeness, the block hash returned is the 0 hash                  |
| `{}.transactionHash`  | string | Transaction hash                                                                               |
| `{}.transactionIndex` | string | Transaction index                                                                              |
| `{}.logIndex`         | string | Log index                                                                                      |
| `{}.topics`           | array  | Array of indexed log parameters                                                                |
| `{}.data`             | string | Contains non-indexed log parameters                                                            |
| `{}.pod_metadata`     | object | Additional pod-specific information including attestations                                     |

! content end

! content

! sticky

! codeblock title="POST rpc.dev.pod.network" runCode={play}

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

```rust alias="rust"
use reqwest::Client;
use serde_json::{json, Value};

async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();
    let response = client
        .post("https://rpc.dev.pod.network/")
        .header("Content-Type", "application/json")
        .json(&json!({
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
        }))
        .send()
        .await?;

    let result: Value = response.json().await?;
    println!("{}", result);

    Ok(())
}
```

! codeblock end

Example Response:

! codeblock

```json
{
	"jsonrpc": "2.0",
	"result": [],
	"id": 1
}
```

! codeblock end

! sticky end

! content end
