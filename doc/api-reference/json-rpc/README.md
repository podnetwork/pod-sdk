# JSON-RPC

Pod exposes a **JSON-RPC 2.0 API** for markets, orderbook data, transaction execution, and network information. The API is organized into three groups:

* **Orderbook Data (`ob_`)** - Access markets and orderbook activity via a native protocol indexer, including live snapshots, historical OHLCV candles, and account-level order history.
* **Ethereum Interface (`eth_`)** - An Ethereum-compatible execution layer for balances, nonces, transactions, contract calls, logs, and real-time subscriptions using standard Ethereum tooling.
* **Network & Consensus (`pod_`)** - Pod-specific endpoints for inspecting validator committees and consensus data for monitoring and verification of the network's state.

The API is Ethereum-compatible - existing tooling and libraries work out of the box.

> **Note:** The request path is not semantically meaningful. All JSON-RPC requests go to `/`.

***

### Differences with Ethereum RPC

Pod is not a blockchain and has no blocks. Most `eth_` methods work as expected, but a few differ:

| RPC Method                | Ethereum                             | Pod                                                          |
| ------------------------- | ------------------------------------ | ------------------------------------------------------------ |
| **eth\_blockNumber**      | Returns the most recent block number | Returns the latest past perfection timestamp in microseconds |
| **eth\_getBlockByHash**   | Returns block information by hash    | Returns an empty block structure                             |
| **eth\_getBlockByNumber** | Returns block information by number  | Returns an empty block structure                             |

**Timestamps are in microseconds.** Pod uses microsecond-precision Unix timestamps wherever Ethereum uses block numbers - including `eth_blockNumber`, transaction deadlines, and TTLs.

**Block-related fields are zeroed.** Since Pod has no blocks, EVM opcodes that reference block properties (`block.number`, `block.coinbase`, `block.difficulty`, `block.basefee`) return 0. `block.timestamp` returns the local validator's timestamp at execution time.

**Transaction responses include `pod_metadata`.** Responses to `eth_getTransactionReceipt` and similar methods include an additional `pod_metadata` field containing the attestations and finality information for the transaction.

Pod also introduces new methods under the `pod_` namespace for network and consensus data, and the `ob_` namespace for real-time orderbook data.
