# Key Delegation

Pod lets an account (the **master**) authorize a secondary key (the **delegate**) to trade on its behalf on the orderbook. The master signs a **single off-chain message** — it never signs a Pod transaction — and the delegate then signs and submits orders, cancels, updates, triggers, deposits, and withdrawals, while the funds and resting orders remain owned by the master.

{% hint style="info" %}
Delegation is **stateless**: the authorization travels inside every delegated transaction and is verified from the transaction alone. There is no registration transaction and no on-chain delegation state — see [How it works](key-delegation.md#how-it-works) below.
{% endhint %}

## Why delegate a key

* **Embedded wallets / one-signature onboarding.** A user signs one message with their existing wallet (e.g. via `eth_signTypedData_v4`); an app-controlled ephemeral key transacts from then on, with no further wallet pop-ups. The external wallet never needs to sign a Pod transaction.
* **Bots and trading services.** Hand a service a hot key that can trade the account's balance but can never move funds anywhere except back to the master.
* **Hot/cold key separation.** The master can be a cold key that signs only the delegation message and remains the only key able to direct funds to an external address; the hot delegate trades.
* **Nonce isolation.** All delegated activity rides the *delegate's* nonce stream, so the master account never sends transactions and can never get [nonce-locked](network-architecture/local-ordering.md). If a delegate's account gets stuck, mint a new delegate key and sign a new delegation.

## How it works

1. The master signs an EIP-712 `DelegationAuth { delegate, validUntil }` message off-chain, with domain `{ name: "pod delegation", version: "1", chainId }`. `delegate` is the address of the key being authorized; `validUntil` is a timestamp in **microseconds**. The result is a standard 65-byte `r ‖ s ‖ v` signature — the delegation certificate.
2. The delegate wraps each orderbook call in a `delegated(master, validUntil, signature, inner)` envelope — where `inner` is the ABI-encoded calldata of the call it is performing — and signs the transaction with its own key. The same certificate is reused on every delegated transaction until it expires.
3. Every validator verifies the certificate from the transaction alone: the signature must recover to `master`, and the certificate must still cover the wrapped intent — `validUntil >= deadline` of the inner intent (both in microseconds). No on-chain state is consulted, so verification is deterministic across validators.

See [Delegate a trading key](../api-reference/guides/delegate-a-trading-key.md) for a step-by-step guide with code examples, and the [Orderbook precompile reference](../api-reference/applications-precompiles/orderbook.md#delegation-envelope) for the `delegated` ABI.

## Ownership vs identity

A delegated intent is **owned by the master** but **signed by the delegate**:

| Aspect                                                 | Value                                    |
| ------------------------------------------------------ | ---------------------------------------- |
| Resting-order owner, balances, cancel/withdraw target  | master                                   |
| `order_id`                                             | keyed on the delegate (the tx signer)    |
| Transaction signer, nonce, account lock                | delegate                                 |
| `deposit` / `withdraw` recipient                       | forced to the master - on the claim chain, for a withdraw |
| Gas                                                    | exempt (the delegate needs no gas funds) |

Because `order_id` is derived from the delegate rather than the master, two delegates of the same master never collide on order ids. And because ownership resolves to the master, the master can always cancel a delegate-placed order directly with its own key.

## What can be delegated

| Inner call | Delegated? | Notes |
| --- | --- | --- |
| `submitOrder`, `cancel`, `update` | ✅ | owned by the master; `order_id` keys on the delegate |
| `submitTrigger`, `cancelTrigger`, `updateTrigger` | ✅ | same |
| `deposit`, `withdraw` | ✅ | `recipient` is **forced to the master** — a delegate can never send funds elsewhere, on Pod or on the claim chain |
| `submitBatch` | ✅ | every sub-intent is owned by the master; the certificate must cover the batch's `deadline` |
| `submitSolutions`, `createOrderBook`, nested `delegated` | ❌ | rejected at validation |

The set of delegatable calls is fixed by the protocol — a delegation certificate cannot narrow it further. Scope a delegation in time instead, with a short `validUntil`.

## Security model

* **Expiry.** A delegated intent is honored only while `validUntil >= deadline` of the intent. Expired or malformed certificates make the transaction invalid.
* **No exfiltration.** A delegated `withdraw` or `deposit` can only move funds to the master, so a leaked delegate key can trade the master's balance but never steal it.
* **No revocation.** There is no explicit revoke: a certificate stays valid until its `validUntil`. Keep `validUntil` short and rotate — to replace a delegate, stop using the old key and sign a new `DelegationAuth` for a new one.
