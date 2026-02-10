# API Reference

Pod extends Ethereum. Developers interact with Pod using the same toolchain they already know — `ethers.js`, `viem`, `web3.py`, `alloy`, `cast`, or any EVM-compatible library. No new SDKs or custom clients required.

```javascript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.v1.dev.pod.network");
const balance = await provider.getBalance("0xYourAddress");
```

Pod supports standard Ethereum RPC methods under the `eth_` namespace, with a few differences due to Pod's blockless architecture. Pod also introduces additional namespaces for protocol-specific and orderbook functionality:

* [**JSON-RPC**](json-rpc/README.md) — Standard `eth_` methods, Pod-specific `pod_` extensions, and orderbook data via `ob_` endpoints.
* [**Applications (Precompiles)**](applications-precompiles/README.md) — Enshrined on-chain applications (orderbook, auctions) exposed as precompile contracts, callable via `eth_call` and `eth_sendRawTransaction`.
* [**Network Config**](network-config.md) — Chain ID, RPC URLs, faucet, and explorer for the live devnet.

### Coming from Ethereum

Pod is not a blockchain and has no blocks. Most `eth_` methods work as expected, but a few differ:

| RPC Method | Ethereum | Pod |
|---|---|---|
| **eth_blockNumber** | Returns the most recent block number | Returns the latest past perfection timestamp in microseconds |
| **eth_getBlockByHash** | Returns block information by hash | Returns an empty block structure |
| **eth_getBlockByNumber** | Returns block information by number | Returns an empty block structure |

Pod introduces new methods under the `pod_` namespace for network and consensus data, and the `ob_` namespace for real-time orderbook data. See the [JSON-RPC](json-rpc/README.md) section for full details.
