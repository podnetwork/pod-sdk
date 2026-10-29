# Market Configurations

Each market on Pod is created with a set of protocol-level parameters that govern trading, risk, and settlement behavior.

{% hint style="info" %}
**Orderbook precompile address:** `0x50d0000000000000000000000000000000000002` — all native markets (spot and perp) share this single precompile. See the [Orderbook precompile reference](applications-precompiles/orderbook.md) for the ABI.
{% endhint %}

## Common Parameters

| Parameter | Description |
| --------- | ----------- |
| Market ID | Unique identifier (`bytes32`) for the market |
| Base Asset | The asset being traded (e.g. BTC, ETH) |
| Quote Asset | The settlement currency (e.g. USDC) |
| Market Type | `spot` or `perpetual` |
| Tick Size | Minimum price increment (1e18) |
| Solver | Public key of the solver responsible for settling batches |

## Perpetual Parameters

| Parameter | Description |
| --------- | ----------- |
| Max Leverage | Maximum allowed leverage; set per market at creation |
| Initial Margin | Required margin to open a position. Derived: `1 / Max Leverage` |
| Maintenance Margin | Margin floor below which the position becomes eligible for liquidation. Derived: `Initial Margin / 2` |
| Interest Rate | Per-market funding constant, defaulting to 0.01% per 8 hours. See [Perpetuals → Funding](../protocol/perpetuals.md) |
| Oracle | Price feed source (Pyth asset) |

## Live Markets

All markets are quoted in USD (the native token, address `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`). The `x` suffix on base symbols denotes synthetic representations of the underlying assets. Perpetual markets use [Pyth](https://pyth.network/) price feeds as the oracle. To discover markets at runtime, call [`GET /v1/clob/markets`](https://docs.v2.pod.network/guides-references/references/rest).

{% tabs %}
{% tab title="Testnet" %}
### Global

| Parameter | Value |
| --------- | ----- |
| Batch Interval | 500ms |
| Initial Margin | `1 / Max Leverage` |
| Maintenance Margin | `0.5 × Initial Margin` |
| Backstop | `0.75 × Initial Margin` |

### Spot Markets

| Market | Market ID (`bytes32`) | Base Token Address |
| ------ | --------------------- | ------------------ |
| NVDAx-USD  | `0x0000000000000000000000000000000000000000000000000000000000000001` | `0x0000000000000000000000000000000000000001` |
| AAPLx-USD  | `0x0000000000000000000000000000000000000000000000000000000000000002` | `0x0000000000000000000000000000000000000002` |
| GOOGLx-USD | `0x0000000000000000000000000000000000000000000000000000000000000003` | `0x0000000000000000000000000000000000000003` |
| QQQx-USD   | `0x0000000000000000000000000000000000000000000000000000000000000004` | `0x0000000000000000000000000000000000000004` |
| SPYx-USD   | `0x0000000000000000000000000000000000000000000000000000000000000005` | `0x0000000000000000000000000000000000000005` |
| GLDx-USD   | `0x0000000000000000000000000000000000000000000000000000000000000006` | `0x0000000000000000000000000000000000000006` |

### Perpetual Markets

| Market | Market ID (`bytes32`) | Base Token Address | Max Leverage | Oracle |
| ------ | --------------------- | ------------------ | ------------ | ------ |
| NVDA-USD  | `0x0000000000000000000000000000000000000000000000000000000000000007` | `0x0000000000000000000000000000000000000007` | 20x | Pyth `Nvda`  |
| AAPL-USD  | `0x0000000000000000000000000000000000000000000000000000000000000008` | `0x0000000000000000000000000000000000000008` | 20x | Pyth `Aapl`  |
| GOOGL-USD | `0x0000000000000000000000000000000000000000000000000000000000000009` | `0x0000000000000000000000000000000000000009` | 20x | Pyth `Googl` |
| QQQ-USD   | `0x000000000000000000000000000000000000000000000000000000000000000a` | `0x000000000000000000000000000000000000000a` | 20x | Pyth `Qqq`   |
| SPY-USD   | `0x000000000000000000000000000000000000000000000000000000000000000b` | `0x000000000000000000000000000000000000000b` | 20x | Pyth `Spy`   |
| GLD-USD   | `0x000000000000000000000000000000000000000000000000000000000000000c` | `0x000000000000000000000000000000000000000c` | 20x | Pyth `Gld`   |

{% hint style="info" %}
Market lists may change as we expand testnet coverage. To stay current, fetch the live list at runtime from [`GET /v1/clob/markets`](https://docs.v2.pod.network/guides-references/references/rest) rather than hard-coding ids.
{% endhint %}
{% endtab %}

{% tab title="Mainnet" %}
### Global

| Parameter | Value |
| --------- | ----- |
| Batch Interval | 500ms |
| Initial Margin | `1 / Max Leverage` |
| Maintenance Margin | `0.5 × Initial Margin` |
| Funding Interval | 8 hours |
| Open Interest Caps | None |

### Perpetual Markets

Currently listed markets:

| Market | Market ID (`bytes32`) | Base Token Address | Max Leverage | Oracle |
| ------ | --------------------- | ------------------ | ------------ | ------ |
| NVDA-USD | `0x0000000000000000000000000000000000000000000000000000000000000001` | `0x0000000000000000000000000000000000000001` | 20x | Pyth |

| Market | Tick Size | Lot Size | Min Notional | Initial Margin | Maintenance Margin | Maker / Taker Fee |
| ------ | --------- | -------- | ------------ | -------------- | ------------------ | ----------------- |
| NVDA-USD | $0.01 (`1e16`) | 0.000001 (`1e12`) | 0 | 5% | 2.5% | 0% / 0% |

{% hint style="info" %}
Fetch the live list at runtime from [`ob_getMarkets`](https://docs.v2.pod.network/api-reference/json-rpc) or `GET /v1/clob/markets` rather than hard-coding ids.
{% endhint %}
{% endtab %}
{% endtabs %}
