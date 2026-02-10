# API Reference

Pod provides an Ethereum-like interface, so developers can use existing toolchains and wallets out of the box - `ethers.js`, `viem`, `web3.py`, `alloy`, `cast`, or any EVM-compatible library. No new SDKs or custom clients required.

```javascript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.v1.dev.pod.network");
const balance = await provider.getBalance("0xYourAddress");
```

Pod supports standard Ethereum RPC methods under the `eth_` namespace, with a few differences due to Pod's blockless architecture. Pod also introduces additional namespaces for protocol-specific and orderbook functionality:

* [**JSON-RPC**](json-rpc/README.md)  - Standard `eth_` methods, Pod-specific `pod_` extensions, and orderbook data via `ob_` endpoints.
* [**Applications (Precompiles)**](applications-precompiles/README.md)  - Enshrined on-chain applications (orderbook, auctions) exposed as precompile contracts, callable via `eth_call` and `eth_sendRawTransaction`.
* [**Network Config**](network-config.md)  - Chain ID, RPC URLs, faucet, and explorer for the live devnet.

