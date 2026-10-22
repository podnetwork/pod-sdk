# REST API

Pod full nodes serve a read-only REST API under `/v1` on the JSON-RPC port. The base URL is the RPC URL plus `/v1`; for the testnet, `https://rpc.podtestnet.dev/v1`. All routes are `GET` and allow any origin (CORS).

* Markets, Account and Explorer routes (`/v1/clob/*`, `/v1/tx/{hash}`, `/v1/transactions`) require a node running the CLOB indexer.
* Bridge routes (`/v1/bridge/*`) are served by every node.

Errors are plain text: `400` for a malformed path or query parameter, `404` where a route says so, and `503` (`clob indexer unavailable`) when the indexer or execution engine could not answer. Bridge routes answer a failed read with an empty `500`.

***

### Caching

Responses carry a `Cache-Control` header:

| Header                                | Routes                                                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `public, max-age=31536000, immutable` | `candles` once every bucket of the requested window has closed; `orders` and `activity` once the page's upper bound has been reached by solution time and every order on it is terminal. |
| `public, max-age=60`                  | `markets`.                                                                                                                                |
| `no-store`                            | Everything else under `/v1/clob`, `/v1/tx` and `/v1/transactions`, and the cases above that are not yet final.                            |

Bridge routes set no `Cache-Control` header.

To get a cacheable page, bound it in the past: pass `to` on `candles` and `activity`, and `until` or a `cursor` on `orders`.

### Encodings

| Value                                 | Encoding                                                               |
| ------------------------------------- | ---------------------------------------------------------------------- |
| Addresses, hashes, orderbook ids      | `0x` hex. Orderbook ids are always the full 32 bytes.                  |
| Timestamps                            | Microseconds, as JSON numbers — except order and trigger `deadline`, which is a decimal string. |
| Unsigned amounts and prices (1e18)    | `0x` hex on `candles`, `orderbook` (price-level keys are decimal strings), `solutions`, `orders`, `fills`, `positions`, `balances`, `triggers`, the `order` entries of `activity`, and the bridge routes. |
| Signed amounts (sizes, PnL, funding)  | Decimal strings everywhere.                                            |
| `markets`, `markets/stats`, `backstop-transfers`, non-order `activity` entries | Every amount and price is a decimal string.   |
| Bridge `proof`, `aux_tx_suffix`       | JSON arrays of byte values.                                            |

Query parameters follow their route: `candles` `from`/`to` and `orders` `until` are unix seconds; every other time parameter is microseconds.

### REST then websocket

REST seeds state; the [websocket subscriptions](../json-rpc/README.md) keep it current. Seed responses carry `solution_now` (`solution_now_us` on `candles`), the newest batch deadline they reflect. Subscribe with `since` set to that value. Delta channels replay every tick after it; state channels (`pod_markets`, `pod_positions`, `pod_triggers`) send one current snapshot. If the channel rejects `since` as too old, seed from REST again.

| Seed from                           | Then subscribe to |
| ----------------------------------- | ----------------- |
| `/v1/clob/orders/{account}`         | `pod_orders_v2`   |
| `/v1/clob/activity/{account}`       | `pod_activity`    |
| `/v1/clob/candles/{orderbook}`      | `pod_candles` (`since` is the forming bucket's start − 1µs, so its earlier trades replay; replay holds 16,384 ticks, about 2.3h, so above `1h` seed the forming bar from closed `1h` candles first) |
| `/v1/clob/markets/stats`            | `pod_markets`     |
| `/v1/bridge/withdrawals/{account}`  | `pod_withdrawals` (`since` is the last `timestamp_us`) |
