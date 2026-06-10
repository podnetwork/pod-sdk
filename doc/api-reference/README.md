# Getting Started

Pod provides an Ethereum-like interface, so developers can use existing toolchains and wallets out of the box - `ethers.js`, `viem`, `web3.py`, `alloy`, `cast`, or any EVM-compatible library. No new SDKs or custom clients required.

```javascript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.podtestnet.dev");
const balance = await provider.getBalance("0xYourAddress");
```

{% cards %}
{% card title="Fund your wallet" href="https://faucet.dev.pod.network" %}
Get testnet tokens from the faucet
{% endcard %}
{% card title="Explorer" href="https://explorer.pod.network" %}
View transactions and accounts
{% endcard %}
{% endcards %}

## Network Configuration

{% tabs %}
{% tab title="Testnet" %}
| Property        | Value                                                        |
| --------------- | ------------------------------------------------------------ |
| Name            | `pod`                                                        |
| RPC             | `https://rpc.podtestnet.dev`                                 |
| Chain ID        | `129301`                                                       |
| Explorer        | `https://explorer.pod.network`                            |
| Currency Symbol | `USD`                                                        |
| EVM Version     | `Prague` (Ethereum block 22,431,084, Released May 7th, 2025) |
{% endtab %}

{% tab title="Mainnet" %}
{% hint style="info" %}
**Mainnet is not live yet.** Network details will be published here once mainnet launches.
{% endhint %}
{% endtab %}
{% endtabs %}

## Next Steps

{% hint style="info" %}
**Transaction hashes as identifiers.** Pod uses the **transaction hash** — the value returned by `eth_sendRawTransaction` when the transaction was submitted — as the canonical identifier for the entity that transaction created. Anywhere a later call needs to reference that entity, pass its creating tx hash. For example, the orderbook precompile's `cancel(orderbookId, canceledOrder, …)` and `update(orderbookId, updatedOrder, …)` both take the `submitOrder` tx hash as the order id, and `ob_getOrders` exposes the same value as `tx_hash`.
{% endhint %}

Pod supports standard Ethereum RPC methods under the `eth_` namespace, with a few differences due to Pod's blockless architecture. Pod also introduces additional namespaces for protocol-specific and orderbook functionality:

* [**JSON-RPC**](json-rpc/README.md) - Standard `eth_` methods, Pod-specific `pod_` extensions, and orderbook data via `ob_` endpoints.
* [**Precompiles**](applications-precompiles/README.md) - Enshrined applications and internal protocol operations exposed as precompile contracts, callable via `eth_call` and `eth_sendRawTransaction`.
