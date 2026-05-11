# Overview

Pod's protocol includes a set of asset-agnostic, fully on-chain, composable market primitives - the order book, matching engine, liquidation engine, and oracle system. These are enshrined as precompiles rather than deployed as user contracts. The primitives are general enough to support spot, perpetual futures, options, prediction markets, intent-based matching, and markets for exotic or illiquid assets.

## Why Pod Has No MEV

Transactions are added to the network without any central party - there is no leader or sequencer that controls which transactions are included or in what order. Confirmed transactions are batched and cleared at a single uniform price. Only transactions that were submitted in time can be part of a batch, and only transactions that were sufficiently early get to settle (i.e. claim funds if matched). This means competition happens on price alone - there are no timing or ordering advantages to exploit.

Pod supports two kinds of markets: native markets and external markets.

## Native Markets

Native markets are accessed through the Market precompile. Users deposit funds into the market contract and trade against a central limit order book (CLOB) with batch auction matching. Balances are unified across all native markets - a single deposit can be used for both spot and perpetual trading.

### Batch Settlement

Native markets settle in periodic batches. The batch duration is configurable per market and is expected to be 100-200ms. Within each batch, operations are processed in a fixed sequence:

1. **Deposits** - all deposit operations are processed first, ensuring funds are available before any trading activity.
2. **Order updates and cancellations** - modifications and cancellations are applied, updating the order book state.
3. **Liquidations** - liquidation checks and executions are performed against the updated book.
4. **Matching** - the matching engine runs the clearing algorithm over the resulting order book.
5. **Withdrawals** - withdrawal requests are processed last, after all trading and settlement is complete.

This ordering guarantees that deposited funds can be used for trading in the same batch, and that withdrawals only execute after all positions have been settled.

The batch duration defines a tradeoff between fairness and latency of market settlement. Longer batches allow users with slower internet connections to participate, but markets settle slower - better for more illiquid markets. Shorter batches mean faster settlement but require lower latency to participate.

### Fees

Maker, taker, and liquidation fees are currently set to zero. This is subject to change in the future.

## External Markets

External markets use the [Optimistic Auctions](optimistic-auctions.md) precompile. Pod collects bids in a censorship-resistant way, but settlement happens on a separate chain. Unlike native markets which match orders at a uniform clearing price on Pod, external markets let applications define their own winner selection and settlement logic. This supports use cases like solver auctions and priority fee auctions.

## Navigating the Docs

* [Order Book](orderbook.md) - the enshrined CLOB, order types, matching, and market data
* [Optimistic Auctions](optimistic-auctions.md) - censorship-resistant auctions with off-Pod settlement
