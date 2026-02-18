# Orderbook Spot

The CLOB Spot **Orderbook precompile** is the on-chain execution surface for spot markets.

Use it for **placing/canceling orders**, **depositing/withdrawing funds**, and **reading balances and order state**.

{% hint style="info" %}
**Orderbook precompile address:** `0x000000000000000000000000000000000000C10B`
{% endhint %}

{% hint style="warning" %}
**Microseconds, not milliseconds.** Most client libraries default to seconds or milliseconds.
{% endhint %}

### Solidity interface (ABI)

```solidity
/**
 * @title Orderbook
 * @notice A central limit order book for trading assets.
 * @dev Handles order placement, cancellation, and fund management.
 */
contract Orderbook {

    // --- Order Management ---

    /**
     * Submits a new order to the orderbook.
     * The direction of the trade (Bid/Ask) is determined by the sign of the volume.
     * @param orderbookId The unique identifier of the specific market (e.g., ETH-USDC).
     * @param volume The size of the order. Positive (+) for Buy/Bid, Negative (-) for Sell/Ask.
     * @param price The limit price for the order.
     * @param deadline The timestamp limit for this order to be included in a batch in microseconds.
     * @param ttl The "Time To Live" duration in microseconds; how long the order remains active in the book.
     * @param reduceOnly If true, this order will only reduce an existing position and not increase leverage.
     */
    function submitOrder(
        bytes32 orderbookId,
        int256 volume,
        uint256 price,
        uint128 deadline,
        uint128 ttl,
        bool reduceOnly
    ) public {}

    /**
     * @notice Cancels an existing open order.
     * @param orderbookId The unique identifier of the market the order belongs to.
     * @param canceledOrder The unique hash/identifier of the order to be cancelled.
     * @param deadline The Unix timestamp after which this cancellation request is invalid in microseconds.
     */
    function cancel(
        bytes32 orderbookId,
        bytes32 canceledOrder,
        uint128 deadline
    ) public {}

    // --- Data Retrieval ---

    /**
     * @notice Retrieves the deposited balance of a user for a specific token.
     * @param token The address of the ERC20 token to check.
     * @return The current balance of the token held by the caller within the exchange.
     */
    function getBalance(address token) public view returns (uint256) {}

    /**
     * @notice Batches retrieval of order details by their transaction hashes.
     * @param orderbookId The identifier of the market.
     * @param txHashes An array of transaction hashes representing the orders to fetch.
     * @return An array of order structs containing:
     * - hash: The unique order identifier.
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
        bytes32[] calldata txHashes
    ) public view returns (
        (bytes32, Side, uint16, uint256, uint256, uint128, uint128, uint256, uint256)[] memory
    ) {}

    // --- Fund Management ---

    /**
     * @notice Deposits tokens into the exchange to be used for trading.
     * @param token The address of the token to deposit.
     * @param recipient The address that will be credited with the deposit.
     * @param amount The amount of tokens to deposit (in atomic units).
     * @param deadline The Unix timestamp after which the deposit is invalid in microseconds.
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
     * @param deadline The Unix timestamp after which the withdrawal is invalid in microseconds.
     */
    function withdraw(
        address token,
        address recipient,
        uint256 amount,
        uint128 deadline
    ) public {}
}
```
