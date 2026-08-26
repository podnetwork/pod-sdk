# Native Bridge

Pod has a native bridge for moving ERC20 tokens between Ethereum and Pod. The bridge consists of a smart contract deployed on Ethereum and a precompile on Pod. It is how value crosses the boundary in either direction: there is no deposit call and no withdraw call on any other Pod precompile.

## Architecture

- **Ethereum bridge contract** - holds deposited tokens on Ethereum. Users deposit here to bridge into Pod, and claim here when bridging out.
- **Pod bridge precompile** - at `0x50d0000000000000000000000000000000000001` on Pod. Users call `withdraw` here to send a balance to Ethereum; the same precompile is where validators apply the deposits they observe on Ethereum.

## Ethereum → Pod

Tokens are deposited to the Ethereum bridge contract and locked. Pod validators run Ethereum full nodes, observe finalized deposits, and automatically credit the recipient's **balance** on Pod, ready to trade with. Nothing is credited anywhere else, and the user sends no transaction on Pod at all: the bridge relayer submits the deposits and every validator re-checks each entry against its own view of the finalized Ethereum event before attesting.

See [Bridge to Pod](https://docs.v2.pod.network/guides-references/guides/bridge-to-pod) for a step-by-step guide with code examples.

### Deposit and Call

The Ethereum bridge contract's `deposit` still takes `callContract` and `reserveBalance`, and they are still carried through to the Pod-side `DepositApplied` event so the two sides reconcile - but they **no longer route anything on Pod**. A deposit is credited whole to the recipient's balance regardless of what they say, because there is no longer a second balance to split it against.

They are still **validated on Ethereum**, though, so a stale non-zero value is a revert rather than a no-op. The Ethereum contract rejects a `callContract` that the admin has not whitelisted via `setCallContractWhitelist`, a `reserveBalance` greater than `amount`, and any non-zero `reserveBalance` when `callContract` is `address(0)`.

Pass `address(0)` and `0`.

## Pod → Ethereum

Users call `withdraw` on the Pod bridge precompile. It debits the caller's balance, burns it on Pod, and makes the same value claimable on Ethereum - one transaction and one signature, with nothing credited to any Pod account on the way.

The call takes **no `chainId`**: exactly one chain is claimable - the one the network's bridge is configured for, served by `GET /v1/bridge/config` - so there is nothing to name wrongly, and the claim hash commits to it. Its `to` is an address on that chain, not on Pod.

A withdrawal is a solver-gated intent, like an order: it carries an auction-aligned `deadline` and settles when that batch executes. Admission deliberately does not check the balance, because pending fills can raise it before the tick runs, so an insufficient balance arrives as a refused **outcome** on `pod_withdrawals` rather than as a rejected transaction. A refusal debits nothing.

Validators sign each accepted withdrawal using separate cold keys (KMS-backed) dedicated to bridge attestations, distinct from transaction attestation keys. These signatures are specially packed for efficient on-chain verification. The Ethereum bridge contract checks that at least `n - f` validators signed the withdrawal - the same threshold used for transaction finality.

The withdrawal is identified by its own transaction hash - it is always its own transaction, never a batch sub-intent - and the proof is fetched by that hash, from either `GET /v1/bridge/withdrawals/by-id/{tx_hash}` (which also reports `claimable` / `pending` / `refused`) or `pod_getBridgeClaimProof(txHash)`. The bridge relayer watches for claimable withdrawals and submits the claims itself; the call is permissionless, so anyone - including the withdrawer - can submit the same proof if the relayer is unavailable.

See [Bridge from Pod](https://docs.v2.pod.network/guides-references/guides/bridge-from-pod) for a step-by-step guide.

## Decimal Scaling

All tokens on Pod are represented with 18 decimals internally, regardless of their decimals on the source chain (e.g. USDC has 6 decimals on Ethereum but 18 on Pod). The bridge handles the conversion automatically:

- **Ethereum → Pod**: The bridge scales amounts up to 18 decimals when crediting balances on Pod.
- **Pod → Ethereum**: `amount` stays in Pod's 18 decimals, but it must be a whole number of bridged-chain units - `amount % 10^(18 - decimals) == 0`, so a multiple of 1e12 wei for a 6-decimal token. An amount with a remainder finer than that has no faithful representation on the other chain, so it is rejected before attestation rather than truncated. The claim itself carries the converted amount, and the per-token limits are read in the bridged chain's decimals.

`tx.value` is always `0` on a withdraw, native token included: the balance is debited internally, so nothing rides along with the transaction. Withdrawals are gas-exempt for the same reason - an account funded entirely over the bridge holds no Pod-side gas balance, so charging a fee would make the withdrawal that empties a balance unsubmittable.

## Network Upgrades

When the network is upgraded (e.g. validator set changes), past certificates are invalidated because the signing domain changes. Claims from before the upgrade use a merkle inclusion proof instead - the admin commits a merkle root covering all pending claims from the previous version.

Both proof surfaces handle this automatically - they return the appropriate proof type based on the current network version. Users do not need to handle this distinction.

## Limits

The bridge contract enforces per-token daily limits on both deposits and claims. Tokens must be whitelisted by the admin before they can be bridged, with configurable minimum amounts and daily caps.

The per-token minimum and maximum are also enforced on Pod, before a withdrawal is attested - `GET /v1/bridge/config` serves them, in the bridged chain's decimals, alongside the bridged chain's id and bridge contract address. The rolling daily claim cap is not: it lives on the other chain, so a claim submitted once the cap is exhausted reverts while the funds have already left Pod. It becomes claimable again when the window rolls, and the proof stays valid in the meantime.

## Audit

The bridge contract has been [audited by Riley Holterhus](https://github.com/podnetwork/pod-sdk/blob/main/protocol/audits/audit-29-01-2026.pdf) (January 2026).
