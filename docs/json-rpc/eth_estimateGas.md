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
                method: 'eth_estimateGas',
                params: [{
                    from: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                    to: '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8'
                }],
                id: 1
            })
        });
    }
</script>

! content id="eth_estimateGas"

## Get Gas Estimation

Estimates gas needed for a transaction.

### Parameters

! table style1
| Parameter  | Type   | Description                                            |
| ---------- | ------ | ------------------------------------------------------ |
| `object`   | object | Transaction call object with the following fields:     |
| `from`     | string | (optional) 20-byte address of sender                   |
| `to`       | string | 20-byte address of recipient                           |
| `gas`      | string | (optional) Gas provided for transaction execution      |
| `gasPrice` | string | (optional) Gas price in wei                            |
| `value`    | string | (optional) Value in wei                                |
| `data`     | string | (optional) Contract code or encoded function call data |
! table end

> Note: Only Legacy transactions are supported

### Response

! table style1
| Key                | Type    | Description                                    |
| ------------------ | ------- | ---------------------------------------------- |
| `statusCode`       | integer | HTTP status code                               |
| `response.jsonrpc` | string  | same value as request                          |
| `response.id`      | integer | unique value as request                        |
| `response.result`  | string  | estimated gas in hexadecimal format |
! table end

! content end

! content

! sticky

! codeblock title="POST rpc.v1.dev.pod.network" runCode={play}

```rust alias="rust"
use reqwest::Client;
use serde_json::{json, Value};

async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let recipient_address = Address::from_word(b256!("0x000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045"));
    let transfer_amount = U256::from(1_000_000); // 1 million wei

    let tx = PodTransactionRequest::default()
            .with_to(recipient_address)
            .with_value(transfer_amount);

    let gas_estimation = pod_provider.estimate_gas(&tx).await?;
    println!("{}", gas_estimation);

    Ok(())
}
```

```bash alias="curl"
curl -X POST https://rpc.v1.dev.pod.network \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "method": "eth_estimateGas",
        "params": [{
            "from": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            "to": "0xbe0eb53f46cd790cd13851d5eff43d12404d33e8"
        }],
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
		method: 'eth_estimateGas',
		params: [
			{
				from: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
				to: '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8'
			}
		],
		id: 1
	})
});
```

! codeblock end

Example Response:

! codeblock

```json
{
    "jsonrpc": "2.0",
    "result": "0x493e0",
    "id": 1
}
```

! codeblock end

! sticky end

! content end
