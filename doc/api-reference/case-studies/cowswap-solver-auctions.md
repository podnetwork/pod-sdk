# CowSwap solver auctions

[CowSwap](https://cow.fi) runs a solver auction to determine which solver settles each batch of user swap intents. Solvers compete by submitting bids that reflect the quality of their proposed solution. The winning solver executes the settlement on Ethereum.

Currently, the auction is orchestrated by a centralized service (autopilot) operated by the CoW DAO team. Pod Network is working with CoW to remove this central point of failure by running the solver auction on Pod.

For background on the auction mechanism, see [Optimistic Auctions](https://docs.v2.pod.network/documentation/markets/optimistic-auctions).

## How It Works

1. **Solver competition** - Solvers submit bids to Pod's [optimistic auctions precompile](https://docs.v2.pod.network/guides-references/references/precompiles/optimistic-auctions). Each bid includes the solver's score - a measure of solution quality (e.g. surplus delivered to users).

2. **Bid set finalization** - After the auction deadline, [past perfection](https://docs.v2.pod.network/documentation/core/timestamping#past-perfection) guarantees the bid set is complete. No bids can be added or suppressed after this point.

3. **Winner announcement** - The winning solver (highest score) announces the result to the CoW Protocol settlement contract on Ethereum, along with a finality certificate from Pod proving the bid was part of the auction.

4. **Optimistic settlement** - The winner executes the settlement on Ethereum. If the solver submitted a false claim (e.g. a higher-scoring bid exists in the set), any other solver can dispute by providing the correct winning bid with its Pod finality certificate. The settlement contract verifies both certificates and resolves the dispute on-chain.

## References

- [Decentralising the CoW Protocol Solver Auction](https://forum.cow.fi/t/decentralising-the-cow-protocol-solver-auction/3014) - CoW Protocol forum post describing the integration design
- [Octopod: Decentralized Sealed-Bid Auctions on Pod](https://drive.google.com/file/d/1uNVX4gBadHniYD9xKk1LzObFq8yzSmf7/view) - formal auction protocol
