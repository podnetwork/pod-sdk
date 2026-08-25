# Orderbook

The **Orderbook precompile** is the on-chain execution surface for native markets — both **spot** and **perpetual**. The same contract, calls, and balances are shared across both market types; a market's behavior is determined by the `MarketType` set at creation.

Use it for **placing/canceling/updating orders**, **opening leveraged perpetual positions**, **arming take-profit / stop-loss triggers**, and **reading balances and order state**. Funds enter the orderbook balance through [bridge deposits](bridge.md) and leave through the bridge precompile's `withdraw` — the orderbook itself has no deposit or withdraw calls.

{% hint style="info" %}
**Orderbook precompile address:** `0x50d0000000000000000000000000000000000002`
{% endhint %}

{% hint style="warning" %}
**All timestamps sent to the orderbook are in microseconds**, not milliseconds or seconds. This applies to every `deadline` and `ttl` on this precompile.
{% endhint %}

{% hint style="info" %}
**Orders are identified by a computed `order_id`, not the tx hash.** A resting order is keyed by

```text
order_id = keccak256(abi.encode(address signer, uint64 nonce, uint32 sequence))
```

where `signer` is the order owner, `nonce` is the `submitOrder` transaction's nonce, and `sequence` is the intent's position inside a `submitBatch` envelope (`0` for a standalone `submitOrder`). Wherever a call references an existing order — `cancel(canceledOrder, …)` and `update(updatedOrder, …)` — pass this `order_id`. You can compute it yourself with the formula above, or read it back from `ob_getOrders`, which returns it as `order_id` (the originating `submitOrder` tx hash is exposed separately as `tx_hash`).
{% endhint %}

{% hint style="warning" %}
**`deadline`** is the latest batch the intent is allowed to be included in — the intent can land in any batch up to and including the one whose end matches `deadline`. It must be aligned to the market's `auction_interval` (a multiple of it), or the validator rejects the intent with `"CLOB validation failed: Deadline is not aligned to auction interval"`. Compute it as:

```text
deadline = ceil((now + LAG) / auction_interval) * auction_interval
```

`LAG` is the headroom you add to `now` so the intent reaches enough validators before its target batch. It is capped at **10 minutes**; aim for **at least 1 minute** under normal conditions, smaller when you want to target a specific upcoming batch.

The alignment rule applies to **every deadline-bearing call** on this precompile — orders, cancels, updates and triggers — and to the bridge precompile's `withdraw`. All of them pass through the same validator check.

