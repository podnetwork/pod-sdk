# Perpetuals

Pod supports perpetual futures as a native market type. Perpetual contracts track the price of an underlying asset without expiry, using a funding rate mechanism to keep the contract price aligned with the spot price.

## Margin

Pod uses cross margin. There is a single collateral asset, USD, shared between perpetual and spot markets, so there is no need to transfer between the two.

## Mark price

Each perp market maintains a **mark price** — a smoothed reference price derived from the order book and the oracle. Mark price is the reference used for margin, liquidation, take-profit/stop-loss, and everything else related to leverage and PnL.

It is recomputed every batch:

```
price_diff_ema = clamp(ema(clearing_or_mid − oracle_price, 3 min), max_premium)
mark_price     = clamp(oracle_price + price_diff_ema, last_mark_price, mark_clamp_pct)
```

- `clearing_or_mid` — the batch's uniform clearing price if it matched, otherwise the order book mid price.
- `ema(·, 3 min)` — a 3-minute exponential moving average of the gap between the book price and the oracle.
- `max_premium` — a per-market bound; `price_diff_ema` is clamped to ±`max_premium` so mark cannot drift arbitrarily far from the oracle.
- `mark_clamp_pct` — a per-market bound limiting how far `mark_price` can move from the previous batch's mark price in a single batch.

## Funding

Perpetuals use a funding mechanism to keep the mark price aligned with the underlying oracle price. The funding rate is recomputed and applied every batch — each open position pays or receives its share directly into cash, with no per-period lump payment.

### Funding rate

For each market, on every batch:

```
funding_rate = clamp(
    interest_rate
      + saturate(impact_bid − oracle_price)
      − saturate(oracle_price − impact_ask),
    max_funding_rate,
)
```

- `oracle_price` — the spot price reported by the oracle for the underlying.
- `impact_bid` / `impact_ask` — the best price at which a fixed impact volume can be bought / sold, computed with the batch auction logic.
- `saturate(x)` — `max(x, 0)`: each term contributes only when it pushes the perp away from spot.
- `interest_rate` — a per-market constant, defaulting to 0.01% per 8 hours.
- `max_funding_rate` — a per-market cap on the rate's magnitude, defaulting to 4% per hour.
- `funding_rate` is signed: positive means longs pay shorts, negative means shorts pay longs.

When the perp trades at a premium (`impact_bid` above the oracle) the first `saturate` term is positive and longs pay; when it trades at a discount (`impact_ask` below the oracle) the second term dominates and shorts pay. The rate is computed and applied per batch — `interest_rate` and `max_funding_rate` are shown normalized to 8-hour and hourly figures only for readability.

### Per-position payment

Every batch, each open position settles funding into cash:

```
funding_payment = funding_rate × oracle_price × position.size
realized_pnl   −= funding_payment
```

`position.size` is signed (long positive, short negative), so a positive `funding_rate` charges longs and credits shorts, and vice versa. After settlement, the position's unrealized PnL is pure price drift: `(mark − entry) × size`.

## Liquidation

- A position requires initial margin to open. The maintenance margin is the minimum collateral to keep your position.
- When the sum of the portfolio's maintenance margin exceeds the account's equity, a position can become eligible for liquidation.
- Liquidations are submitted as market orders into the order book. They contribute to liquidity and are matched like normal orders.
- If the account's equity falls below 2/3rd of maintenance margin, the entire portfolio is transferred to the backstop vault.
- If equity goes negative, auto-deleveraging (ADL) is triggered.

## Auto-Deleveraging (ADL)

When an account's equity is negative, ADL closes positions on the profitable side of the market to cancel out the negative equity:

- Positions on the opposite side are sorted by leverage (highest first).
- These positions are closed at the last batch price until all negative equity is offset.
- The underwater position itself is also closed.
