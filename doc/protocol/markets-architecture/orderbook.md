# Orderbook

Pod has an enshrined central limit order book (CLOB) built into the protocol as a precompile at `0x000000000000000000000000000000000000C10B`. See the [Orderbook Spot precompile](../../api-reference/applications-precompiles/orderbook-spot.md) for the full interface.

## Order Types

The orderbook supports limit orders and market orders. The direction of a trade is determined by the sign of the volume parameter - positive for buy/bid, negative for sell/ask.

All markets use 1e18 tick sizes, matching the token decimal standard.

## Market Data

The full node includes a built-in indexer for both live and historical market data. This provides orderbook snapshots, OHLCV candles, account-level order history, and position data without requiring users to run their own indexer. See the [`ob_` endpoints](../../api-reference/json-rpc/README.md) in the JSON-RPC reference.

## AMM Orderbook

{% hint style="info" %}
Coming soon.
{% endhint %}

Pod's orderbook allows traders to attach custom EVM contracts that define pricing curves for their orders. This enables AMMs and limit orders to coexist natively on the same book. Markets can be bootstrapped using passive AMM curves and progressively transition to professional market maker liquidity for tighter spreads and better price discovery. Market makers can update orders across the entire pricing curve with minimal state changes.
