# Market Configurations

Each market on Pod is created with a set of protocol-level parameters that govern trading, risk, and settlement behavior.

## Common Parameters

| Parameter | Description |
| --------- | ----------- |
| Market ID | Unique identifier (`bytes32`) for the market |
| Base Asset | The asset being traded (e.g. BTC, ETH) |
| Quote Asset | The settlement currency (e.g. USDC) |
| Market Type | `spot` or `perpetual` |
| Batch Interval | Time between matching rounds (microseconds) |
| Tick Size | Minimum price increment (1e18) |
| Solver | Public key of the solver responsible for settling batches |

## Perpetual Parameters

| Parameter | Description |
| --------- | ----------- |
| Initial Margin | Required margin to open a position |
| Maintenance Margin | Minimum margin before liquidation (typically half of initial margin) |
| Max Leverage | Maximum allowed leverage (inverse of initial margin) |
| Funding Interval | Funding rate calculation period (8 hours) |
| Oracle | Price feed source and address |
| Max Position Size | Maximum notional position size per account |

## Live Markets

All markets are quoted in USD (the native token, address `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`). The `x` suffix on base symbols denotes synthetic representations of the underlying assets. Perpetual markets use [Pyth](https://pyth.network/) price feeds as the oracle. To discover markets at runtime, call [`ob_getMarkets`](https://docs.v2.pod.network/api-reference/json-rpc).

{% tabs %}
{% tab title="Testnet" %}
### Spot Markets

| Market | Asset | Market ID (`bytes32`) | Base Token Address |
| ------ | ----- | --------------------- | ------------------ |
| NVDAx-USD | Nvidia | `0x0000000000000000000000000000000000000000000000000000000000000001` | `0x0000000000000000000000000000000000000001` |
| AAPLx-USD | Apple | `0x0000000000000000000000000000000000000000000000000000000000000002` | `0x0000000000000000000000000000000000000002` |
| GOOGLx-USD | Google | `0x0000000000000000000000000000000000000000000000000000000000000003` | `0x0000000000000000000000000000000000000003` |
| QQQx-USD | Nasdaq 100 | `0x0000000000000000000000000000000000000000000000000000000000000004` | `0x0000000000000000000000000000000000000004` |
| SPYx-USD | S&P 500 | `0x0000000000000000000000000000000000000000000000000000000000000005` | `0x0000000000000000000000000000000000000005` |
| GLDx-USD | Gold | `0x0000000000000000000000000000000000000000000000000000000000000006` | `0x0000000000000000000000000000000000000006` |

### Perpetual Markets

| Market | Asset | Market ID (`bytes32`) | Base Token Address | Max Leverage | Initial Margin | Maintenance Margin | Batch Interval |
| ------ | ----- | --------------------- | ------------------ | ------------ | -------------- | ------------------ | -------------- |
| BTC-USD | Bitcoin | `0x0000000000000000000000000000000000000000000000000000000000000007` | `0x0000000000000000000000000000000000000007` | 10x | 10% | 5% | 500ms |
{% endtab %}

{% tab title="Mainnet" %}
{% hint style="info" %}
**Mainnet is not live yet.** Market configurations will be published here once mainnet launches.
{% endhint %}
{% endtab %}
{% endtabs %}
