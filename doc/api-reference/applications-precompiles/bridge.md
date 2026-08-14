# Bridge

The bridge precompile allows users to initiate withdrawals from Pod to other chains. Tokens withdrawn via the bridge precompile are burned on Pod and can be claimed on the destination chain's bridge contract using a validator proof.

For how the bridge works end-to-end, see [Native Bridge](https://docs.v2.pod.network/documentation/native-bridge). For step-by-step guides, see [Bridge to Pod](../guides/bridge-to-pod.md) and [Bridge from Pod](../guides/bridge-from-pod.md).

{% hint style="info" %}
**This precompile withdraws a Pod account balance.** A **trading balance exits through the orderbook precompile**: its `withdraw` burns the balance on Pod and makes it claimable on the bridge chain in one transaction, with no `chainId` to pass, its amount in Pod's 18 decimals, and its claim proof keyed by `withdrawal_id` rather than by transaction hash. See [Withdrawals leave Pod](orderbook.md#withdrawals-leave-pod). The interface below is the older of the two paths and goes away with Pod account balances.
{% endhint %}

**Precompile address:** `0x50d0000000000000000000000000000000000001`

## Interface

```solidity
interface IPodBridge {
    /// @notice Emitted when tokens are withdrawn for bridging to another chain.
    event Withdraw(
        bytes32 indexed id,
        address indexed from,
        address indexed to,
        address token,
        uint256 amount,
        uint256 chainId
    );

    /// @notice Initiate a withdrawal to another chain. Burns tokens on Pod and emits
    ///         a Withdraw event. Use the transaction hash to obtain a claim proof
    ///         via pod_getBridgeClaimProof.
    /// @param token Token address on Pod. Use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for native token.
    /// @param amount Amount of tokens to bridge.
    /// @param to Recipient address on the target chain.
    /// @param chainId Target chain ID where the claim will happen. Prevents replay across chains.
    /// @return id Unique withdraw identifier.
    function withdraw(
        address token,
        uint256 amount,
        address to,
        uint256 chainId
    ) external returns (bytes32 id);
}
```

## Decimal Scaling

All tokens on Pod are represented with 18 decimals, regardless of their decimals on the target chain (e.g. USDC has 6 decimals on Ethereum but 18 on Pod).

When calling `withdraw` to bridge from Pod to another chain, the `amount` must be specified in the **target chain token's units**, not in Pod's 18-decimal representation. For example, to bridge 1 USDC to Ethereum, pass `1000000` (1e6), not `1000000000000000000` (1e18).

## Native Token Withdrawals

When withdrawing the **native token**, the coin travels with the transaction: set `tx.value` to the `amount` **scaled up to Pod's 18 decimals**. Bridging 1 USDC uses `amount = 1000000` (1e6) and `tx.value = 1000000000000000000` (1e18). A native withdraw is rejected unless the two match.

**ERC20 withdrawals send no value** — set `tx.value` to `0`, and the balance is deducted internally.
