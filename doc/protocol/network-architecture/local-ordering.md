# Local Ordering

Pod uses the transaction nonce to locally order transactions per account. The nonce serves two purposes:

1. **User-specified ordering** — since there is no global ordering of transactions, the nonce ensures that a user's transactions are executed in the order intended by the user.
2. **Consistency** — the network maintains a single chain of transactions per account. This prevents double-spending of balances and maintains any consistency guarantees required for single-writer state.

Because ordering is local to each account, validators do not need to coordinate with each other to agree on a global order. This is what enables single round-trip confirmation.

## Nonce Check

When a validator receives a transaction, it checks that the transaction's nonce matches the account's current expected nonce. If it matches, the validator attests. If it doesn't, the transaction is rejected.

This ensures that for any given account and nonce, at most one transaction can collect n - f attestations. If a client submits two conflicting transactions at the same nonce, different validators may vote for different ones, but neither can reach the finality threshold on its own.

## Account Locking and Recovery

If a client submits conflicting transactions at the same nonce — whether intentionally or due to a crash fault (e.g. restarting without remembering a transaction was already sent) — the account becomes **locked**. The nonce cannot advance and no future transactions can be processed.

The existing consensusless literature addresses this by falling back to a consensus protocol to resolve the conflict. Pod does not do this. Pod has a built-in recovery protocol that resolves account locking in **one network round trip**, without invoking consensus or relying on a centralized party.

To recover, the client:

1. Calls `pod_getRecoveryTargetTx(account)` on the full node to fetch a valid target transaction to recover to.
2. Sends a transaction to the **recovery precompile** at `0x0000000000000000000000000000000004EC0EE4`, calling `recover(txHash, nonce)`.

The target transaction points to the valid tip of a chain of transactions that can all be finalized. The protocol executes this chain, recovers the account state to the state after executing the target transaction, and increments the nonce. The client can then sign a new transaction with the next nonce (stuck nonce + 1) and continue transacting normally.

Note that recovery itself is a transaction, so a client can get locked again if it submits multiple conflicting recovery transactions and none of them reach quorum. The protocol handles this — the client simply initiates recovery again, and the new target transaction will account for the full chain including prior recovery attempts.

### Example: Recovery

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.v1.dev.pod.network");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const RECOVERY = "0x0000000000000000000000000000000004EC0EE4";
const abi = ["function recover(bytes32 txHash, uint64 nonce) public"];
const recovery = new ethers.Contract(RECOVERY, abi, wallet);

// 1. Get the recovery target for the locked account
const { txHash: targetTxHash, nonce } = await provider.send("pod_getRecoveryTargetTx", [wallet.address]);

// 2. Call the recovery precompile
const tx = await recovery.recover(targetTxHash, nonce);
await tx.wait();
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
use alloy::providers::{Provider, ProviderBuilder};
use alloy::signers::local::PrivateKeySigner;
use alloy::sol;

sol! {
    #[sol(rpc)]
    contract Recovery {
        function recover(bytes32 txHash, uint64 nonce) public;
    }
}

let signer: PrivateKeySigner = PRIVATE_KEY.parse()?;
let provider = ProviderBuilder::new()
    .wallet(signer)
    .on_http("https://rpc.v1.dev.pod.network".parse()?);

let recovery = Recovery::new(
    "0x0000000000000000000000000000000004EC0EE4".parse()?,
    &provider,
);

// 1. Get the recovery target for the locked account
let target: TargetTx = provider
    .raw_request("pod_getRecoveryTargetTx".into(), vec![account_address])
    .await?;

// 2. Call the recovery precompile
let receipt = recovery
    .recover(target.tx_hash, target.nonce)
    .send()
    .await?
    .watch()
    .await?;
```
{% endtab %}
{% endtabs %}

## References

The local ordering model and recovery protocol build on a line of research in consensusless Byzantine fault-tolerant protocols:

- **FastPay** — M. Baudet, G. Danezis, A. Sonnino. *FastPay: High-Performance Byzantine Fault Tolerant Settlement.* 2020. [arXiv:2003.11506](https://arxiv.org/abs/2003.11506)
- **ABC** — J. Sliwinski, R. Wattenhofer. *ABC: Proof-of-Stake Without Consensus.* 2019. [arXiv:1909.10926](https://arxiv.org/abs/1909.10926)
- **Sui Lutris** — S. Blackshear, A. Chursin, G. Danezis et al. *Sui Lutris: A Blockchain Combining Broadcast and Consensus.* 2024. [arXiv:2310.18042](https://arxiv.org/abs/2310.18042)
- **Pod** — O. Alpos, B. David, J. Mitrovski, O. Sofikitis, D. Zindros. *Pod: An Optimal-Latency, Censorship-Free, and Accountable Generalized Consensus Layer.* 2025. [arXiv:2501.14931](https://arxiv.org/abs/2501.14931)
- **Fast-Path Recovery** — S. Agrawal. *Fast-Path Recovery for Consensusless Protocols.* Master's Thesis, TU Munich, 2026. Pod's recovery precompile is based on this construction, which extends FastPay with a recovery mechanism inspired by Simplex-style view change in the 5f + 1 fault model.
