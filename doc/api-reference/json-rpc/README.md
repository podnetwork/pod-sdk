# JSON-RPC

Pod exposes a **JSON-RPC 2.0 API** for markets, orderbook data, transaction execution, and network information. The API is organized into three groups:

* **Orderbook Data (`ob_`)** - **Deprecated.** Read markets and orderbook activity from the [REST API](../rest/README.md) and the `pod_*` subscriptions instead. The table below maps each `ob_` method to its replacement.
* **Ethereum Interface (`eth_`)** - An Ethereum-compatible execution layer for balances, nonces, transactions, contract calls, logs, and real-time subscriptions using standard Ethereum tooling.
* **Network & Consensus (`pod_`)** - Pod-specific endpoints for inspecting validator committees and consensus data for monitoring and verification of the network's state.

The API is Ethereum-compatible - existing tooling and libraries work out of the box.

> **Note:** The request path is not semantically meaningful. All JSON-RPC requests go to `/`.

***

### Deprecated `ob_` methods

The `ob_` methods are still served, but are deprecated. Use these instead:

| Method                    | REST route                                                   | Subscription    |
| ------------------------- | ------------------------------------------------------------ | --------------- |
| `ob_getMarkets`           | `GET /v1/clob/markets` (config) and `GET /v1/clob/markets/stats` (live stats) | `pod_markets`   |
| `ob_getOrderbook`         | `GET /v1/clob/orderbook/{orderbook}`                         | `pod_orderbook` |
| `ob_getCandles`           | `GET /v1/clob/candles/{orderbook}`                           | `pod_candles`   |
| `ob_getOrders`            | `GET /v1/clob/orders/{account}`                              | `pod_orders`    |
| `ob_getFills`             | `GET /v1/clob/fills/{account}`                               |                 |
| `ob_getPositions`         | `GET /v1/clob/positions/{account}` (perps) and `GET /v1/clob/balances/{account}` (spot) | `pod_positions` |
| `ob_getTriggers`          | `GET /v1/clob/triggers/{account}`                            | `pod_triggers`  |
| `ob_getBackstopTransfers` | `GET /v1/clob/backstop-transfers/{account}`                  |                 |
| `ob_getSolutions`         | `GET /v1/clob/solutions`                                     |                 |
| `ob_getOraclePrices`      | `GET /v1/clob/markets/stats`                                 | `pod_markets`   |
| `ob_getFundingRates`      | `GET /v1/clob/markets/stats`                                 | `pod_markets`   |

Differences to account for when migrating:

* `GET /v1/clob/orders/{account}` has no `with_fills`; read fills from `GET /v1/clob/fills/{account}`.
* `GET /v1/clob/markets/stats` returns every market and has no orderbook filter. The oracle, mark and funding fields are omitted for a market until it has oracle data, and `as_of` is `funding_last_updated_us`.
* `GET /v1/clob/candles/{orderbook}` returns only closed candles, wrapped in an envelope.

***

### Differences with Ethereum RPC

A pod block is one auction tick: its height counts ticks and its `timestamp` is the tick's deadline (in seconds). `transactions` lists the intent transactions the tick sequenced, but most header fields (`parentHash`, the roots, `logsBloom`, `miner`, `gasLimit`, `gasUsed`, …) are zero. Most `eth_` methods work as expected, but a few differ:

| RPC Method                | Ethereum                             | Pod                                                                                                                              |
| ------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **eth\_blockNumber**      | Returns the most recent block number | Returns the chain-tip height (hex). Before the first block it fails with `-32002` `Chain has no block yet`.                       |
| **eth\_getBlockByHash**   | Returns block information by hash    | Returns the block, or `null` if there is none with that hash.                                                                    |
| **eth\_getBlockByNumber** | Returns block information by number  | Returns the block, or `null` past the tip, below the oldest retained block, or before the first block. `latest`, `pending`, `safe` and `finalized` all resolve to the tip; `earliest` to the oldest retained block. Unknown tags and malformed numbers are rejected with `-32602`. |

**Timestamps are in microseconds.** Pod uses microsecond-precision Unix timestamps for transaction deadlines, TTLs and subscription cursors (`since`). Block `timestamp` is in seconds.

**Block-related fields are zeroed.** EVM opcodes that reference block properties (`block.number`, `block.coinbase`, `block.difficulty`, `block.basefee`) return 0. `block.timestamp` returns the local validator's timestamp at execution time.

**Transaction responses include `pod_metadata`.** Responses to `eth_getTransactionReceipt` and similar methods include an additional `pod_metadata` field containing the attestations and finality information for the transaction.

Pod also introduces new methods under the `pod_` namespace for network and consensus data.
