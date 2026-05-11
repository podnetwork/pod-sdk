# Order Book

Pod has an enshrined central limit order book (CLOB) built into the protocol as a precompile.

Orders are immediately added to the order book as soon as they are finalized through the standard attestation flow - they do not wait for the current batch to conclude. This means cancellations and modifications are also applied responsively, before the next matching round. This is better than systems that execute cancels and modifications at the top of a block, because in Pod the liquidity from cancels and updates can already be reflected in the book before waiting for batch confirmation.

## Order Types

The order book supports limit orders and market orders. The direction of a trade is determined by the sign of the volume parameter - positive for buy/bid, negative for sell/ask.

All markets use 1e18 tick sizes, matching the token decimal standard.

## Market Data

The full node includes a built-in indexer for both live and historical market data. This provides order book snapshots, OHLCV candles, account-level order history, and position data without requiring users to run their own indexer. See the [`ob_` endpoints](https://docs.v2.pod.network/guides-references/json-rpc) in the JSON-RPC reference.

## Matching

Pod uses frequent batch auctions to match orders. Instead of processing orders one at a time as they arrive (continuous trading), orders are collected over a short interval and matched together at a single uniform clearing price. This removes timing-based ordering advantages - competition is on price alone.

Each market has a fixed **batch interval** that defines how often matching rounds run. At the end of every interval the solver settles a batch covering all orders whose `deadline` lands at or before that interval. See [Market Configurations](https://docs.v2.pod.network/guides-references/market-configurations) for the per-market interval on live markets.

### Clearing

At the end of each batch interval, the matching engine runs a double auction using the average mechanism (for simplification, we describe a case where all orders have unit size):

1. Buy orders are sorted by price in descending order: b1 >= b2 >= ... >= bn.
2. Sell orders are sorted by price in ascending order: s1 <= s2 <= ... <= sn.
3. The breakeven index k is the largest index where bk >= sk.
4. The clearing price is set to the average of the kth values: p = (bk + sk) / 2.
5. The first k buyers and sellers trade at price p.

All matched orders execute at the same uniform price. No participant gets a better or worse price based on when their order arrived within the batch.

### Batch Deadline

The `deadline` parameter in `submitOrder` specifies the latest batch the user wants their order included in. The order can be included in any batch up to and including the deadline batch.

The deadline can currently be set to a maximum of 10 minutes in the future. This is the maximum last look duration. We expect to shorten this as the network matures.

The protocol guarantees (via [past perfection](network-architecture/timestamping.md#past-perfection)) that if an order receives n - f attestations within the deadline - which it will if it was sent sufficiently early - it will be part of a batch up to and including the latest batch specified by the deadline.

Transactions that do not receive a finality certificate may still be used for matching, but they do not get to settle - the user cannot withdraw funds even if their order is matched. This is by design, to prevent last look attacks.

Traders can set the deadline to be small to ensure they are matched quickly, but they open up the risk of not being able to claim funds if they do not receive sufficient attestations in time. Traders setting recent deadlines should estimate their network latency to honest validators.

### Solver

The solver is the service responsible for settling a batch. It can be a rotating set of solvers or a single entity, configurable per market. The solver waits for the auction deadline and then settles the batch.

The solver does not get any additional advantage. It cannot censor transactions or include transactions that were not submitted in time. It has some flexibility on whether to include out-of-time transactions - orders submitted after the batch timestamp, or orders that received some attestations but fewer than the required n − f. These orders always lose, because they cannot claim funds even if they get matched.

### References

* E. Budish, P. Cramton, J. Shim. _The High-Frequency Trading Arms Race: Frequent Batch Auctions as a Market Design Response._ Quarterly Journal of Economics, 2015.

## AMM Order Book

{% hint style="info" %}
Coming soon.
{% endhint %}

Pod's order book allows traders to attach custom EVM contracts that define pricing curves for their orders. This enables AMMs and limit orders to coexist natively on the same book. Markets can be bootstrapped using passive AMM curves and progressively transition to professional market maker liquidity for tighter spreads and better price discovery. Market makers can update orders across the entire pricing curve with minimal state changes.
