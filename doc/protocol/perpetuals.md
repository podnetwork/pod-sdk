# Perpetuals

Pod supports perpetual futures as a native market type. Perpetual contracts track the price of an underlying asset without expiry, using a funding rate mechanism to keep the contract price aligned with the spot price.

## Margin

Pod uses cross margin. Spot and perpetual balances are held together in the market contract and collectively used as margin for open positions. There is no isolated margin mode - users who want isolated positions can use separate addresses. Subaccount support is planned for the future.

## Funding

The funding rate is calculated every 8 hours. Payments are continuous and applied every batch - rather than settling in a single payment at the end of each period, the funding accrues incrementally across batches.

## Liquidation

- A position requires initial margin to open. The maintenance margin is typically half of the initial margin.
- When the sum of the portfolio's maintenance margin exceeds the account's equity, the portfolio becomes eligible for liquidation.
- Liquidations are submitted as market orders into the order book. They contribute to liquidity and are matched like normal orders.
- If equity falls below one-third of the maintenance margin, the entire portfolio is transferred to the backstop vault.
- If equity goes negative, auto-deleveraging (ADL) is triggered.

## Auto-Deleveraging (ADL)

When an account's equity is negative, ADL closes positions on the profitable side of the market to cancel out the negative equity:

- Positions on the opposite side are sorted by leverage (highest first).
- These positions are closed at the last batch price until all negative equity is offset.
- The underwater position itself is also closed.
