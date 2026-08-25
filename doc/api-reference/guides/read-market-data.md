# Read market data

Pod's full node includes a built-in indexer that exposes live and historical market data via the `ob_` JSON-RPC endpoints. No external indexer is needed.

## List available markets

```javascript
const markets = await provider.send("ob_getMarkets", []);
// Returns: [{ id, name, base_token_symbol, quote_token_symbol, last_clearing_price, volume_24h, ... }]
```

## Get orderbook snapshot

```javascript
const orderbookId = "0x0000000000000000000000000000000000000000000000000000000000000001"; // NVDAx-USD spot
const depth = 10; // price levels per side (the served snapshot retains at most 10)

const snapshot = await provider.send("ob_getOrderbook", [orderbookId, depth]);
// Returns: { buys: { price: { volume } }, sells: { ... }, timestamp }
```

## Get OHLCV candles

```javascript
const candles = await provider.send("ob_getCandles", [
  orderbookId,
  {
    resolution: "1m", // "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w" | "1M"
    from_ts: startTimestamp, // microseconds
    to_ts: endTimestamp,     // microseconds, optional
    limit: 100,              // optional
  },
]);
```

## Get order history

```javascript
const orders = await provider.send("ob_getOrders", [
  walletAddress,
  { orderbook_id: orderbookId },
]);
// Returns: { orders: [{ order_id, tx_hash, side, status, price, initial_size,
//                       filled_base_amount, filled_quote_amount, ... }],
//            total_count, next_cursor }
```

## Get positions

```javascript
const positions = await provider.send("ob_getPositions", [walletAddress]);
```

See the [JSON-RPC reference](../json-rpc/README.md) for the full `ob_` API specification.
