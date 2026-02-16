# Order book

Pod has an enshrined central limit order book (CLOB) built into the protocol as a precompile at `0x000000000000000000000000000000000000C10B`. See the [Order book Spot precompile](https://docs.v2.pod.network/guides-references/applications-precompiles/orderbook-spot) for the full interface.

Orders are immediately added to the order book as soon as they are finalized through the standard attestation flow - they do not wait for the current batch to conclude. This means cancellations and modifications are also applied responsively, before the next matching round. This is better than systems that execute cancels and modifications at the top of a block, because in Pod the liquidity from cancels and updates can already be reflected in the book before waiting for batch confirmation.

## Order Types

The order book supports limit orders and market orders. The direction of a trade is determined by the sign of the volume parameter - positive for buy/bid, negative for sell/ask.

All markets use 1e18 tick sizes, matching the token decimal standard.

## Market Data

The full node includes a built-in indexer for both live and historical market data. This provides order book snapshots, OHLCV candles, account-level order history, and position data without requiring users to run their own indexer. See the [`ob_` endpoints](https://docs.v2.pod.network/guides-references/json-rpc) in the JSON-RPC reference.

## AMM Order book

{% hint style="info" %}
Coming soon.
{% endhint %}

Pod's order book allows traders to attach custom EVM contracts that define pricing curves for their orders. This enables AMMs and limit orders to coexist natively on the same book. Markets can be bootstrapped using passive AMM curves and progressively transition to professional market maker liquidity for tighter spreads and better price discovery. Market makers can update orders across the entire pricing curve with minimal state changes.
