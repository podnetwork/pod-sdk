# Read market data

Pod's full node includes a built-in indexer that exposes live and historical market data via the `ob_` JSON-RPC endpoints. No external indexer is needed.

## List available markets

```javascript
const markets = await provider.send("ob_getMarkets", []);
// Returns: [{ id, name, base_token_symbol, quote_token_symbol, last_clearing_price, volume_24h, ... }]
```

## Get orderbook snapshot

```javascript
const orderbookId = "0x0000000000000000000000000000000000000000000000000000000000000001";
const depth = 20; // price levels per side

const snapshot = await provider.send("ob_getOrderbook", [orderbookId, depth]);
// Returns: { buys: { price: { volume, minimum_expiry } }, sells: { ... }, timestamp }
```

## Get OHLCV candles

```javascript
const candles = await provider.send("ob_getCandles", [
  orderbookId,
  startTimestamp,  // microseconds
  endTimestamp,    // microseconds
  interval,        // candle interval
]);
```

## Get order history

```javascript
const orders = await provider.send("ob_getOrders", [
  walletAddress,
  { clob_ids: [orderbookId] },
]);
// Returns: [{ hash, side, status, price, remainingBase, filledBase, filledQuote, ... }]
```

## Get positions

```javascript
const positions = await provider.send("ob_getPositions", [walletAddress]);
```

See the [JSON-RPC reference](../json-rpc/README.md) for the full `ob_` API specification.
