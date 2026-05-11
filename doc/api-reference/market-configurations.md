# Market Configurations

Each market on Pod is created with a set of protocol-level parameters that govern trading, risk, and settlement behavior.

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
| Funding Interval | Funding rate calculation period (fixed at 8 hours network-wide) |
| Oracle | Price feed source (Pyth asset) |

## Live Markets

All markets are quoted in USD (the native token, address `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`). The `x` suffix on base symbols denotes synthetic representations of the underlying assets. Perpetual markets use [Pyth](https://pyth.network/) price feeds as the oracle. To discover markets at runtime, call [`ob_getMarkets`](https://docs.v2.pod.network/api-reference/json-rpc).

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
| NVDAx-USD | `0x0000000000000000000000000000000000000000000000000000000000000001` | `0x0000000000000000000000000000000000000001` |
| AAPLx-USD | `0x0000000000000000000000000000000000000000000000000000000000000002` | `0x0000000000000000000000000000000000000002` |
| GOOGLx-USD | `0x0000000000000000000000000000000000000000000000000000000000000003` | `0x0000000000000000000000000000000000000003` |
| QQQx-USD | `0x0000000000000000000000000000000000000000000000000000000000000004` | `0x0000000000000000000000000000000000000004` |
| SPYx-USD | `0x0000000000000000000000000000000000000000000000000000000000000005` | `0x0000000000000000000000000000000000000005` |
| GLDx-USD | `0x0000000000000000000000000000000000000000000000000000000000000006` | `0x0000000000000000000000000000000000000006` |

### Perpetual Markets

| Market | Market ID (`bytes32`) | Max Leverage | Oracle |
| ------ | --------------------- | ------------ | ------ |
| BTC-USD | `0x0000000000000000000000000000000000000000000000000000000000000007` | 10x | Pyth `Btc` |
{% endtab %}

{% tab title="Mainnet" %}
{% hint style="info" %}
**Mainnet is not live yet.** Market configurations will be published here once mainnet launches.
{% endhint %}
{% endtab %}
{% endtabs %}
