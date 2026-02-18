# Censorship Resistance

Censorship resistance is a critical ingredient of Pod's design. Many applications - auctions, liquidations, voting, dispute periods - require that transactions cannot be selectively excluded.

## Existing Systems

Most existing systems have a single party (the block proposer, sequencer, or leader) that decides which transactions to include in the next block. This creates a single point of censorship - the leader can delay or exclude transactions at will, and users have no recourse until the leader rotates. Depending on the protocol and network configuration, censorship can persist for seconds to minutes.

Layer-2s face a worse version of this problem. Most L2s today rely on centralized sequencers to propose all blocks. A compromised sequencer can censor transactions indefinitely. Some L2s allow force-inclusion through the L1, but with significant delays (e.g. Arbitrum: ~1 day).

## Pod's Approach

Pod has no leader. Clients broadcast transactions to all validators simultaneously, and each validator independently decides whether to attest. A transaction only needs n - f attestations to be finalized, so up to f validators can refuse to attest and the transaction still confirms. To censor a transaction, an adversary would need to break the network's liveness, which requires controlling more than f validators - violating the protocol's fault assumption.

Transactions confirm within one network round trip (2 delta). For a detailed comparison of censorship resistance properties across different consensus protocols including Pod, see [this report by Common Prefix](https://www.commonprefix.com/static/clients/flashbots/flashbots_report.pdf).

## Censorship Resistance with Time

For time-sensitive applications (e.g. an auction with a deadline), censorship resistance needs a stronger guarantee: not just that a transaction will eventually be included, but that it will be included *before a specific time*.

Pod provides this through [past perfection](timestamping.md#past-perfection). When an application subscribes to a time of interest, the full node returns a past perfect set once that time has been reached. If a transaction was submitted sufficiently before the time of interest (delta before the deadline, where delta is the network delay between the client and the slowest honest validator), it is guaranteed to be in the past perfect set. Validators cannot selectively exclude timely transactions from the set.

[Optimistic auctions](../optimistic-auctions.md) are a concrete application of this property: bids submitted before the auction deadline are guaranteed to be in the finalized bid set, preventing bid suppression.

