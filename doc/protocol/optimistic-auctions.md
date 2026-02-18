# Optimistic Auctions

Optimistic auctions are single-shot auctions where Pod acts as a censorship-resistant bulletin board for bid collection, and settlement happens on a separate chain (Ethereum, an L2, or any other chain with an on-chain consumer contract).

Auctions do not require total ordering of transactions - what matters is the *set* of bids, not their order. This makes them a natural fit for Pod's consensusless architecture, where transactions are finalized independently rather than sequenced into blocks.

## Bid Collection

Bidders submit bids to the [optimistic auctions precompile](https://docs.v2.pod.network/guides-references/references/precompiles/optimistic-auctions) on Pod. Each bid specifies an `auction_id`, a `deadline`, a `value`, and an opaque `data` payload (e.g. an encoded intent or order). Bids with the same `auction_id` compete together.

Once the deadline passes, the [past perfect certificate](network-architecture/timestamping.md#past-perfect-certificate) guarantees that the bid set is complete. Under good network conditions, any bid submitted sufficiently before the deadline is guaranteed to be in the set. No bids can be added after this point.

Different parties observing the protocol are guaranteed to see all bids that were in time, but may disagree on bids that were not completely in time (i.e. bids that received some but not n - f attestations before the deadline). This is fine - the settlement mechanism handles this disagreement, as described below.

See the [bidding guide](https://docs.v2.pod.network/guides-references/guides/optimistic-auction) for code examples.

## Settlement

Settlement happens off-Pod, on the consumer chain. There are two approaches:

### Optimistic settlement with dispute resolution

The winner announces the result to the consumer contract on the settlement chain, along with a finality certificate from Pod proving the bid was part of the auction. The claim is accepted unless disputed within a challenge period.

There are exactly two cases during the dispute period:

1. **A higher honest bid exists** - any party can come online and submit the correct winning bid along with its finality certificate to the consumer contract. The contract verifies both certificates and resolves the dispute on-chain.
2. **No show** - if no bidder settles on time, any observer of the auction can blame the highest winner in their view by presenting the bid along with an n - 3f certificate. The blamed bidder is either slashed or must blame a higher winner in their own view. This blame chain resolves in at most 2 rounds.

For the complete pseudocode of the protocol and dispute resolution with proof sketches, see the [Octopod paper](https://drive.google.com/file/d/1uNVX4gBadHniYD9xKk1LzObFq8yzSmf7/view).

This approach is used in the [CowSwap solver auction](https://docs.v2.pod.network/guides-references/case-studies/cowswap-solver-auctions) integration, where the winning solver claims the right to settle a batch on Ethereum.

### Verified settlement with TEE or ZK

Instead of an optimistic claim, a single party (e.g. a sequencer or builder) verifies the past perfect certificate, determines the winner, and proves it was done correctly - either via a TEE attestation or a ZK proof. Its view of the set is considered the correct set because the proof binds the result to a specific verified certificate. There is no disagreement between readers and no dispute period needed.

This approach is demonstrated in the [RollupBoost priority auction](https://docs.v2.pod.network/guides-references/case-studies/rollupboost-priority-auctions) example, where a TEE builder fetches the verified bid set from Pod and constructs L2 blocks ordered by priority fee.

## Sealed-Bid Auctions with TEE

Bidders can encrypt bids to a TEE's public key so that no party - including validators - sees bid values before the auction concludes. The TEE only decrypts bids after verifying the past perfect certificate, which proves the deadline has passed and the bid set is final. This works like timelock encryption, with Pod acting as the time beacon: bids remain sealed until the network certifies the auction has closed. Sealed bids can be combined with either settlement approach above.

## References

- O. Alpos, B. David, J. Mitrovski, O. Sofikitis, D. Zindros. [*Octopod: Decentralized Sealed-Bid Auctions on Pod.*](https://drive.google.com/file/d/1uNVX4gBadHniYD9xKk1LzObFq8yzSmf7/view) 2025.
- O. Alpos, B. David, J. Mitrovski, O. Sofikitis, D. Zindros. *Pod: An Optimal-Latency, Censorship-Free, and Accountable Generalized Consensus Layer.* 2025. [arXiv:2501.14931](https://arxiv.org/abs/2501.14931)
