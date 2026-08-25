# Bridge

The bridge precompile is how funds leave Pod. `withdraw` debits the caller's **orderbook balance** — the same balance bridge deposits credit and trading uses — burns it on Pod, and makes the same value claimable on the chain the network's bridge is configured for. One transaction, one signature, and nothing credited to a Pod account on the way.

For how the bridge works end-to-end, see [Native Bridge](https://docs.v2.pod.network/documentation/native-bridge). For step-by-step guides, see [Bridge to Pod](../guides/bridge-to-pod.md) and [Bridge from Pod](../guides/bridge-from-pod.md).

**Precompile address:** `0x50d0000000000000000000000000000000000001`

## Interface

```solidity
interface IPodBridge {
    /// @notice Withdraw from the caller's orderbook balance to the claim chain.
    /// @dev A batch-auction intent, like an order: it is included in a batch and
    ///      the balance is debited when that batch executes. Checked before
    ///      attestation against the bridge config served by `GET /v1/bridge/config`:
    ///      the token must be bridged, `amount` must be a whole number of
    ///      claim-chain units (`amount % 10^(18 - decimals) == 0`), and the
    ///      converted amount must fall inside that token's `[min, max]`. The
    ///      orderbook balance is checked at execution instead, so an insufficient
    ///      balance arrives as a `pod_withdrawals` outcome rather than as a
    ///      rejected transaction. Gas-exempt; `tx.value` must be 0.
    /// @param token The Pod-side address of the token to withdraw. Use
    ///        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for the native token.
    /// @param to The address receiving the funds **on the claim chain**.
    /// @param amount The amount to withdraw, in Pod's 18 decimals and a whole
    ///        multiple of `10^(18 - decimals)` for the token's claim-chain decimals.
    /// @param deadline The latest batch this withdrawal may be included in, as a
    ///        Unix timestamp in microseconds. Must be a multiple of the `auction_interval`.
    function withdraw(
        address token,
        address to,
        uint256 amount,
        uint128 deadline
    ) external;
}
```

There is exactly one claimable chain — the one the network's bridge is configured for — so `withdraw` takes no chain id and there is nothing to name wrongly. Read the chain, the bridge contract and the per-token rules from `GET /v1/bridge/config` on any full node:

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

**What the parameters mean.**

| Parameter  | Meaning                                                                                                                                                                                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `to`       | An address on the **claim chain**, not on Pod. Same 20 bytes, different chain — check that whoever controls it there is who you mean, especially for a contract address.                                                                                                                 |
| `amount`   | Pod's 18 decimals, and it must be a **whole number of claim-chain units**: `amount % 10^(18 - decimals) == 0`. Where a token is 6-decimal on the claim chain, every withdrawal is a multiple of `1e12` wei. Nothing is rounded for you — an inexact amount is rejected outright.          |
| `token`    | The **Pod-side** token address. `l1_token` from `/v1/bridge/config` is the asset the claim pays out, and that list is the only source of the mapping.                                                                                                                                    |
| `deadline` | The latest batch this intent may land in, in microseconds, aligned to the market's `auction_interval` — computed exactly as for orders (see [Orderbook](orderbook.md)).                                                                                                                  |

The per-token `min`/`max` from `/v1/bridge/config` are in the token's **claim-chain decimals** and are compared against the converted amount, not against the 18-decimal one you sign.

Validators check all of that before attesting. They deliberately do **not** check your orderbook balance there — pending fills can raise it before the batch executes — so an insufficient balance surfaces as an outcome after execution rather than as a rejected transaction.

{% hint style="warning" %}
**Withdrawals are signed by the account that owns the funds.** The bridge precompile has no delegation envelope, so a session key cannot sign one — submit through the master wallet. The call is **gas-exempt** (an account whose entire balance sits on the orderbook can withdraw all of it) and `tx.value` must be `0`, including for the native token.
{% endhint %}

## Following a withdrawal

A withdrawal is identified by its **own transaction hash** — the value your receipt already carries; nothing is derived. Outcomes are published once per batch:

| Surface                                                        | Use                                                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `eth_subscribe("pod_withdrawals", { account, since })`         | Live outcomes. Each carries `tx_hash`, `withdrawer`, `to`, `token`, `amount` (18 decimals), `error` and `timestamp_us`.          |
| `GET /v1/bridge/withdrawals/{account}?since=&since_id=&limit=` | Backfill after a disconnect — identical shape, and `since` is the same cursor the subscription takes.                            |
| `GET /v1/bridge/withdrawals/by-id/{tx_hash}`                   | One withdrawal: its `status` (`claimable`, `pending` or `refused`) and, once assembled, the claim `proof`.                       |

`withdrawer` is the **debited** account, and it is what `account` filters on.

`error` is absent when the withdrawal is claimable, and otherwise names why it was refused:

* `insufficient_balance` — the balance did not cover the amount when the batch executed.
* `not_included` — the solver left the intent out of the solution its deadline pointed at.

Both mean **nothing was debited**: the funds are still in your orderbook balance, no claim exists and none ever will. Resubmit — the new transaction is a new withdrawal. This is the only place a failure reason appears, so a client watching only the claim chain waits forever for an event that cannot come.

## Claiming

Once `n - f` validators have signed the withdrawal, `GET /v1/bridge/withdrawals/by-id/{tx_hash}` returns `status: "claimable"` and a `proof` carrying the claim hash together with the claim-chain `(token, amount, to)` to pass to the bridge contract's `claim`. The bridge relayer submits that claim for you; the call is permissionless, so anyone — including you — can submit the same proof if the relayer is unavailable. `status: "pending"` means the certificate is still being assembled: ask again rather than treating it as a failure. See [Native Bridge](../../protocol/native-bridge.md) for how the certificate is produced.
