# Orderbook

The **Orderbook precompile** is the on-chain execution surface for native markets — both **spot** and **perpetual**. The same contract, calls, and balances are shared across both market types; a market's behavior is determined by the `MarketType` set at creation.

Use it for **placing/canceling/updating orders**, **depositing/withdrawing funds**, **opening leveraged perpetual positions**, **arming take-profit / stop-loss triggers**, and **reading balances and order state**.

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

where `signer` is the order owner, `nonce` is the `submitOrder` transaction's nonce, and `sequence` is the intent's position inside a `submitBatch` envelope (`0` for a standalone `submitOrder`). Wherever a call references an existing order — `cancel(canceledOrder, …)`, `update(updatedOrder, …)`, and the `getOrders(orderIds, …)` read — pass this `order_id`. You can compute it yourself with the formula above, or read it back from `ob_getOrders`, which returns it as `order_id` (the originating `submitOrder` tx hash is exposed separately as `tx_hash`).
{% endhint %}

{% hint style="warning" %}
**`deadline`** is the latest batch the intent is allowed to be included in — the intent can land in any batch up to and including the one whose end matches `deadline`. It must be aligned to the market's `auction_interval` (a multiple of it), or the validator rejects the intent with `"CLOB validation failed: Deadline is not aligned to auction interval"`. Compute it as:

```text
deadline = ceil((now + LAG) / auction_interval) * auction_interval
```

`LAG` is the headroom you add to `now` so the intent reaches enough validators before its target batch. It is capped at **10 minutes**; aim for **at least 1 minute** under normal conditions, smaller when you want to target a specific upcoming batch.

See [Batch Deadline](../../protocol/orderbook.md#batch-deadline) in the protocol reference for the full discussion of `deadline` semantics and the trade-offs around `LAG`.
{% endhint %}

### Batch envelope

`submitBatch` packs several single-intent calls (1–64) into a single signed transaction that lands atomically in one auction tick. Each entry in `inner` is the full ABI-encoded calldata of a single-intent function (`submitOrder`, `cancel`, `update`, `submitTrigger`, `deposit`, …) — encoded exactly as a standalone call, including its 4-byte selector. Every sub-intent **must carry the same `deadline`** (the uniform-deadline invariant), and nested batches are rejected. For the full rules and a worked example, see [Submit a batch order](../guides/submit-a-batch-order.md).

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

    // Whether a trigger is bound to the bidder's position on the pair.
    // None: standalone — removed only by a user cancel, TTL expiry, or its own fire.
    // Position: the venue cancels the armed trigger (and any resting synthetic order
    //           it already produced) at the end of the batch in which the bidder's
    //           position on the pair reaches size 0.
    enum TriggerGrouping { None, Position }

    // --- Events ---

    event SolutionExecuted(
        bytes32 indexed orderbookId,
        uint128 deadline,
        uint256 clearingPrice,
        uint256 totalVolume,
        uint256 newOrdersCount
    );

    // --- Order Management ---

    /**
     * Submits a new order to the orderbook.
     * The direction of the trade (Bid/Ask) is determined by the sign of the size.
     * @param orderbookId The unique identifier of the specific market (e.g., ETH-USDC).
     * @param size The size of the order. Positive (+) for Buy/Bid, Negative (-) for Sell/Ask.
     * @param price The limit price for the order.
     * @param orderType The order type (Limit or Market).
     * @param deadline The timestamp limit for this order to be included in a batch in microseconds. Must be a multiple of the market's `auction_interval`.
     * @param ttl The "Time To Live" duration in microseconds; how long the order remains active in the book.
     * @param reduceOnly If true, this order will only reduce an existing position. Perp markets only.
     * @param ioc If true, the order is Immediate-Or-Cancel: any unmatched portion is cancelled at the end of the batch instead of resting on the book.
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

    /**
     * @notice Retrieves the deposited balance of the caller for a specific token.
     * @param token The address of the ERC20 token to check.
     * @return The current balance of the token held by the caller within the exchange.
     * @deprecated Use balanceOf(address token, address account) instead.
     */
    function getBalance(address token) public view returns (int256) {}

    /**
     * @notice Batched retrieval of order details by their order ids.
     * @param orderbookId The identifier of the market.
     * @param orderIds An array of `order_id`s representing the orders to fetch.
     * @return An array of order structs containing:
     * - orderId: The unique order identifier (`keccak256(abi.encode(signer, nonce, sequence))`).
     * - side: The order side (Buy/Sell).
     * - status: The current status (e.g., Open, Filled, Canceled).
     * - remainingBase: The amount of base asset left to fill.
     * - price: The limit price.
     * - startTs: Timestamp when the order was included in the orderbook.
     * - endTs: Timestamp when the order expires.
     * - filledBase: Amount of base asset already filled.
     * - filledQuote: Amount of quote asset spent/received.
     */
    function getOrders(
        bytes32 orderbookId,
        bytes32[] calldata orderIds
    ) public view returns (
        (bytes32, Side, uint16, uint256, uint256, uint128, uint128, uint256, uint256)[] memory
    ) {}

    // --- Fund Management ---

    /**
     * @notice Deposits tokens into the exchange to be used for trading.
     * @param token The address of the token to deposit.
     * @param recipient The address that will be credited with the deposit.
     * @param amount The amount of tokens to deposit (in atomic units).
     * @param deadline The Unix timestamp after which the deposit is invalid in microseconds. Must be a multiple of the `auction_interval`.
     */
    function deposit(
        address token,
        address recipient,
        uint256 amount,
        uint128 deadline
    ) public {}

    /**
     * @notice Withdraws tokens from the exchange to an external wallet.
     * @param token The address of the ERC20 token to withdraw.
     * @param recipient The address receiving the withdrawn tokens.
     * @param amount The amount of tokens to withdraw.
     * @param deadline The Unix timestamp after which the withdrawal is invalid in microseconds. Must be a multiple of the `auction_interval`.
     */
    function withdraw(
        address token,
        address recipient,
        uint256 amount,
        uint128 deadline
    ) public {}

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
     * @param grouping Whether the trigger is bound to the bidder's position on the pair (see TriggerGrouping).
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
     *      `update`, `submitTrigger`, `cancelTrigger`, `updateTrigger`,
     *      `deposit`, or `withdraw`. The whole envelope is atomic: it lands in a
     *      single auction tick, so every sub-intent must carry the **same**
     *      `deadline`. Constraints (enforced at validation):
     *      - 1 to 64 sub-intents (the cap is configurable by the operator).
     *      - All sub-intents share one `deadline` (uniform-deadline invariant).
     *      - Nested batches are rejected — `inner[i]` may not itself be a `submitBatch`.
     * @param inner The ABI-encoded calldata of each sub-intent, in order.
     */
    function submitBatch(bytes[] calldata inner) public {}
}
```
