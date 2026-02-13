# Getting Started

Pod provides an Ethereum-like interface, so developers can use existing toolchains and wallets out of the box - `ethers.js`, `viem`, `web3.py`, `alloy`, `cast`, or any EVM-compatible library. No new SDKs or custom clients required.

```javascript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.v1.dev.pod.network");
const balance = await provider.getBalance("0xYourAddress");
```

{% columns %}
{% column %}
{% embed url="https://faucet.dev.pod.network" %}
{% endcolumn %}
{% column %}
{% embed url="https://explorer.v1.pod.network" %}
{% endcolumn %}
{% endcolumns %}

## Devnet Configuration

| Property        | Value                                                        |
| --------------- | ------------------------------------------------------------ |
| Name            | `pod`                                                        |
| RPC             | `https://rpc.v1.dev.pod.network`                             |
| Chain ID        | `1293`                                                       |
| Explorer        | `https://explorer.v1.pod.network`                            |
| Currency Symbol | `pUSD`                                                       |
| EVM Version     | `Prague` (Ethereum block 22,431,084, Released May 7th, 2025) |

{% hint style="warning" %}
We expect the devnet to have breaking changes or be reset (pruned completely) at any time.
{% endhint %}

## Next Steps

Pod supports standard Ethereum RPC methods under the `eth_` namespace, with a few differences due to Pod's blockless architecture. Pod also introduces additional namespaces for protocol-specific and orderbook functionality:

* [**JSON-RPC**](json-rpc/README.md) - Standard `eth_` methods, Pod-specific `pod_` extensions, and orderbook data via `ob_` endpoints.
* [**Precompiles**](applications-precompiles/README.md) - Enshrined applications and internal protocol operations exposed as precompile contracts, callable via `eth_call` and `eth_sendRawTransaction`.
