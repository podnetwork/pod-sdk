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

There are two ways out, and which one applies depends on where the funds sit.

**From an orderbook balance** - `withdraw` on the [orderbook precompile](https://docs.v2.pod.network/api-reference/applications-precompiles/orderbook). One transaction and one signature: the balance is burned on Pod and the same value becomes claimable on the chain the bridge is configured for, with nothing credited to a Pod account on the way. The call takes no `chainId` - exactly one chain is claimable, so there is nothing to name wrongly - and its `recipient` is an address on that chain. This is the path a trader takes.

**From a Pod account balance** - `withdraw` on the Pod bridge precompile, which burns the tokens on Pod and takes a `chainId` parameter specifying the target chain where they will be claimed, preventing the same proof from being replayed on other chains the bridge is deployed to. This is the older of the two paths and it goes away with Pod account balances, so nothing new should be built on it.

Both produce the same artifact. Validators sign the withdrawal using separate cold keys (KMS-backed) dedicated to bridge attestations, distinct from transaction attestation keys. These signatures are specially packed for efficient on-chain verification. The Ethereum bridge contract checks that at least `n - f` validators signed the withdrawal - the same threshold used for transaction finality.

Where the proof comes from differs by path:

- **Orderbook withdrawal** - `GET /v1/bridge/withdrawals/by-id/{withdrawal_id}`, which reports the withdrawal's status and attaches the proof once a certificate can be assembled. The bridge relayer watches for these and submits the claims itself.
- **Bridge precompile withdrawal** - `pod_getBridgeClaimProof(txHash)`, keyed by the withdrawal transaction's hash.

Either way, the claim is submitted to the Ethereum bridge contract to release the tokens, and anyone can submit it - it does not need to come from the account that withdrew.

See [Bridge from Pod](https://docs.v2.pod.network/guides-references/guides/bridge-from-pod) for a step-by-step guide to the bridge-precompile path, and the [Orderbook precompile reference](https://docs.v2.pod.network/api-reference/applications-precompiles/orderbook) for withdrawing a trading balance.

## Decimal Scaling

All tokens on Pod are represented with 18 decimals internally, regardless of their decimals on the source chain (e.g. USDC has 6 decimals on Ethereum but 18 on Pod). The bridge handles the conversion automatically:

- **Ethereum → Pod**: The bridge scales amounts up to 18 decimals when crediting balances on Pod.
- **Pod → Ethereum, from an orderbook balance**: `amount` stays in Pod's 18 decimals, but it must be a whole number of claim-chain units - `amount % 10^(18 - decimals) == 0`, so a multiple of 1e12 wei for a 6-decimal token. An amount with a remainder finer than that has no faithful representation on the other chain, so it is rejected before attestation rather than truncated. The claim itself carries the converted amount, and the per-token limits are read in the claim chain's decimals.
- **Pod → Ethereum, from a Pod account balance**: When calling `withdraw` on the Pod bridge precompile, the `amount` must be specified in the target chain token's native units (e.g. 1e6 for 1 USDC), not in Pod's 18-decimal representation. The Withdraw event also emits amounts in the target chain's decimals. For the **native token**, the coin is moved with the transaction, so `tx.value` must equal that `amount` scaled **up** to Pod's 18 decimals (ERC20 withdrawals send no value). Because the withdraw is then subject to the usual `native >= tx.value + gas` check, you cannot bridge your entire balance and leave nothing to pay for gas.

## Network Upgrades

When the network is upgraded (e.g. validator set changes), past certificates are invalidated because the signing domain changes. Claims from before the upgrade use a merkle inclusion proof instead - the admin commits a merkle root covering all pending claims from the previous version.

`pod_getBridgeClaimProof` handles this automatically - it returns the appropriate proof type based on the current network version. Users do not need to handle this distinction.

## Limits

The bridge contract enforces per-token daily limits on both deposits and claims. Tokens must be whitelisted by the admin before they can be bridged, with configurable minimum amounts and daily caps.

The per-token minimum and maximum are also enforced on Pod, before a withdrawal is attested - `GET /v1/bridge/config` serves them, in the claim chain's decimals. The rolling daily claim cap is not: it lives on the other chain, so a claim submitted once the cap is exhausted reverts while the funds have already left Pod. It becomes claimable again when the window rolls, and the proof stays valid in the meantime.

## Audit

The bridge contract has been [audited by Riley Holterhus](https://github.com/podnetwork/pod-sdk/blob/main/protocol/audits/audit-29-01-2026.pdf) (January 2026).
