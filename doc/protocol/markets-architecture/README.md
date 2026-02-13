# Markets Architecture

Pod is purpose-built for high-performance markets. The protocol exposes a set of asset-agnostic, fully on-chain, composable primitives - including the order book, matching engine, liquidation engine, and oracle system - that allow developers to launch novel markets quickly. Pod's infrastructure can support perpetual futures, options, prediction markets, intent-based matching, and markets for illiquid or exotic assets.

## Why Pod Has No MEV

Transactions are added to the network without any central party - there is no leader or sequencer that controls which transactions are included or in what order. Confirmed transactions are batched and cleared at a single uniform price. Only transactions that were submitted in time can be part of a batch, and only transactions that were sufficiently early get to settle (i.e. claim funds if matched). This means competition happens on price alone - there are no timing or ordering advantages to exploit. See [Batch Auctions](batch-auctions.md) for details on how matching and settlement work.

## Navigating the Docs

- [Orderbook](orderbook.md) - the enshrined CLOB precompile, order types, and market data
- [Batch Auctions](batch-auctions.md) - how orders are matched, the deadline mechanism, and the solver role
