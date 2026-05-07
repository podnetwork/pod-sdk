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

## Perpetual Markets

All perpetual markets are quoted in pUSD and use [Pyth](https://pyth.network/) price feeds as the oracle.

| Market | Asset | Max Leverage | Initial Margin | Maintenance Margin | Batch Interval |
| ------ | ----- | ------------ | -------------- | ------------------ | -------------- |
| AAPL-USD | Apple | 20x | 5% | 2.5% | 100ms |
| GOOGL-USD | Google | 20x | 5% | 2.5% | 100ms |
| NVDA-USD | Nvidia | 20x | 5% | 2.5% | 100ms |
| NQ-USD | Nasdaq 100 | 20x | 5% | 2.5% | 100ms |
| SP500-USD | S&P 500 | 20x | 5% | 2.5% | 100ms |
| XAU-USD | Gold | 20x | 5% | 2.5% | 100ms |
