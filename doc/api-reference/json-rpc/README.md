# JSON-RPC

Pod exposes a **JSON-RPC 2.0 API** that provides programmatic access to markets, orderbook data, transaction execution, and network-level information. The API is designed for **traders, market makers, and developers** who want to build trading systems, dashboards, bots, or infrastructure on top of the Pod protocol using familiar Ethereum tooling.

The Pod JSON-RPC API is organized into three logical groups:

* [**Orderbook Data (`ob_`)**](/broken/pages/ltcTLdaEzSpZYwkPeQTI): Access markets and orderbook activity via a native protocol indexer, including live snapshots, historical OHLCV candles, and account-level order history.
* [**Ethereum Interface (`eth_`)**](/broken/pages/T2SItYuFfxQiMARJORxo): An Ethereum-compatible execution layer for balances, nonces, transactions, contract calls, logs, and real-time subscriptions using standard Ethereum tooling.
* [**Network & Consensus (`pod_`)**](/broken/pages/SsWAaWm4LLhr5bPUjtqL): Pod-specific endpoints for inspecting validator committees and consensus data for monitoring and verification of the network's state.

If you are already comfortable with Ethereum and JSON-RPC, you can interact with Pod immediately without learning a new request or execution model.

***

### RPC Endpoint

You can connect to Pod using the following JSON-RPC endpoint:

```
https://tapforce-rpc.pod.network/
```

The API follows the standard JSON-RPC 2.0 request/response format. All requests are sent via HTTP `POST`, and the method being executed is defined by the `method` field in the request body.

> **Note:** The request path is not semantically meaningful. You may send all JSON-RPC requests to `/`. Any path segments shown in this documentation are provided for organizational and readability purposes only.

### Differences with Ethereum RPC

Pod is not a blockchain and has no blocks. Most `eth_` methods work as expected, but a few differ:

| RPC Method | Ethereum | Pod |
|---|---|---|
| **eth_blockNumber** | Returns the most recent block number | Returns the latest past perfection timestamp in microseconds |
| **eth_getBlockByHash** | Returns block information by hash | Returns an empty block structure |
| **eth_getBlockByNumber** | Returns block information by number | Returns an empty block structure |

Pod also introduces new methods under the `pod_` namespace for network and consensus data, and the `ob_` namespace for real-time orderbook data.
