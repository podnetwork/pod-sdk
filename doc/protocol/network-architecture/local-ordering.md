# Local Ordering

Pod uses the transaction nonce to locally order transactions per account. The nonce serves two purposes:

1. **Per-account sequencing**  - since there is no global ordering of transactions, the nonce establishes a sequence within each account, ensuring transactions execute in the order the user intended.
2. **Consistency**  - the network maintains a single chain of transactions per account. This prevents double-spending and maintains consistency for single-writer state.

Because ordering is local to each account, validators do not need to coordinate with each other to agree on a global order. This is what enables single round-trip confirmation.

## Nonce Check

When a validator receives a transaction, it checks that the transaction's nonce matches the account's current expected nonce. If it matches, the validator attests. If it doesn't, the transaction is rejected.

This ensures that for any given account and nonce, at most one transaction can collect n - f attestations. If a client submits two conflicting transactions at the same nonce, different validators may vote for different ones, but neither can reach the finality threshold on its own.

## Account Locking and Recovery

If a client submits conflicting transactions at the same nonce  - whether intentionally or due to a crash (e.g. restarting without persisting client state)  - the account becomes **locked**. The nonce cannot advance and no future transactions can be processed.

The existing consensusless literature addresses this by falling back to a consensus protocol to resolve the conflict. Pod does not do this. Pod has a built-in recovery protocol that resolves account locking in **one network round trip**, without invoking consensus or relying on a centralized party.

To recover, the client:

1. Calls `pod_getRecoveryTargetTx(account)` on the full node to fetch a valid target transaction to recover to.
2. Sends a transaction to the **recovery precompile** at `0x0000000000000000000000000000000004EC0EE4`, calling `recover(txHash, nonce)`.

The target transaction points to the valid tip of a chain of transactions that can all be finalized. The protocol executes this chain, recovers the account state to the state after executing the target transaction, and increments the nonce. The client can then sign a new transaction with the next nonce (stuck nonce + 1) and continue transacting normally.

Note that recovery itself is a transaction, so a client can get locked again if it submits multiple conflicting recovery transactions and none of them reach quorum. The protocol handles this - the client simply initiates recovery again, and the new target transaction will account for the full chain including prior recovery attempts.

See [Recover a locked account](https://docs.v2.pod.network/guides-references/guides/recover-locked-account) for a step-by-step guide with code examples.

## References

The local ordering model and recovery protocol build on a line of research in consensusless Byzantine fault-tolerant protocols:

- **FastPay**  - M. Baudet, G. Danezis, A. Sonnino. *FastPay: High-Performance Byzantine Fault Tolerant Settlement.* 2020. [arXiv:2003.11506](https://arxiv.org/abs/2003.11506)
- **ABC**  - J. Sliwinski, R. Wattenhofer. *ABC: Proof-of-Stake Without Consensus.* 2019. [arXiv:1909.10926](https://arxiv.org/abs/1909.10926)
- **Sui Lutris**  - S. Blackshear, A. Chursin, G. Danezis et al. *Sui Lutris: A Blockchain Combining Broadcast and Consensus.* 2024. [arXiv:2310.18042](https://arxiv.org/abs/2310.18042)
- **Pod**  - O. Alpos, B. David, J. Mitrovski, O. Sofikitis, D. Zindros. *Pod: An Optimal-Latency, Censorship-Free, and Accountable Generalized Consensus Layer.* 2025. [arXiv:2501.14931](https://arxiv.org/abs/2501.14931)
- **Fast-Path Recovery**  - S. Agrawal. *Fast-Path Recovery for Consensusless Protocols.* Master's Thesis, TU Munich, 2026. Pod's recovery precompile is based on this construction, which extends FastPay with a recovery mechanism inspired by Simplex-style view change in the 5f + 1 fault model.
