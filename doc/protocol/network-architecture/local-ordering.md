# Local Ordering

Pod uses the transaction nonce to locally order transactions per account. The nonce serves two purposes:

1. **Per-account sequencing** - since there is no global ordering of transactions, the nonce establishes a sequence within each account, ensuring transactions execute in the order the user intended.
2. **Consistency** - the network maintains a single chain of transactions per account. This prevents double-spending and maintains consistency for single-writer state.

Because ordering is local to each account, validators do not need to coordinate with each other to agree on a global order. This is what enables single round-trip confirmation.

## Nonce Check

When a validator receives a transaction, it checks that the transaction's nonce matches the account's current expected nonce. If it doesn't match, the transaction is rejected.  If it matches, the validator proceeds with the additional checks.

This ensures that for any given account and nonce, at most one transaction can collect n - f attestations. If a client submits two conflicting transactions at the same nonce, different validators may vote for different ones, but no two conflicting transactions can reach the finality threshold simultaneously.

## References

The local ordering model builds on a line of research in consensusless Byzantine fault-tolerant protocols:

* **FastPay** - M. Baudet, G. Danezis, A. Sonnino. _FastPay: High-Performance Byzantine Fault Tolerant Settlement._ 2020. [arXiv:2003.11506](https://arxiv.org/abs/2003.11506)
* **ABC** - J. Sliwinski, R. Wattenhofer. _ABC: Proof-of-Stake Without Consensus._ 2019. [arXiv:1909.10926](https://arxiv.org/abs/1909.10926)
* **Sui Lutris** - S. Blackshear, A. Chursin, G. Danezis et al. _Sui Lutris: A Blockchain Combining Broadcast and Consensus._ 2024. [arXiv:2310.18042](https://arxiv.org/abs/2310.18042)
* **Pod** - O. Alpos, B. David, J. Mitrovski, O. Sofikitis, D. Zindros. _Pod: An Optimal-Latency, Censorship-Free, and Accountable Generalized Consensus Layer._ 2025. [arXiv:2501.14931](https://arxiv.org/abs/2501.14931)
