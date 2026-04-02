# Recovery

The recovery precompile allows users to recover a locked account by finalizing the target transaction chain. Accounts can become locked when conflicting transactions are submitted at the same nonce.

For background on why accounts get locked and how the recovery protocol works, see [Local Ordering](https://docs.v2.pod.network/documentation/network-architecture/local-ordering#account-locking-and-recovery). For a step-by-step guide, see [Recover a locked account](../guides/recover-locked-account.md).

**Precompile address:** `0x50d0000000000000000000000000000000000003`

## Interface

```solidity
interface IRecovery {
    /// @notice Recover a locked account by finalizing the target transaction chain.
    /// @param txHash The hash of the target transaction to recover to (obtained via pod_getRecoveryTargetTx).
    /// @param nonce The nonce of the target transaction (obtained via pod_getRecoveryTargetTx).
    function recover(bytes32 txHash, uint64 nonce) external;
}
```

## Usage

1. Call `pod_getRecoveryTargetTx(account)` on the full node to get the target transaction hash and nonce.
2. Send a transaction to the recovery precompile calling `recover(txHash, nonce)` with the values from step 1.

The protocol will finalize the target transaction chain, recover your account state, and increment the nonce. You can then send a new transaction with the next nonce.
