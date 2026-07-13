# Bridge

The **Bridge precompile** is how value crosses the boundary between Pod and the chain the network's bridge is configured for — the **bridged chain**. It owns both directions:

* **In** — a deposit made on the bridged chain's bridge contract is observed by validators and credited straight to the recipient's **balance**. There is no deposit call on Pod.
* **Out** — `withdraw` debits the caller's balance, burns it on Pod, and makes the same value claimable on the bridged chain.

The funds deposited to Pod via the bridge are directly usable by the orderbook.

{% hint style="info" %}
**Bridge precompile address:** `0x50d0000000000000000000000000000000000001`
{% endhint %}

For how the bridge works end-to-end, see [Native Bridge](../../protocol/native-bridge.md). For step-by-step guides, see [Bridge to Pod](../guides/bridge-to-pod.md) and [Bridge from Pod](../guides/bridge-from-pod.md).

## Reading the bridge configuration

`withdraw` takes **no `chainId`**: exactly one chain is claimable, so there is nothing to name wrongly. That chain, the contract the claim is submitted to, and the per-token rules all come from `GET /v1/bridge/config` on any full node:

```json
{
  "claim_chain_id": 42161,
  "source_contract": "0x…",
  "version": 1,
  "tokens": [
    { "pod_token": "0x…", "l1_token": "0x…", "decimals": 6, "min": "0xf4240", "max": "0x…" }
  ]
}
```

`tokens` is the only source of the Pod-token → bridged-chain-token mapping, and `min`/`max` are in the token's **bridged-chain decimals**, compared against the converted amount rather than the 18-decimal one that is signed.

## Withdrawing

`withdraw` is a **solver-gated intent**, not an immediate transfer. It carries a `deadline` like an order, settles when that batch executes, and its result arrives as an outcome rather than as a receipt.

**What the parameters mean.**

| Parameter  | Meaning                                                                                                                                                                                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `token`    | The **Pod-side** token address. Use `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` for the native token. `l1_token` from `/v1/bridge/config` is the asset the claim actually pays out.                                                                                               |
| `to`       | An address on the **bridged chain**, not on Pod. Same 20 bytes, different chain — the address must be controlled by the intended recipient there, which matters most for a contract address.                                                                                                            |
| `amount`   | Pod's 18 decimals, and it must be a **whole number of bridged-chain units**: `amount % 10^(18 - decimals) == 0`. Where a token is 6-decimal on the bridged chain, every withdrawal is a multiple of `1e12` wei. Nothing is rounded — an inexact amount is rejected outright. |
| `deadline` | The latest batch this intent may land in, in microseconds, aligned to the orderbook's `auction_interval` — the same rule every orderbook intent follows.                                                                                                                            |

{% hint style="warning" %}
**`tx.value` must be `0`, for the native token too.** The balance is debited internally; nothing rides along with the transaction. A withdraw carrying value is rejected.

Withdrawals are also **gas-exempt**, so an account whose entire balance arrived over the bridge can withdraw all of it without holding anything back for fees.
{% endhint %}

**A withdrawal is valid when** the token is bridged, `amount` converts to a whole number of bridged-chain units and falls inside that token's `[min, max]`, `tx.value` is zero, and `deadline` is aligned to the auction interval and has not already executed.

**It is rejected outright** — the transaction never lands — when any of those fails.

The balance is **not** part of that check. It is compared against the withdrawable balance when the batch executes, because pending fills can raise it in the meantime. A withdrawal the balance does not cover at that point is reported as a failed outcome rather than rejected as a transaction, and debits nothing.

**A withdrawal is always its own transaction.** It cannot be packed into an orderbook `submitBatch` and cannot be wrapped in `delegated`. Its identity is therefore the **withdraw transaction's hash**, which is what every outcome and lookup below is keyed by.

## Following a withdrawal

Outcomes are published once per batch:

