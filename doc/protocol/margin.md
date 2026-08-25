# Margin

Pod uses cross margin. There is a single collateral asset, USD, shared between perpetual and spot markets, so there is no need to transfer between the two.

## Account state

Each account is summarized by a handful of quantities.

Start with **cash** - the part of the account not tied to any open position's unrealized PnL. It accumulates deposits, incoming funding, and PnL realized when a position is reduced, flipped, or closed, and decreases on withdrawals and outgoing funding:

```
cash = deposits − withdrawals + funding_payments + realized_pnl
```

(See [Per-position payment](perpetuals.md#per-position-payment) for how funding settles.)

**Equity** is the account's mark-to-market value: cash plus the PnL on every open position, where each position's PnL is `(mark_price − entry_price) × position.size`:

```
equity = cash + sum pnl over open positions
```

A position's **notional** is its mark-to-market size, and the account's **effective leverage** is total notional divided by equity:

```
notional           = sum over open positions: |position.size| × mark_price
effective_leverage = notional / equity
```

## Margin requirements

Every open position contributes to two margin levels for the account: **initial margin**, required to open or increase a position, and **maintenance margin**, required to keep it open. Each contributes a fraction of its notional:

```
locked_margin      = sum over open positions: |position.size| × mark_price × initial_margin_ratio
liquidation_margin = sum over open positions: |position.size| × mark_price × maintenance_margin_ratio
```

`initial_margin_ratio` and `maintenance_margin_ratio` are per-market parameters, with the maintenance ratio strictly smaller.

The headroom between equity and `locked_margin` is the **available margin** - new positions can be opened, or existing ones increased, only while it is non-negative:

```
available_margin = equity − locked_margin
```

The maximum cash that can be withdrawn at any time is the available margin, floored at zero (and forced to zero when equity falls below `liquidation_margin`):

```
withdrawable_cash = max(0, available_margin)
```

That is the ceiling the account imposes. What actually leaves is further bounded by the bridge: a withdrawal is claimed on another chain, so its amount must be a whole number of that chain's token units and must fall inside the token's `[min, max]`. See [Withdrawals leave Pod](https://docs.v2.pod.network/api-reference/applications-precompiles/orderbook) for the exact rules.

When `equity < liquidation_margin`, positions become eligible for liquidation.

## Liquidation

- Liquidations are placed as reduce-only limit orders at the bankruptcy price. They rest on the book across batches — refreshed as the bankruptcy price drifts, and canceled if the account recovers — so they contribute to liquidity.
- If the account's equity falls below 2/3rd of `liquidation_margin`, the entire portfolio is transferred to the backstop vault.
- If equity goes negative, auto-deleveraging (ADL) is triggered.

## Auto-Deleveraging (ADL)

When an account's equity is negative, ADL closes positions on the profitable side of the market to cancel out the negative equity:

- Positions on the opposite side are ranked by an ADL score — profit ratio × leverage — highest first, with accounts at non-positive equity ranked before all others.
- These positions are closed at the previous batch's mark price until all negative equity is offset.
- The underwater account's losing legs are partially closed just enough to bring its equity back to zero; the remaining portfolio is then swept to the backstop vault.
