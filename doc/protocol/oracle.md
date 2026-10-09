# Oracle

Every perpetual market needs a reference price for the underlying asset. It anchors the [mark price](perpetuals.md#mark-price), drives [funding](perpetuals.md#funding), and through them decides margin and liquidation. Pod calls this reference the **oracle price**.

Spot markets do not use an oracle price.

## Multiple oracle sources

A single price feed is a single point of failure: if it goes down or reports a wrong price, every market that depends on it is affected. So Pod does not rely on one feed. Each perp market is configured with one or more independent oracle sources, and on every batch the network receives the latest observation from each of them:

| Field        | Meaning                                         |
| ------------ | ----------------------------------------------- |
| Price        | The price the source reported                   |
| Publish time | When the source published that price            |
| Source       | Which source it came from                       |

All sources carry equal weight. The order in which they arrive does not matter.

### Dropping stale observations

A feed that stops updating does not necessarily go quiet: its last price can keep being delivered long after it stopped being true. So before any observation is used, its age is checked against the batch's deadline:

```
age = batch_deadline − publish_time
```

An observation is **fresh** if its age is at most the staleness threshold (30 seconds), and **stale** otherwise. Stale observations are ignored for that batch.

Age is measured against the batch deadline, not the wall clock, so every validator reaches the same verdict for the same batch.

### Combining the fresh observations: the median

The oracle price for the batch is the **median** of the fresh observations. If no observation is fresh, the market switches to the [internal price](#internal-price).

| Fresh observations | Oracle price for the batch                                          |
| ------------------ | ------------------------------------------------------------------- |
| One or more        | The median of the fresh observations                               |
| None               | The [internal price](#internal-price), derived from the order book |

To compute the median, sort the fresh prices and take the one in the middle:

- **Odd count:** the middle value. `99.9, 100.0, 100.2` → `100.0`
- **Even count:** the average of the two middle values. `99.9, 100.0, 100.2, 100.4` → `(100.0 + 100.2) / 2 = 100.1`
- **One observation:** that observation's price.

Every fresh observation counts equally. No source is ranked above another, and the order the observations arrive in does not change the result.

### Why a median and not an average

An average lets every source move the result, including a broken one. The median ignores how far off an outlier is and only cares which side of the middle it falls on.

Take three fresh observations where one source is wrong:

```
100.0, 100.2, 150.0

average = (100.0 + 100.2 + 150.0) / 3 = 116.7    ← dragged 16% off by one bad source
median  = 100.2                                  ← stays with the honest sources
```

However wrong the bad price is, whether 150 or 1,000,000, the median stays at 100.2.

### How many bad sources a market can tolerate

The median stays within the range of the honest prices as long as **fewer than half** of the fresh observations are wrong:

| Fresh observations | Wrong prices the median can outvote |
| ------------------ | ----------------------------------- |
| 1                  | 0                                   |
| 2                  | 0 (a bad price pulls the result halfway) |
| 3                  | 1                                   |
| 4                  | 1                                   |
| 5                  | 2                                   |

Dead sources are a different case. A source that stops publishing does not need to be outvoted at all, because its observations go stale and drop out. As long as **at least one** source is fresh, the market keeps a real price.

### Example: sources failing over time

A market with three sources, A, B and C. Each row is a batch:

| Batch | A              | B              | C              | Fresh | Oracle price             |
| ----- | -------------- | -------------- | -------------- | ----- | ------------------------ |
| 1     | 100.0          | 100.2          | 99.9           | 3     | 100.0 (median of 3)      |
| 2     | 100.1          | 100.3          | 99.9 (stale)   | 2     | 100.2 (median of 2)      |
| 3     | 100.2          | 100.3 (stale)  | 99.9 (stale)   | 1     | 100.2 (only A)           |
| 4     | 100.2 (stale)  | 100.3 (stale)  | 99.9 (stale)   | 0     | Internal price           |
| 5     | 100.2 (stale)  | 100.5          | 99.9 (stale)   | 1     | 100.5 (back on B)        |

- Batches 2 and 3: as sources go stale they drop out, and the price keeps coming from whichever sources are still fresh.
- Batch 4: every source is stale, so the market switches to the [internal price](#internal-price), anchored to the last median (100.2).
- Batch 5: as soon as one source is fresh again, the next batch returns to the median. There is no waiting period.

The last median computed from fresh observations is always remembered. It becomes the **anchor** for the internal price if every source goes stale.

## Internal price

When every source for a market is stale, Pod does not keep trading against the last price it saw. It derives an **internal price** from what the market's own order book is willing to pay, anchored to the last real price and bounded around it.

It works like this:

1. **Start from the last real price.** This is the last price computed from fresh sources: the **anchor**.
2. **Look at the order book.** The **book price** is where the book is willing to trade. If the best bids have moved above the anchor, it is the bid side's price. If the best asks have moved below it, it is the ask side's price. If the book still straddles the anchor, the book price is the anchor itself.
3. **Blend the two, giving the book more weight over time.** The book's weight starts at 0 when the sources go stale and grows steadily to 1 over 30 minutes.
4. **Keep the result within a corridor around the anchor.** See [The corridor](#the-corridor).

```
book_weight    = min(time_since_last_fresh_price / 30 minutes, 1)
internal_price = anchor + book_weight × (book_price − anchor)
                 limited to anchor × (1 ± w)
```

For example, suppose the anchor is 100 and the book price is 102:

| Time without a fresh source | Book weight | Internal price |
| --------------------------- | ----------- | -------------- |
| 0 minutes                   | 0           | 100            |
| 15 minutes                  | 0.5         | 101            |
| 30 minutes or more          | 1           | 102            |

So the price does not jump when the sources go stale. It moves gradually toward the book, and after 30 minutes the market prices itself from its own book, still within the corridor.

{% hint style="info" %}
The book price is measured at a fixed trade size, the market's impact notional: it is the price a trade of that size would get. On a book with enough depth, a single small order does not set it on its own (see [limitations](#trust-model-and-limitations) for thin books). These are the same impact prices [funding](perpetuals.md#funding) uses. An empty side of the book has no effect.
{% endhint %}

Internal pricing has no time limit. A market can run on it indefinitely, for example across a weekend when the underlying's venue is closed.

### The corridor

The internal price can never move more than a fraction `w` away from the anchor, in either direction. `w` is derived from the market's margin ratios:

```
w = (initial_margin_ratio − maintenance_margin_ratio) / (1 + maintenance_margin_ratio)
```

This is the largest price move that a position opened at maximum leverage can survive without falling below maintenance margin.

So **the internal price alone never liquidates anyone.** A position opened at maximum leverage at the last real price keeps its margin ratio at or above maintenance for as long as the market runs on internal pricing. Lower-leverage positions keep more slack.

{% hint style="info" %}
**Example:** on a 10× market, `initial_margin_ratio = 10%` and `maintenance_margin_ratio = 5%`, so `w = 0.05 / 1.05 ≈ 4.76%`. With a last real price of 100, the internal price stays within roughly 95.24 to 104.76.
{% endhint %}

The guarantee covers the oracle price, but liquidation is checked against the [mark price](perpetuals.md#mark-price), which also takes input from the order book. Over a long outage, a persistently displaced book can move the mark beyond the corridor. The mark's per-batch clamp slows this down but does not prevent it. Funding paid during an outage also reduces equity independently of the corridor.

### Funding during an outage

[Funding](perpetuals.md#funding) is computed against the internal price. As the internal price converges on the book, the gap between the book and the oracle price shrinks, and funding falls toward zero. It does not keep accruing against a frozen price.

## New markets

A perp market comes into existence on the first price it receives. If every observation in that first batch is already stale, there is no previous real price and no book to derive one from. In that case the market starts from the median of all its observations, stale or not, and uses that value as its first anchor.

## Trust model and limitations

- **Prices are delivered by the solver.** Observations, their publish times, and their source tags come from the [solver](orderbook.md#solver) and are not independently verified on-chain. The staleness check protects against honest failures, such as a dead connection, a source outage, or a halted venue. It does not protect against a solver that deliberately supplies wrong prices or timestamps.
- **Thin books can be moved.** While a market runs on internal pricing, a single order on a thin side of the book can shift the impact price and so the internal price. Three things limit the effect: the book's small weight early in an outage, the corridor, and the mark price's per-batch clamp.
- **Liquidation orders count.** The impact price includes liquidation orders resting in the book, because they are real liquidity a batch can fill against. During an outage, a chain of liquidations can therefore move the internal price.
- **External mid prices are not checked for staleness.** The external mid prices that feed the [mark price](perpetuals.md#mark-price) are used as delivered.

## Parameters

| Parameter           | Value                                                                                | Scope                   |
| ------------------- | ------------------------------------------------------------------------------------ | ----------------------- |
| Staleness threshold | 30 seconds                                                                           | Network-wide            |
| `tau`               | 30 minutes                                                                           | Network-wide            |
| Corridor `w`        | `(initial_margin_ratio − maintenance_margin_ratio) / (1 + maintenance_margin_ratio)` | Per market, derived     |
| Oracle sources      | One or more                                                                          | Per market              |
