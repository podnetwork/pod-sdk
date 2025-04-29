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

! content id="pod_metrics"

## pod_metrics

Returns the current metrics displayed in the pod explorer.

### Parameters

None

### Response

| Key                | Type    | Description             |
| ------------------ | ------- | ----------------------- |
| `statusCode`       | integer | HTTP status code        |
| `response.jsonrpc` | string  | same value as request   |
| `response.id`      | integer | unique value as request |
| `response.result`  | object  | Response object         |

| Key                   | Type    | Description                                               |
| --------------------- | ------- | --------------------------------------------------------- |
| `{}`                  | object  | Pagination Response Object                                |
| `{}.gas_price`        | integer | Current gas price in wei                                  |
| `{}.validator_uptime` | number  | Validator uptime percentage                               |
| `{}.latency`          | number  | Average latency in milliseconds                           |
| `{}.throughput`       | number  | Average throughput in transactions per second             |

! content end

! content

! sticky

! codeblock title="POST rpc.dev.pod.network" runCode={play}

```bash alias="curl"
curl -X POST https://rpc.dev.pod.network \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "method": "pod_metrics",
        "params": {},
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
		method: 'pod_metrics',
		params: {},
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
            "method": "pod_metrics",
            "params": {},
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
    "result": {
        "gas_price": 11482000000,
        "validator_uptime": 0.9999,
        "latency": 120,
        "throughput": 100
    },
    "id": 1
}
```

! codeblock end

! sticky end

! content end
