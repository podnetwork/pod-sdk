# Markets Overview

Pod's protocol includes a set of asset-agnostic, fully on-chain, composable market primitives - the order book, matching engine, liquidation engine, and oracle system. These are enshrined as precompiles rather than deployed as user contracts. The primitives are general enough to support perpetual futures, options, prediction markets, intent-based matching, and markets for exotic or illiquid assets.

## Why Pod Has No MEV

Transactions are added to the network without any central party - there is no leader or sequencer that controls which transactions are included or in what order. Confirmed transactions are batched and cleared at a single uniform price. Only transactions that were submitted in time can be part of a batch, and only transactions that were sufficiently early get to settle (i.e. claim funds if matched). This means competition happens on price alone - there are no timing or ordering advantages to exploit. See [Batch Auctions](batch-auctions.md) for details on how matching and settlement work.

Pod also provides [optimistic auctions](optimistic-auctions.md) - a more general auction primitive where Pod collects bids and settlement happens on a separate chain. Unlike batch auctions which match orders at a uniform clearing price on Pod, optimistic auctions let applications define their own winner selection and settlement logic. This supports use cases like solver auctions and priority fee auctions.

## Navigating the Docs

- [Orderbook](orderbook.md) - the enshrined CLOB precompile, order types, and market data
- [Batch Auctions](batch-auctions.md) - how orders are matched, the deadline mechanism, and the solver role
- [Optimistic Auctions](optimistic-auctions.md) - censorship-resistant auctions with off-Pod settlement
