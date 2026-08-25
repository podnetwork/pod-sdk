# Native Bridge

Pod has a native bridge for moving ERC20 tokens between Ethereum and Pod. The bridge consists of a smart contract deployed on Ethereum and a precompile on Pod.

## Architecture

- **Ethereum bridge contract** - holds deposited tokens on Ethereum. Users deposit here to bridge into Pod, and claim here when bridging out.
- **Pod bridge precompile** - at `0x50d0000000000000000000000000000000000001` on Pod. Users call this to withdraw a Pod account balance to Ethereum. An orderbook balance leaves through the orderbook precompile instead, which burns it on Pod and makes it claimable on the same contract - see [Pod → Ethereum](native-bridge.md) below.

## Ethereum → Pod

Tokens are deposited to the Ethereum bridge contract and locked. Pod validators run Ethereum full nodes, observe finalized deposits, and automatically credit the corresponding balance on Pod.

See [Bridge to Pod](https://docs.v2.pod.network/guides-references/guides/bridge-to-pod) for a step-by-step guide with code examples.

### Deposit and Call

The Ethereum bridge contract supports depositing tokens and calling a whitelisted contract on Pod in a single transaction. This is useful for bridging tokens and immediately depositing them into the market contract without a separate step.

When calling `deposit` on the Ethereum contract, the `callContract` and `reserveBalance` parameters control this behavior:

- **`callContract`**: Address of a whitelisted contract on Pod to call with the bridged funds (e.g. the market contract). Set to `address(0)` for a normal deposit.
- **`reserveBalance`**: Amount (in the Ethereum token's units) to keep in the user's EOA on Pod. The remainder is forwarded to `callContract` via `deposit(token, amount, to)`.

For example, to bridge 1000 USDC and deposit 900 USDC into the market contract while keeping 100 USDC in your account, set `amount = 1000e6`, `reserveBalance = 100e6`, and `callContract` to the market contract address.

The `callContract` must be whitelisted by the bridge admin via `setCallContractWhitelist`. If `callContract` is `address(0)`, `reserveBalance` must be `0`.

## Pod → Ethereum

Users call `withdraw` on the Pod bridge precompile. One transaction and one signature: the orderbook balance is burned on Pod at the next batch auction and the same value becomes claimable on the chain the bridge is configured for, with nothing credited to a Pod account on the way. The call takes no `chainId` - exactly one chain is claimable, so there is nothing to name wrongly - and its `to` is an address on that chain. It is gas-exempt and signed by the account that owns the funds (delegated session keys cannot withdraw).

Validators sign the withdrawal using separate cold keys (KMS-backed) dedicated to bridge attestations, distinct from transaction attestation keys. These signatures are specially packed for efficient on-chain verification. The Ethereum bridge contract checks that at least `n - f` validators signed the withdrawal - the same threshold used for transaction finality.

The proof comes from `GET /v1/bridge/withdrawals/by-id/{tx_hash}` — keyed by the withdraw transaction's hash — which reports the withdrawal's status and attaches the proof once a certificate can be assembled. The bridge relayer watches for these and submits the claims itself; the claim is permissionless, so anyone can submit it - it does not need to come from the account that withdrew. (`pod_getBridgeClaimProof(txHash)` remains only for withdrawals made through the retired account-balance path, keyed by their transaction hash.)

See [Bridge from Pod](https://docs.v2.pod.network/guides-references/guides/bridge-from-pod) for a step-by-step guide, and the [Bridge precompile reference](https://docs.v2.pod.network/api-reference/applications-precompiles/bridge) for the full call semantics.

## Decimal Scaling

All tokens on Pod are represented with 18 decimals internally, regardless of their decimals on the source chain (e.g. USDC has 6 decimals on Ethereum but 18 on Pod). The bridge handles the conversion automatically:

- **Ethereum → Pod**: The bridge scales amounts up to 18 decimals when crediting balances on Pod.
- **Pod → Ethereum**: `amount` stays in Pod's 18 decimals, but it must be a whole number of claim-chain units - `amount % 10^(18 - decimals) == 0`, so a multiple of 1e12 wei for a 6-decimal token. An amount with a remainder finer than that has no faithful representation on the other chain, so it is rejected before attestation rather than truncated. The claim itself carries the converted amount, and the per-token limits are read in the claim chain's decimals. `tx.value` must be 0, native token included, and the call is gas-exempt - so the entire balance can be withdrawn.

## Network Upgrades

When the network is upgraded (e.g. validator set changes), past certificates are invalidated because the signing domain changes. Claims from before the upgrade use a merkle inclusion proof instead - the admin commits a merkle root covering all pending claims from the previous version.

`GET /v1/bridge/withdrawals/by-id/{tx_hash}` handles this automatically - it returns the appropriate proof type based on the current network version. Users do not need to handle this distinction.

## Limits

The bridge contract enforces per-token daily limits on both deposits and claims. Tokens must be whitelisted by the admin before they can be bridged, with configurable minimum amounts and daily caps.

The per-token minimum and maximum are also enforced on Pod, before a withdrawal is attested - `GET /v1/bridge/config` serves them, in the claim chain's decimals. The rolling daily claim cap is not: it lives on the other chain, so a claim submitted once the cap is exhausted reverts while the funds have already left Pod. It becomes claimable again when the window rolls, and the proof stays valid in the meantime.

## Audit

The bridge contract has been [audited by Riley Holterhus](https://github.com/podnetwork/pod-sdk/blob/main/protocol/audits/audit-29-01-2026.pdf) (January 2026).
