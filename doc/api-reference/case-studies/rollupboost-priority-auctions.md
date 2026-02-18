# RollupBoost priority auctions

[RollupBoost](https://writings.flashbots.net/introducing-rollup-boost) is a block-building pipeline for rollups developed by Flashbots. It separates block building from sequencing - the sequencer delegates block construction to a builder running inside a TEE (Trusted Execution Environment). The TEE ensures bid privacy and correct ordering by priority fee, but the builder can still censor bids since it controls which bids it receives.

This example demonstrates how RollupBoost could leverage Pod to add censorship resistance to the priority auction. Searchers submit bids to Pod instead of directly to the builder. The TEE builder then fetches the verified bid set from Pod, guaranteeing that no bids were censored.

For background on the auction mechanism, see [Optimistic Auctions](https://docs.v2.pod.network/documentation/markets/optimistic-auctions).

## How It Works

1. **Bid submission** - Searchers submit priority bids to Pod's [optimistic auctions precompile](https://docs.v2.pod.network/guides-references/references/precompiles/optimistic-auctions). Each bid contains the L2 transaction (or bundle) and a priority fee. The `auction_id` identifies the L2 block slot being auctioned.

2. **Past perfect verification** - After the auction deadline, the TEE builder calls `pod_waitPastPerfectTime` on a Pod full node. This blocks until the past perfect certificate is available, which cryptographically guarantees the bid set is complete. The builder verifies the certificate inside the TEE.

3. **Bid set retrieval** - The builder queries `BidSubmitted` event logs from Pod to fetch all bids for the auction. Because the past perfect certificate has been verified, the builder knows this set is complete - any bid submitted sufficiently before the deadline is guaranteed to be included.

4. **Block construction** - The builder sorts bids by priority fee and includes them in the L2 block. The TEE attestation proves the builder used the verified bid set and followed the ordering rules.

A working implementation is available at [`examples/optimism-tx-auction`](https://github.com/nicblockchain/optimism-tx-auction).

## References

- [From Fair Ordering to Fair Inclusion](https://pod.network/blog/from-fair-ordering-to-fair-inclusion) - how Pod adds verifiable inclusion to the RollupBoost stack
- [RollupBoost + Pod L2 Demo](https://collective.flashbots.net/t/l2-demo-of-pod/4459) - live demo on DevNet
- [Introducing RollupBoost](https://writings.flashbots.net/introducing-rollup-boost) - Flashbots blog post introducing RollupBoost