| Surface                                                         | Use                                                                                                                                                       |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eth_subscribe("pod_withdrawals", { account, since })`          | Live outcomes. Each carries `tx_hash`, `withdrawer`, `to`, `token`, `amount` (18 decimals), `error` and `timestamp_us`.                                     |
| `GET /v1/bridge/withdrawals/{account}?since=&since_id=&limit=`  | Backfill after a disconnect — identical shape, and `since` is the same cursor the subscription takes.                                                       |
| `GET /v1/bridge/withdrawals/by-id/{tx_hash}`                    | One withdrawal: its `status` (`claimable`, `pending` or `refused`) and, once assembled, the claim `proof`.                                                  |
| `pod_getBridgeClaimProof(txHash)`                               | The claim proof on its own, by the same key.                                                                                                                |

`withdrawer` is the debited account, and it is what `account` filters on.

`error` names why a withdrawal was refused:

* `insufficient_balance` — the balance did not cover the amount when the batch executed.
* `not_included` — the solver left the intent out of the solution its deadline pointed at.

Both mean **nothing was debited**: the funds remain on the account, no claim exists and none ever will. The nonce is spent, so retrying means a new transaction with a new hash. This is the only place a failure reason appears, so a client watching only the bridged chain waits forever for an event that cannot come.

An absent `error` is the ordinary claimable case, but do not read it as a guarantee: a node whose bridge config does not cover the token records the row, signs nothing, and reports `refused` **without** a reason. Confirm against `status` and `proof` rather than treating absent-`error` as "on its way".

## Claiming

Once `n - f` validators have signed the withdrawal, `GET /v1/bridge/withdrawals/by-id/{tx_hash}` returns `status: "claimable"` and a `proof`. Two of its fields pass straight to the bridge contract's `claim` and one does not:

| Proof field       | Passing it to `claim`                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `amount`          | Yes. Already in the token's **bridged-chain** decimals, not the 18-decimal value that was signed — take it from here rather than recomputing it.                          |
| `to`              | Yes. Already a bridged-chain address.                                                                                                                                 |
| `token`           | **No.** This is the **Pod-side** address, because a Pod RPC answers in Pod terms. `claim` names the bridged-chain asset, so map it through `l1_token` in `/v1/bridge/config`. Passing the Pod address reverts. |
| `proof`, `aux_tx_suffix` | Yes, but they serialize as **JSON arrays of byte values**, not `0x` strings. Convert before handing them to a web3 library's `bytes` parameter.               |

`claim_hash` is also returned; the bridge contract keys `processedRequests` on it, so a caller can check whether a claim already landed before spending a transaction.

The bridge relayer submits that claim; the call is permissionless, so anyone can submit the same proof if the relayer is unavailable. `status: "pending"` means the certificate is still being assembled: ask again rather than treating it as a failure. See [Native Bridge](../../protocol/native-bridge.md) for how the certificate is produced.

{% hint style="warning" %}
**Branch on `proof`, not on `status`.** The status vocabulary can grow, and a client holding burned funds must never let an unfamiliar value veto a valid certificate sitting in the same response. Claim whenever `proof` is present, treat `refused` as terminal, and treat anything else — `pending` included — as "ask again".
{% endhint %}

## Interface

```solidity
interface IPodBridge {
    /// @notice Emitted on Pod when a bridge-in deposit is applied. Mirrors the
    ///         bridged chain's `Bridge.Deposit` event so the two can be correlated;
    ///         the credit itself lands on the recipient's balance.
    event DepositApplied(
        uint256 indexed depositId,
        address indexed from,
        address indexed to,
        address token,
        uint256 amount,
        address callContract,
        uint256 reserveBalance,
        uint256 l1Block
    );

    /// @notice Withdraw from the caller's balance to the bridged chain.
    ///         The balance is debited when the batch executes and the same value
    ///         becomes claimable on the bridged chain; nothing is credited on Pod.
    /// @dev There is no `chainId` — exactly one chain is claimable, and the claim
    ///      hash commits to it. `tx.value` must be zero, for the native token too.
    ///      The withdrawal is identified by this transaction's own hash. Checked
    ///      before attestation against `GET /v1/bridge/config`; the balance is
    ///      checked at execution, so an insufficient balance arrives as a
    ///      `pod_withdrawals` outcome rather than as a rejected transaction.
    /// @param token Token address on Pod. Use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for the native token.
    /// @param to Recipient address on the bridged chain.
    /// @param amount Amount in Pod's 18 decimals; must be a whole number of bridged-chain units and within the token's `[min, max]`.
    /// @param deadline The latest batch this intent may be included in, in microseconds. Must be a multiple of the orderbook's `auction_interval`.
    function withdraw(
        address token,
        address to,
        uint256 amount,
        uint128 deadline
    ) external;

    /// @notice Applies bridge-in deposits observed on the bridged chain, crediting
    ///         each recipient's balance.
    /// @dev **Callable only by the configured bridge relayer** — users never send
    ///      this. Every field of every entry is checked by each validator against
    ///      its own view of the finalized bridged-chain `Bridge.Deposit` event before
    ///      it attests, and `depositId` is replay-protected. Listed here because
    ///      it is what puts funds on Pod, not because a client calls it.
    function processDeposits(
        uint128 deadline,
        DepositParams[] calldata deposits
    ) external;

    struct DepositParams {
        uint256 depositId;
        uint256 l1Block;
        address from;
        address to;
        address token;
        uint256 amount;
        address callContract;
        uint256 reserveBalance;
    }
}
```

{% hint style="info" %}
**`callContract` and `reserveBalance` no longer route anything.** They are carried through from the bridged-chain event and re-emitted on `DepositApplied` so the two sides still reconcile, but the deposit is credited whole to the recipient's balance either way. There is no longer a second balance to split it against.
{% endhint %}

## Gas

Gas is charged per operation (see [Gas](../README.md#gas)):

| Operation      | Gas    |
| -------------- | ------ |
| `withdraw`     | 50,000 |
| any other call | 21,000 |

Deposits are credited by the network and cost the user nothing on Pod.

## Decimal Scaling

All tokens on Pod carry 18 decimals, regardless of their decimals on the bridged chain (USDC is 6 there, 18 here). The bridge converts:

* **In** — the credited amount is scaled **up** to 18 decimals.
* **Out** — the `amount` passed to `withdraw` is already in Pod's 18 decimals; it is scaled **down** for the claim, which is why it must be a whole number of bridged-chain units.
