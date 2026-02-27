# Native Bridge

Pod has a native bridge for moving ERC20 tokens between Ethereum and Pod. The bridge consists of a smart contract deployed on Ethereum and a precompile on Pod.

## Architecture

- **Ethereum bridge contract** - holds deposited tokens on Ethereum. Users deposit here to bridge into Pod, and claim here when bridging out.
- **Pod bridge precompile** - at `0x0000000000000000000000000000000000B41D9E` on Pod. Users call this to initiate withdrawals to Ethereum.

## Ethereum → Pod

Tokens are deposited to the Ethereum bridge contract and locked. Pod validators run Ethereum full nodes, observe finalized deposits, and automatically credit the corresponding balance on Pod.

See [Bridge to Pod](https://docs.v2.pod.network/guides-references/guides/bridge-to-pod) for a step-by-step guide with code examples.

## Pod → Ethereum

Tokens are deposited to the Pod bridge precompile, which burns them on Pod. Validators sign the withdrawal using separate cold keys (KMS-backed) dedicated to bridge attestations, distinct from transaction attestation keys. These signatures are specially packed for efficient on-chain verification. The Ethereum bridge contract checks that at least `n - f` validators signed the withdrawal - the same threshold used for transaction finality.

The user obtains the claim proof via `pod_getBridgeClaimProof(txHash)` and submits it to the Ethereum bridge contract to release the tokens. Anyone can submit the claim - it does not need to come from the original depositor.

See [Bridge from Pod](https://docs.v2.pod.network/guides-references/guides/bridge-from-pod) for a step-by-step guide with code examples.

## Decimal Scaling

All tokens on Pod are represented with 18 decimals internally, regardless of their decimals on the source chain (e.g. USDC has 6 decimals on Ethereum but 18 on Pod). The bridge handles the conversion automatically:

- **Ethereum → Pod**: The bridge scales amounts up to 18 decimals when crediting balances on Pod.
- **Pod → Ethereum**: When calling `deposit` on the Pod bridge precompile, the `amount` must be specified in the Ethereum token's native units (e.g. 1e6 for 1 USDC), not in Pod's 18-decimal representation. The Deposit event also emits amounts in the source chain's decimals.

## Network Upgrades

When the network is upgraded (e.g. validator set changes), past certificates are invalidated because the signing domain changes. Claims from before the upgrade use a merkle inclusion proof instead - the admin commits a merkle root covering all pending claims from the previous version.

`pod_getBridgeClaimProof` handles this automatically - it returns the appropriate proof type based on the current network version. Users do not need to handle this distinction.

## Limits

The bridge contract enforces per-token daily limits on both deposits and claims. Tokens must be whitelisted by the admin before they can be bridged, with configurable minimum amounts and daily caps.

## Audit

The bridge contract has been [audited by Riley Holterhus](https://github.com/podnetwork/pod-sdk/blob/main/protocol/audits/audit-29-01-2026.pdf) (January 2026).
