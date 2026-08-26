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
**Transaction hashes as identifiers.** Pod often uses the **transaction hash** — the value returned by `eth_sendRawTransaction` when the transaction was submitted — as the identifier for the entity that transaction created. For example, a bridge withdrawal's claim proof is fetched by the withdrawal tx hash, and account recovery references its target transaction by tx hash.

A bridge withdrawal follows this rule: it is always its own transaction, so that transaction's hash is its identity — what its outcome is reported under, and what its claim proof is fetched by at `GET /v1/bridge/withdrawals/by-id/{tx_hash}` or `pod_getBridgeClaimProof(txHash)`. Withdrawals made before this design carry a computed id in the same field, served by the same lookups; only current ones are real transaction hashes, so do not feed a historical value to `eth_getTransactionByHash`.

**Exception — orderbook orders and transfers.** A resting order is identified by a computed `order_id = keccak256(abi.encode(signer, nonce, sequence))`, **not** its `submitOrder` tx hash, because one transaction can carry several intents. A `transfer` is keyed the same way, as a `transfer_id`, and that is what its outcome is reported under on `pod_transfers`. The orderbook precompile's `cancel(orderbookId, canceledOrder, …)`, `update(orderbookId, updatedOrder, …)`, and `getOrders(orderbookId, orderIds)` all take this `order_id`; `ob_getOrders` returns it as `order_id` (and the originating tx hash separately as `tx_hash`). See the [Orderbook precompile](applications-precompiles/orderbook.md) for details.
{% endhint %}

Pod supports standard Ethereum RPC methods under the `eth_` namespace, with a few differences due to Pod's blockless architecture. Pod also introduces additional namespaces for protocol-specific and orderbook functionality:

* [**JSON-RPC**](json-rpc/README.md) - Standard `eth_` methods, Pod-specific `pod_` extensions, and orderbook data via `ob_` endpoints.
* [**Precompiles**](applications-precompiles/README.md) - Enshrined applications and internal protocol operations exposed as precompile contracts, callable via `eth_call` and `eth_sendRawTransaction`.
