<script>
    async function play() {
        return fetch('https://rpc.dev.pod.network/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'pod_getCommittee',
                params: {},
                id: 1
            })
        });
    }
</script>

! content id="pod_getCommittee"

## pod_getCommittee

Lists the validator public keys that are part of the committee.

### Parameters

None

### Response

| Key                | Type    | Description             |
| ------------------ | ------- | ----------------------- |
| `statusCode`       | integer | HTTP status code        |
| `response.jsonrpc` | string  | same value as request   |
| `response.id`      | integer | unique value as request |
| `response.result`  | object  | Response object         |

| Key              | Type    | Description                     |
| ---------------- | ------- | ------------------------------- |
| `{}`             | object  |                                 |
| `{}.quorum_size` | integer | Number of required attestations |
| `{}.replicas`    | array   | Array of validator public keys  |

! content end

! content

! sticky

! codeblock title="POST rpc.dev.pod.network" runCode={play}

```bash alias="curl"
curl -X POST https://rpc.dev.pod.network \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "method": "pod_getCommittee",
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
		method: 'pod_getCommittee',
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
            "method": "pod_getCommittee",
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
        "quorum_size": 3,
        "replicas": [
            "01f63ebcf3e22985abef399b43966f409bba8c02a61141de1a96398b5ed0a4f5002eb5e9083d0f8bc5bfcf75f43fbe34dfc037492025d18e42942f9ed6c4b00205e30c48e09b4c030cfa588ea4ec104bd9977173d8ef7c16021fb5edf727c38a2e2f2605c8a87f80b7900b64be0cbad48239d0cf4c09375753d4fb0b7036abcc",
            "2f8848f3696c99d7bdc1c1fcda5792577afb5bcd93cfd4c7b6a20f99c4c2bf950d55a3057171c1d87add3d690d62206b398121e5e1335bd598f7728225b8c9d0001dd768a50542e7bbdaadd69f4739054a6b1a600a5545dc0603766ec50ad85b28f99ce9c100112a0020d106b8723567b23b6e0ac1ec7559b686e1c18607ff83",
            "0b6dfa0424d710ac6158c0055be1cf0a4c21df3c3a9ca3d5e8d3e580674bc35400caf4585df58ad603e527bcfc026669c9dcaf03ec8c80f278886d34a6cae2b405f64057067f53ae226c48a555a1d10aeec46ac92b5c98f36974206f0ff84f2413ec4b4de5bc56e5ddd5c1f5d768f1ecf748cb44bea6de4c55306e2bfd8c2fee",
            "2abae2b0ca5c77d515c841cada5e825f169ff15dd392ac9aaebaf37ea23e04bd0158439d7925b770e46fd9b4e8158e6acb5784a91f261e35ea6605b8c4c9473923c961214b8a7b44e4dc58932d2b475943746439a100aea7eadda30022e78d312bdf55f96f6adbd12844c2df41b8e680994af83725a168c1d038575a032ec9e1"
        ]
    },
    "id": 2
}
```

! codeblock end

! sticky end

! content end
