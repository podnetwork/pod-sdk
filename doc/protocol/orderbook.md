# Order Book

Pod has an enshrined central limit order book (CLOB) built into the protocol as a precompile.

{% hint style="info" %}
**Orderbook precompile address:** `0x50d0000000000000000000000000000000000002` (same on every Pod network). All `submitOrder` / `cancel` / `update` / `deposit` / `withdraw` calls target this address — see the [Orderbook precompile reference](https://docs.v2.pod.network/api-reference/applications-precompiles/orderbook) for the full ABI.
{% endhint %}

Orders are immediately added to the order book as soon as they are finalized through the standard attestation flow - they do not wait for the current batch to conclude. This means cancellations and modifications are also applied responsively, before the next matching round. This is better than systems that execute cancels and modifications at the top of a block, because in Pod the liquidity from cancels and updates can already be reflected in the book before waiting for batch confirmation.

## Order Types

The order book supports limit orders and market orders. The direction of a trade is determined by the sign of the volume parameter - positive for buy/bid, negative for sell/ask.

All markets use 1e18 tick sizes, matching the token decimal standard.

### Execution flags

Beyond its type, an order carries a small set of execution properties, submitted as the `flags` bitfield on `submitOrder`:

| Flag          | Effect                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `REDUCE_ONLY` | The order may only reduce the submitter's existing position. Perpetual markets only.                                      |
| `IOC`         | Immediate-or-cancel: whatever does not match in the order's batch is cancelled rather than resting. Market orders must set it. |
| `POST_ONLY`   | Add-liquidity-only — see below.                                                                                           |

A flag bit that a node does not recognise is rejected rather than ignored, so an order never executes with a property dropped from it. Bit values and the encoding rules are in the [Orderbook precompile reference](https://docs.v2.pod.network/api-reference/applications-precompiles/orderbook).

### Post-only

A post-only order is guaranteed to add liquidity rather than take it. Under frequent batch auctions that guarantee has to be stated against the batch, not against the book at arrival: every intent in a batch is matched simultaneously, so two orders that arrive in the same batch and match each other are both takers, however the book looked when either was submitted. Asking "does it cross right now?" would therefore not be enough to guarantee anything.

So the rule is:

> A post-only order may not trade in the batch that admitted it. From the next batch onwards it is an ordinary resting maker.

What follows from it:

* A post-only order that would have traded in its admitting batch is removed from the book instead. The removal is terminal and never partial, and it is reported under its own status, `post_only_refused`, so it is distinguishable from a cancel the trader sent.
* One that would not have traded in that batch simply rests, and matches from the next batch on.
* Two post-only orders admitted in the same batch that cross only each other are both refused: neither took resting liquidity, but each would have taken from the other.
* If a same-price order with better queue priority absorbs the crossing liquidity first, the post-only order behind it rests untouched — it never had the chance to take.
* Amending an order in a way that re-queues it (a new price, or a larger size) makes it a newcomer again for that batch; an amendment that only shrinks the order keeps its queue priority and goes on matching.

A post-only order is therefore a *guaranteed maker* under a fee schedule that classifies maker and taker by the batch an order was included in: the classification cannot be gamed by an order that both arrived and traded in the same batch.

## Market Data

The full node includes a built-in indexer for both live and historical market data. This provides order book snapshots, OHLCV candles, account-level order history, and position data without requiring users to run their own indexer. See the [`ob_` endpoints](https://docs.v2.pod.network/guides-references/json-rpc) in the JSON-RPC reference.

## Matching

Pod uses frequent batch auctions to match orders. Instead of processing orders one at a time as they arrive (continuous trading), orders are collected over a short interval and matched together at a single uniform clearing price. This removes timing-based ordering advantages - competition is on price alone.

Each market has a fixed **batch interval** that defines how often matching rounds run. At the end of every interval the solver settles a batch covering all orders whose `deadline` lands at or before that interval. See [Market Configurations](https://docs.v2.pod.network/guides-references/market-configurations) for the per-market interval on live markets.

### Clearing

At the end of each batch interval, the matching engine runs a double auction using the four-case k-double-auction rule (for simplification, we describe a case where all orders have unit size):

1. Buy orders are sorted by price in descending order: b1 >= b2 >= ... >= bn.
2. Sell orders are sorted by price in ascending order: s1 <= s2 <= ... <= sn.
3. The breakeven index k is the largest index where bk >= sk.
4. The first k buyers and sellers trade at a single clearing price p.

Only limit orders determine p; market orders match but never set the price. Four prices bound the clearing range — the marginal matched limit sell and buy (ps, pb) and the best unmatched limit buy and sell left on the book (b', s'). The range is [max(ps, b'), min(pb, s')], skipping any of the four that don't exist, and p is chosen by case:

- Both a lower and an upper bound exist — p is their midpoint.
- Only one side has a limit bound — p is that bound. For example, market buys sweeping all resting limit sells clear at the highest matched sell price.
- No limit order bounds the price at all (e.g. both sides matched only market orders) — p falls back to the previous batch's clearing price; on perpetual markets, to the mark price if there is no previous clearing. A spot market with no previous clearing price cannot price the batch: it emits no fills and the orders rest until a clearing price exists.

Finally, p is clamped to the prices of the matched orders themselves, market orders included: every matched seller receives at least their order's price and every matched buyer pays at most theirs, so no order ever fills worse than its own price.

All matched orders execute at the same uniform price. No participant gets a better or worse price based on when their order arrived within the batch. When a price level is only partially filled at the margin, orders at that level fill in a deterministic order derived from their order IDs, so every node allocates the marginal fill identically.

### Batch Deadline

The `deadline` parameter in `submitOrder` specifies the latest batch the user wants their order included in. The order can be included in any batch up to and including the deadline batch — so pushing `deadline` further into the future widens the window of batches the order can land in, it does not delay execution.

`deadline` must be **aligned to the market's `auction_interval`** (a multiple of it); intents whose deadline is not aligned are rejected by the validator with `"CLOB validation failed: Deadline is not aligned to auction interval"`. Compute it as:

```text
deadline = ceil((now + LAG) / auction_interval) * auction_interval
```

`LAG` is the headroom you give for network and attestation propagation, capped at **10 minutes** in the future from `now_us`. Most integrators should aim for **at least 1 minute**; experts who want to target a specific upcoming batch can push it lower at the risk of missing the batch if the transaction doesn't reach enough validators in time. This 10-minute ceiling is the maximum last look duration and is expected to shorten as the network matures.

The protocol guarantees (via [past perfection](network-architecture/timestamping.md#past-perfection)) that if an order receives n - f attestations within the deadline - which it will if it was sent sufficiently early - it will be part of a batch up to and including the latest batch specified by the deadline.

Transactions that do not receive a finality certificate may still be used for matching, but they do not get to settle - the user cannot withdraw funds even if their order is matched. This is by design, to prevent last look attacks.

Traders can set the deadline to be small to ensure they are matched quickly, but they open up the risk of not being able to claim funds if they do not receive sufficient attestations in time. Traders setting recent deadlines should estimate their network latency to honest validators.

### Solver

The solver is the service responsible for settling a batch. It can be a rotating set of solvers or a single entity, configurable per market. The solver waits for the auction deadline and then settles the batch.

The solver does not get any additional advantage. It cannot censor transactions or include transactions that were not submitted in time. It has some flexibility on whether to include out-of-time transactions - orders submitted after the batch timestamp, or orders that received some attestations but fewer than the required n − f. These orders always lose, because they cannot claim funds even if they get matched.

### Solution state commitment

A solution is built against the state the previous batch left behind. Every settlement carries `previousStateHash` - the solver's fingerprint of that state - and each validator compares it against a fingerprint it computes from its own state before attesting. A solution whose claim disagrees is rejected, so a node whose trading state has drifted from the solver's stops attesting rather than settling on state nobody else has.

A single settlement can cover several consecutive batches when the solver is catching up. They are all built from the same starting state, so one `previousStateHash` covers the whole call.

The fingerprint is a CRC-32 digest - fast, since every node recomputes it once per batch - right-aligned in the `bytes32`. It covers the deadline of the batch that produced it, which binds the fingerprint to that batch, followed by every orderbook in ascending `orderbookId` order. Each orderbook contributes:

* its last clearing price
* its last mark price and last oracle price - spot markets have neither
* its best ten resting orders per side, best first, as (price, remaining size) pairs - fewer if the side is thinner

A price the market does not have, and an empty book side, fold in as a `-` marker rather than as zero, so "never traded" stays distinguishable from "traded at zero".

A market with no price of any kind and an empty book contributes nothing at all. Market configuration reaches nodes one at a time, so a node that already knows about a new - and therefore still untraded - market has to agree with one that does not.

`bytes32(0)` means "no reference point yet": a chain that has not settled a batch, or a node restarted from state written before the commitment existed. When either side is zero the comparison is skipped, and both sides recover a real value from the next settled batch.

### References

* E. Budish, P. Cramton, J. Shim. _The High-Frequency Trading Arms Race: Frequent Batch Auctions as a Market Design Response._ Quarterly Journal of Economics, 2015.

## AMM Order Book

{% hint style="info" %}
Coming soon.
{% endhint %}

Pod's order book allows traders to attach custom EVM contracts that define pricing curves for their orders. This enables AMMs and limit orders to coexist natively on the same book. Markets can be bootstrapped using passive AMM curves and progressively transition to professional market maker liquidity for tighter spreads and better price discovery. Market makers can update orders across the entire pricing curve with minimal state changes.
