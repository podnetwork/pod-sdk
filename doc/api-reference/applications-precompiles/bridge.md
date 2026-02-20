# Bridge

The bridge precompile allows users to initiate withdrawals from Pod to Ethereum. Tokens deposited to the bridge precompile are burned on Pod and can be claimed on the Ethereum bridge contract using a validator proof.

For how the bridge works end-to-end, see [Native Bridge](https://docs.v2.pod.network/documentation/native-bridge). For step-by-step guides, see [Bridge to Pod](../guides/bridge-to-pod.md) and [Bridge from Pod](../guides/bridge-from-pod.md).

**Precompile address:** `0x0000000000000000000000000000000000B41D9E`

## Interface

```solidity
interface IPodBridge {
    /// @notice Emitted when tokens are deposited for bridging to Ethereum.
    event Deposit(
        bytes32 indexed id,
        address indexed from,
        address indexed to,
        address token,
        uint256 amount
    );

    /// @notice Initiate a withdrawal to Ethereum. Burns tokens on Pod and emits
    ///         a Deposit event. Use the transaction hash to obtain a claim proof
    ///         via pod_getBridgeClaimProof.
    /// @param token Token address on Pod. Use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for native token.
    /// @param amount Amount of tokens to bridge.
    /// @param to Ethereum recipient address.
    /// @return id Unique deposit identifier.
    function deposit(
        address token,
        uint256 amount,
        address to
    ) external returns (bytes32 id);
}
```

## Decimal Scaling

All tokens on Pod are represented with 18 decimals, regardless of their decimals on Ethereum (e.g. USDC has 6 decimals on Ethereum but 18 on Pod).

When calling `deposit` to bridge from Pod to Ethereum, the `amount` must be specified in the **Ethereum token's units**, not in Pod's 18-decimal representation. For example, to bridge 1 USDC, pass `1000000` (1e6), not `1000000000000000000` (1e18).

## Native Token Deposits

When depositing the native token (ETH), **`tx.value` must be `0`**. The bridge deducts the balance internally — do not send value with the transaction.
