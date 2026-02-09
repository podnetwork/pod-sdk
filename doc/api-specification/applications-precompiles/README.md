# Applications (Precompiles)

Pod is a matching engine at its core. With the goal of eventually matching NASDAQ-level performance, we implemented custom, highly optimized precompiles for popular matching applications rather than introducing a general-purpose EVM on top of Pod.

This approach enables MEV elimination by design—fairness is enforced at the protocol level rather than relying on application-layer workarounds. It also simplifies security since the matching logic is part of the protocol itself, audited once, and shared across all markets.

Market creators benefit too: they don't need to write or deploy contracts, just configure parameters and get a battle-tested matching engine out of the box. The network launches with two applications:

* **Clob Spot** (Central Limit Order Book): A full-featured order book powering Pod's spot markets. At the end of each batch interval, solvers propose optimal matches that clear at a uniform price, eliminating timing advantages and MEV by design.
* **Optimistic Auctions**: A batch auction primitive designed for applications like CoW Protocol-style intent settlement. Solvers compete to propose solutions that maximize surplus or matched volume. This design is ideal for DEX aggregation, cross-chain swaps, and any application where discrete auctions outperform continuous order flow.

In the near future, we will introduce a **Perpetuals** application for leveraged futures markets, sharing the same interface as Spot for a consistent developer experience.

These applications form the foundation of Pod's market infrastructure, with more to follow as the network matures. All applications expose standard Ethereum interfaces—Solidity ABIs, JSON-RPC methods, and familiar transaction formats. This means market makers, trading firms, and existing infrastructure can migrate to Pod with minimal friction. If you've built on Ethereum, you already know how to build on Pod.

<br>