See [Batch Deadline](../../protocol/orderbook.md#batch-deadline) in the protocol reference for the full discussion of `deadline` semantics and the trade-offs around `LAG`.
{% endhint %}

### Order flags

`submitOrder` carries an order's boolean properties in a single `uint8 flags` bitfield rather than one `bool` argument per property. OR together the bits you want; `0` is a plain resting limit order.

| Bit | Value  | Flag          | Meaning                                                                                                                                     |
| --- | ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | `0x01` | `REDUCE_ONLY` | The order may only reduce the submitter's existing position. Perp markets only.                                                              |
| 1   | `0x02` | `IOC`         | Immediate-or-cancel: whatever does not match in the order's batch is cancelled at the end of it instead of resting on the book.              |
| 2   | `0x04` | `POST_ONLY`   | Add-liquidity-only: the order rests, but may not trade in the batch that admitted it. See [Post-only orders](#post-only-orders).             |

Combinations are checked when the intent is validated:

* `IOC | POST_ONLY` is **rejected** (`post-only order cannot be immediate-or-cancel`) — IOC demands a fill in the admitting batch, post-only forbids one.
* `POST_ONLY` on a `Market` order is **rejected** (`post-only is not valid for a market order`) — a market order has no resting price, so it has nothing to post at.
* `REDUCE_ONLY | POST_ONLY` is fine, as is any other combination.
* Market orders must set `IOC` (`market orders must be immediate-or-cancel`).

{% hint style="warning" %}
**Bits 3–7 must be zero.** Calldata carrying a flag bit the network does not recognise is rejected, not masked off — so an intent is never executed with a property silently dropped from it. Future order properties arrive as new bits here rather than as another overload.
{% endhint %}

{% hint style="info" %}
**`submitOrder` is overloaded, and only the `flags` form is current.** Encode against the exact signature — the selector differs per overload:

| Signature                                                                             | Selector     | Status                                                                                                                              |
| ------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `submitOrder(bytes32,int256,uint256,uint8,uint128,uint128,uint8)`                      | `0x1e416275` | **Current.** The `flags` form; the only one that can request post-only.                                                              |
| `submitOrder(bytes32,int256,uint256,uint8,uint128,uint128,bool,bool)`                  | `0x435f7e71` | Deprecated. The old `reduceOnly, ioc` pair, still accepted; equivalent to setting bit 0 from `reduceOnly` and bit 1 from `ioc`.                         |
| `submitOrder(bytes32,int256,uint256,uint8,uint128,uint128,bool)`                       | `0xc06f0480` | Retired. The `reduceOnly`-only form, rejected for any `deadline` at or after the network's configured legacy cutoff.                 |

The `flags` overload can only be decoded by nodes that ship it, so a client that must also work against a network running an older build can keep emitting the deprecated `bool, bool` form — it is accepted unchanged, and it simply cannot request post-only.

`submitTrigger` still takes `bool reduceOnly, bool ioc` and has no `flags` argument, so a trigger's synthetic order cannot be post-only.
{% endhint %}

### Post-only orders

A post-only order is guaranteed to **add** liquidity: it rests on the book and never takes from it on the way in. Set `POST_ONLY` (`0x04`) in `flags`.

Because pod matches in discrete batch auctions rather than on arrival, "would this order cross the book right now?" is the wrong question — every intent in a batch is matched together, so two orders that arrive in the same batch and match each other are *both* takers. The guarantee is therefore expressed against the batch:

> **A post-only order may not trade in the batch that admitted it.** From the next batch onwards it is an ordinary resting maker and matches normally.

What that means in practice:

* The order enters the book immediately and is reported `active`, like any other resting order.
* If it would have traded **in that first batch**, it is removed from the book instead. The removal is terminal and never partial — a refusal never leaves a post-only order half-filled — and it is reported with the terminal status `post_only_refused`, which is distinct from `canceled` so you can tell a refusal from a cancel you sent yourself.
* If it would **not** have traded in that batch, nothing happens to it: it rests, and can be matched from the next batch on.
* If another order at the same price with better queue priority absorbs the crossing liquidity first, your post-only order simply rests — it never had the opportunity to take, so there is nothing to refuse.
* Two post-only orders admitted in the same batch that cross only each other are **both** refused. Neither took resting liquidity, but each would have taken from the other.

**Amendments re-arm the guarantee.** An `update` that re-queues the order — a price change, or a size increase — makes it a newcomer again, so it may not trade for the rest of *that* batch and can be refused in it (for example, when you reprice it onto a crossing level). An update that only *decreases* the size keeps its queue priority and its original admission batch, so it goes on matching normally.

### Withdrawals leave Pod

Withdrawing an orderbook balance is a **bridge precompile** call: `withdraw(token, to, amount, deadline)` at `0x50d0000000000000000000000000000000000001` debits the orderbook balance at the next batch auction and makes the same value claimable on the bridge's claim chain — nothing is credited anywhere on Pod along the way. The parameters, the `withdrawal_id`, the outcome surfaces (`pod_withdrawals`, `GET /v1/bridge/withdrawals/…`) and the claim flow are documented on the [Bridge precompile page](bridge.md).

### Batch envelope

`submitBatch` packs several single-intent calls (1–64) into a single signed transaction that lands atomically in one auction tick. Each entry in `inner` is the full ABI-encoded calldata of a single-intent function (`submitOrder`, `cancel`, `update`, `submitTrigger`, …) — encoded exactly as a standalone call, including its 4-byte selector. Every sub-intent **must carry the same `deadline`** (the uniform-deadline invariant), and nested batches are rejected. For the full rules and a worked example, see [Submit a batch order](../guides/submit-a-batch-order.md).

### Delegation envelope

`delegated` lets a **delegate** key perform an orderbook call on behalf of a **master** account. The transaction is signed by the delegate; `signature` is the master's 65-byte `r ‖ s ‖ v` EIP-712 signature over `DelegationAuth { delegate, validUntil }` (domain `{ name: "pod delegation", version: "1", chainId }`), where `delegate` must equal the transaction's signer, and `inner` is the full ABI-encoded calldata of the wrapped call, including its 4-byte selector. The certificate is verified statelessly on every transaction — no registration, no on-chain state — and the intent is accepted only while `validUntil >= deadline` of the inner call (both in microseconds).

The inner intent is **owned by the master** (balances, resting-order owner, cancel/update target) while its `order_id` keys on the delegate (the tx signer). Any deadline-bearing orderbook call can be wrapped — single intents or a whole `submitBatch` — but `submitSolutions`, `createOrderBook`, and nested `delegated` are rejected. Withdrawals cannot be delegated at all: they live on the [bridge precompile](bridge.md), which has no delegation envelope, so only the master can move funds off Pod. Delegated calls are gas-exempt. For the concept and security model see [Key Delegation](../../protocol/key-delegation.md) in the protocol reference; for a worked example see [Delegate a trading key](../guides/delegate-a-trading-key.md).

### Solidity interface (ABI)

```solidity
/**
 * @title Orderbook
 * @notice A central limit order book for trading assets.
 * @dev Handles order placement, cancellation, and fund management.
 */
contract Orderbook {

    enum Side { Buy, Sell }
    enum OrderType { Limit, Market }
    enum MarketType { Spot, Perp }

    // Trigger kind for a TP/SL trigger (perp markets only).
    enum TriggerType { TakeProfit, StopLoss }

    // Exposure-association for a trigger.
    // None: standalone — removed only by a user cancel, TTL expiry, or its own fire.
    // Asset: binds the trigger to the asset the market type implies — on perp
    //        markets the venue cancels the armed trigger (and any resting synthetic
    //        order it already produced) at the end of the batch in which the
    //        bidder's position on the pair reaches size 0; on spot markets it
    //        cancels the armed trigger when the bidder's base-asset holdings hit 0.
    //        (Renamed from `Position`; same ABI value — older nodes report it as
    //        `position` in RPC responses.)
    enum TriggerGrouping { None, Asset }

    // --- Order Management ---

    // Bits of `submitOrder`'s `flags` argument. OR together the ones you want;
    // 0 is a plain resting limit order. Bits 3-7 are unassigned and MUST be
    // zero — a node rejects calldata carrying a flag bit it does not know
    // rather than ignoring it. New order properties become a new bit here.
    uint8 constant REDUCE_ONLY = 0x01; // perp markets only
    uint8 constant IOC         = 0x02;
    uint8 constant POST_ONLY   = 0x04;

    /**
     * Submits a new order to the orderbook.
     * The direction of the trade (Bid/Ask) is determined by the sign of the size.
     * @param orderbookId The unique identifier of the specific market (e.g., ETH-USDC).
     * @param size The size of the order. Positive (+) for Buy/Bid, Negative (-) for Sell/Ask.
     * @param price The limit price for the order.
     * @param orderType The order type (Limit or Market).
     * @param deadline The timestamp limit for this order to be included in a batch in microseconds. Must be a multiple of the market's `auction_interval`.
     * @param ttl The "Time To Live" duration in microseconds; how long the order remains active in the book.
     * @param flags Bitfield of the order's properties — REDUCE_ONLY, IOC, POST_ONLY (see above).
     *        IOC | POST_ONLY is rejected, as is POST_ONLY on a Market order.
     */
    function submitOrder(
        bytes32 orderbookId,
        int256 size,
        uint256 price,
        OrderType orderType,
        uint128 deadline,
        uint128 ttl,
        uint8 flags
    ) public {}

    /**
     * @notice Deprecated: the pre-`flags` form of `submitOrder`, kept so calldata
     *         written against it still decodes. It cannot request POST_ONLY.
     *         Equivalent to the current form with bit 0 set from `reduceOnly`
     *         and bit 1 from `ioc`.
     * @dev A third, retired overload — the same call without `ioc` — is rejected
     *      for any `deadline` at or after the network's legacy cutoff.
     */
    function submitOrder(
        bytes32 orderbookId,
        int256 size,
        uint256 price,
        OrderType orderType,
        uint128 deadline,
        uint128 ttl,
        bool reduceOnly,
        bool ioc
    ) public {}

    /**
     * @notice Cancels an existing open order.
     * @param orderbookId The unique identifier of the market the order belongs to.
     * @param canceledOrder The `order_id` of the order to cancel — the computed
     *        `keccak256(abi.encode(signer, nonce, sequence))`, also returned as `order_id` by
     *        `ob_getOrders`. This is NOT the `submitOrder` tx hash.
     * @param deadline The Unix timestamp after which this cancellation request is invalid in microseconds. Must be a multiple of the market's `auction_interval`.
     */
    function cancel(
        bytes32 orderbookId,
        bytes32 canceledOrder,
        uint128 deadline
    ) public {}

    /**
     * @notice Updates an existing open order.
     * @param orderbookId The unique identifier of the market the order belongs to.
     * @param updatedOrder The `order_id` of the order to update — the computed
     *        `keccak256(abi.encode(signer, nonce, sequence))`, also returned as `order_id` by
     *        `ob_getOrders`. This is NOT the `submitOrder` tx hash.
     * @param newSize The new size for the order.
     * @param newPrice The new price for the order.
     * @param token The token used to cover any additional collateral required by the update.
     * @param deadline The Unix timestamp after which this update is invalid in microseconds. Must be a multiple of the market's `auction_interval`.
     */
    function update(
        bytes32 orderbookId,
        bytes32 updatedOrder,
        uint256 newSize,
        uint256 newPrice,
        address token,
        uint128 deadline
    ) public {}

    // --- Data Retrieval ---

    /**
     * @notice Token balance for an account, as a signed integer.
     * @param token The address of the token to check.
     * @param account The address of the account to check.
     * @return Native USD: cash adjusted for unsettled funding (negative if the account is underwater).
     *         Other tokens: the raw spot balance.
     */
    function balanceOf(address token, address account) public view returns (int256) {}

    /**
     * @notice Withdrawable balance for an account.
     * @param token The address of the token to check.
     * @param account The address of the account to check.
     * @return Native USD: perps equity minus reserved initial margin (never negative).
     *         Other tokens: the raw spot balance (no margin deducted).
     */
    function withdrawableBalance(address token, address account) public view returns (uint256) {}

    // --- TP/SL triggers (perp markets only) ---

    /**
     * @notice Arms a take-profit / stop-loss trigger on a perp market.
     * @dev The trigger rests on the venue until it fires, is cancelled, or its TTL
     *      expires. It fires when the pair's mark price crosses `triggerPrice` in the
     *      direction implied by the order side (sign of `size`) and `triggerType`:
     *
     *        | Side | Type       | Fires when             |
     *        |------|------------|------------------------|
     *        | Buy  | TakeProfit | mark price <= trigger  |
     *        | Buy  | StopLoss   | mark price >= trigger  |
     *        | Sell | TakeProfit | mark price >= trigger  |
     *        | Sell | StopLoss   | mark price <= trigger  |
     *
     *      On firing the venue emits a synthetic limit order (price `limitPrice`,
     *      size `size`) that is admitted into the matching batch like any other order.
     * @param orderbookId The unique identifier of the perp market.
     * @param size The signed base amount of the order produced when the trigger fires.
     *        Positive (+) for Buy/long, negative (-) for Sell/short.
     * @param limitPrice The limit price of the synthetic order produced when the trigger fires.
     * @param triggerPrice The mark-price threshold that fires the trigger.
     * @param triggerType TakeProfit or StopLoss.
     * @param grouping Whether the trigger is bound to the bidder's exposure on the pair (see TriggerGrouping).
     * @param deadline The latest batch this intent may be included in, in microseconds. Must be a multiple of the market's `auction_interval`.
     * @param ttl The "Time To Live" duration in microseconds; how long the armed trigger remains active.
     * @param reduceOnly If true, the synthetic order will only reduce an existing position.
     * @param ioc If true, the synthetic order is Immediate-Or-Cancel: any unmatched portion is cancelled at the end of the batch it fires in.
     */
    function submitTrigger(
        bytes32 orderbookId,
        int256 size,
        uint256 limitPrice,
        uint256 triggerPrice,
        TriggerType triggerType,
        TriggerGrouping grouping,
        uint128 deadline,
        uint128 ttl,
        bool reduceOnly,
        bool ioc
    ) public {}

    /**
     * @notice Cancels an armed trigger.
     * @param orderbookId The unique identifier of the market the trigger belongs to.
     * @param triggerOrder The `order_id` of the trigger to cancel — the computed
     *        `keccak256(abi.encode(signer, nonce, sequence))`, also returned as `order_id`
     *        by `ob_getTriggers`. This is NOT the `submitTrigger` tx hash.
     * @param deadline The latest batch this intent may be included in, in microseconds. Must be a multiple of the market's `auction_interval`.
     */
    function cancelTrigger(
        bytes32 orderbookId,
        bytes32 triggerOrder,
        uint128 deadline
    ) public {}

    /**
     * @notice Updates an armed trigger. The `grouping` mode is immutable and cannot be changed.
     * @param orderbookId The unique identifier of the market the trigger belongs to.
     * @param triggerOrder The `order_id` of the trigger to update — the computed
     *        `keccak256(abi.encode(signer, nonce, sequence))`, also returned as `order_id`
     *        by `ob_getTriggers`. This is NOT the `submitTrigger` tx hash.
     * @param newSize The new signed base amount of the order produced when the trigger fires.
     * @param newLimitPrice The new limit price of the synthetic order.
     * @param newTriggerPrice The new mark-price threshold that fires the trigger.
     * @param deadline The latest batch this intent may be included in, in microseconds. Must be a multiple of the market's `auction_interval`.
     */
    function updateTrigger(
        bytes32 orderbookId,
        bytes32 triggerOrder,
        int256 newSize,
        uint256 newLimitPrice,
        uint256 newTriggerPrice,
        uint128 deadline
    ) public {}

    // --- Batch envelope ---

    /**
     * @notice Carries multiple single-intent calls in one signed transaction.
     * @dev Each `inner[i]` is the full ABI-encoded calldata of one of the other
     *      single-intent functions on this contract — `submitOrder`, `cancel`,
     *      `update`, `submitTrigger`, `cancelTrigger`, or `updateTrigger`.
     *      The whole envelope is atomic: it lands in a
     *      single auction tick, so every sub-intent must carry the **same**
     *      `deadline`. Constraints (enforced at validation):
     *      - 1 to 64 sub-intents (the cap is configurable by the operator).
     *      - All sub-intents share one `deadline` (uniform-deadline invariant).
     *      - Nested batches are rejected — `inner[i]` may not itself be a `submitBatch`.
     * @param inner The ABI-encoded calldata of each sub-intent, in order.
     */
    function submitBatch(bytes[] calldata inner) public {}

    // --- Delegation envelope ---

    /**
     * @notice Performs an orderbook call on behalf of a master account. The
     *         transaction is signed by the delegate; the master's authorization
     *         travels inside the call and is verified on every transaction.
     * @dev `signature` is the master's 65-byte `r‖s‖v` EIP-712 signature (v = 27/28)
     *      over `DelegationAuth { address delegate; uint64 validUntil; }` with domain
     *      `{ name: "pod delegation", version: "1", chainId }`, where `delegate` must
     *      equal the transaction's signer. Constraints (enforced at validation):
     *      - `validUntil` must be >= the inner call's `deadline` (both microseconds).
     *      - `inner` must be a deadline-bearing call — a single intent or a
     *        `submitBatch`. `submitSolutions`, `createOrderBook`, and nested
     *        `delegated` are rejected; view functions cannot be wrapped.
     *      The inner intent is owned by `master` (balances, resting-order owner,
     *      cancel/update target), while its `order_id` keys on the delegate
     *      (the tx signer). Delegated calls are gas-exempt.
     * @param master The account the wrapped call is performed on behalf of.
     * @param validUntil Expiry of the delegation certificate, in microseconds.
     * @param signature The master's 65-byte EIP-712 signature authorizing the delegate.
     * @param inner The full ABI-encoded calldata of the wrapped call, including its selector.
     */
    function delegated(
        address master,
        uint64 validUntil,
        bytes calldata signature,
        bytes calldata inner
    ) public {}
}
```
