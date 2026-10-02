# Read market data

Pod's full node includes a built-in indexer and serves its market data two ways, on the same host as the JSON-RPC endpoint:

* **REST** under `/v1` for one-shot reads: markets, books, candles, solutions, and an account's orders and fills. See the [REST reference](../rest/README.md) for every route.
* **WebSocket subscriptions** (`eth_subscribe`) that push what changed after every auction tick.

The pattern is the same for every stream: **seed over REST, then subscribe with `since`** set to the solution time (µs) the REST response was current at. The node replays every tick after that point and then streams live, so there is no gap and no duplicate between the two.

```javascript
const REST = "https://rpc.podtestnet.dev/v1";
const orderbookId = "0x0000000000000000000000000000000000000000000000000000000000000001"; // NVDAx-USD spot
const get = async (path) => {
  const res = await fetch(`${REST}${path}`);
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
};
```

Prices, sizes and volumes are 1e18-scaled decimal strings; timestamps ending in `_us` are microseconds.

## Markets

```javascript
// Static configuration: name, tokens, fees, tick precision, lot size, status, ...
const markets = await get("/clob/markets");

// Live 24h statistics, plus the solution time they are current at.
const { solution_now, markets: stats } = await get("/clob/markets/stats");
// stats: [{ orderbook_id, last_clearing_price, volume_24h, high_24h, low_24h, mark_price, ... }]
```

Optional stats fields (`last_clearing_price`, `high_24h`, the perp fields, ...) are **omitted** until the market has the data, not sent as `null`.

## Orderbook

```javascript
const book = await get(`/clob/orderbook/${orderbookId}?depth=20`);
// { orderbook_id, buys: { "<price>": { volume } }, sells: { ... },
//   buys_count, sells_count, clearing_price, timestamp, ... }
```

`depth` keeps the best N price levels per side (it must be at least 1; omit it for the whole book). Both sides are keyed by price in **ascending** order, so the best bid is the *last* key of `buys` and the best ask the *first* key of `sells`. `buys_count`/`sells_count` count the full book even when truncated. `timestamp` is the deadline (µs) of the batch the snapshot was taken after. The route answers 404 until a batch has cleared that orderbook since the node started.

## Candles

```javascript
const nowSecs = Math.floor(Date.now() / 1000);
const { candles, range, solution_now_us } = await get(
  `/clob/candles/${orderbookId}?resolution=1m&from=${nowSecs - 3600}&to=${nowSecs}`
);
// candles: [{ timestamp, open, high, low, close, volume, quote_volume }], newest first
```

`resolution` is one of `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, `1w`, `1M`. `from`/`to` are **seconds** and select `[from, to)`; `limit` caps the page at up to 500 candles. Only closed bars are returned. To page further back, request again with `to = range.from_us / 1e6`. The still-forming bar is everything after `range.to_us`: build it from the `pod_candles` stream below.

## Solutions

```javascript
const { solutions } = await get(`/clob/solutions?orderbook=${orderbookId}&limit=50`);
// [{ orderbook_id, timestamp, clearing_price, mark_price, volume, oracle_price, funding_rate, ... }]
```

One row per orderbook per auction tick, newest first. `limit` counts ticks (1 to 200); page back with `until_us` (exclusive) set to the oldest `timestamp` you hold, or bound the window from below with `since_us` (inclusive).

## Account orders and fills

```javascript
const page = await get(`/clob/orders/${walletAddress}?limit=50`);
// { orders: [...], next_cursor, total_count, solution_now }
// next page: get(`/clob/orders/${walletAddress}?limit=50&cursor=${page.next_cursor}`)

const { fills } = await get(`/clob/fills/${walletAddress}?orderbook=${orderbookId}&from_us=${Date.now() * 1000 - 3600e6}`);
// [{ orderbook_id, order_id, price, base_amount, quote_amount, fee, timestamp, ... }]
```

Orders come newest first; `next_cursor` is `null` on the last page. Fills take `from_us`/`to_us` (`to_us` defaults to now) and up to 500 rows.

## Stream live updates

Open one WebSocket to the RPC host and subscribe once per stream. Each subscription confirms with an id; updates then arrive as `eth_subscription` notifications carrying that id.

```javascript
const ws = new WebSocket("wss://rpc.podtestnet.dev");
const handlers = new Map(); // request id -> handler, then subscription id -> handler
let nextId = 1;

function subscribe(channel, params, onUpdate) {
  const id = nextId++;
  handlers.set(id, onUpdate);
  ws.send(JSON.stringify({ jsonrpc: "2.0", id, method: "eth_subscribe", params: [channel, params] }));
}

ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.id !== undefined) {
    if (msg.error) throw new Error(`subscribe failed: ${msg.error.message}`);
    handlers.set(msg.result, handlers.get(msg.id)); // subscription confirmed
    handlers.delete(msg.id);
  } else if (msg.method === "eth_subscription") {
    const { subscription, result, error } = msg.params;
    if (error) return console.warn("subscription closed", error); // resubscribe with error.data.resume_since
    handlers.get(subscription)?.(result);
  }
};

ws.onopen = () => {
  const ids = [orderbookId];
  // Delta channels: replay every tick after `since`, then live. `since` is a
  // solution-time watermark, not a book's own timestamp: a quiet book's last
  // batch can be older than the node's replay buffer.
  subscribe("pod_orderbook", { orderbook_ids: ids, depth: 20, since: solution_now }, (snapshot) => {});
  subscribe("pod_candles", { orderbook_ids: ids, since: solution_now_us }, (tick) => {
    // { orderbook, timestamp_us, price, volume }: fold into the forming bar
  });
  subscribe("pod_orders_v2", { bidder: walletAddress, since: page.solution_now }, (frame) => {
    // one frame per orderbook per batch: orders created in it, plus events (fills, cancels, ...)
  });
  // State channel: with `since`, sends every market's current entry first, then one
  // entry per market cleared (or changing status) in each tick.
  subscribe("pod_markets", { orderbook_ids: ids, since: solution_now }, (entry) => {});
};
```

* `pod_orderbook` pushes a full snapshot (the REST shape) for each subscribed book cleared in a tick.
* `pod_candles` pushes one clearing-price tick per cleared book, not a closed bar.
* `pod_orders_v2` streams order activity; `bidder` narrows it to one account and `bidders` to up to 64. See the `eth_subscribe` entry in the [JSON-RPC reference](../json-rpc/README.md) for the frame format.
* `pod_markets` pushes the `/clob/markets/stats` entry plus the market's lifecycle (`status`, and `live_at_us`, `disable_at_us`, `settlement_price` once set).

If `since` is older than the node's replay buffer, the subscribe call fails with `-32602` `since too old`: seed again over REST and resubscribe with the new watermark. A subscription the server ends itself (a slow consumer, a node shutdown) arrives as a notification carrying `error`; see [JSON-RPC Errors](../json-rpc-errors.md#subscription-close-notifications) for how to resume.
