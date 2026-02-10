# ADR-001: Deposit Waiting List Contract

## Status

Accepted

## Context

The Bridge contract enforces per-token daily deposit limits. When these limits are exhausted, subsequent deposits revert with `DailyLimitExhausted`. This creates a poor user experience: a user who wants to bridge tokens may be turned away entirely because the daily capacity is full.

In Private mode (the initial operating mode), the relayer batches deposits via `batchDepositAndCall()`. If the batch exceeds the daily limit, the entire transaction reverts, and the relayer must figure out which subset fits. In Public mode, individual users calling `deposit()` face the same rejection.

We never want to refuse a user's money. If someone wants to bridge tokens, we should accept the deposit immediately and queue it for bridging when capacity is available.

## Decision

Introduce a **DepositWaitingList** contract that sits in front of the Bridge as the recommended deposit entry point. It acts as a buffer that always accepts deposits and lets a relayer drain them into the Bridge as rate limits allow.

### Design

#### Deposit Flow (User-Facing)

```
User → DepositWaitingList.deposit(token, amount, to, permit)
```

- Rejects deposits that exceed the Bridge's total daily deposit limit for the token (`AmountExceedsDepositLimit`). A single deposit larger than the limit can never be applied, so rejecting early avoids locking user funds indefinitely. The limit is read from `bridge.tokenData(token).depositLimit`.
- Transfers `amount` of `token` from the user to the WaitingList contract via `safeTransferFrom`.
- If `permit` is non-empty (97 bytes: `deadline(32) + v(1) + r(32) + s(32)`), executes an EIP-2612 permit before the transfer, mirroring the Bridge's permit pattern. If empty, the user must have pre-approved the WaitingList.
- Stores a hash of the deposit data (`keccak256(abi.encode(token, amount, msg.sender, to))`) in a mapping keyed by a sequential `depositId`. Only the hash is stored — the full deposit data is emitted in the `WaitingDepositCreated` event.
- Never reverts due to current rate limit utilization (only reverts on transfer failure, zero address, zero amount, or amount exceeding the total deposit limit).
- Emits `WaitingDepositCreated(depositId, from, to, token, amount)`.

#### Apply Flow (Relayer-Facing)

```
Relayer → DepositWaitingList.applyDeposits(token, depositIds, amounts, froms, tos)
```

- The relayer specifies a token, an arbitrary list of deposit IDs, and the corresponding deposit data (amounts, froms, tos) to apply.
- Array lengths must all match; reverts with `ArrayLengthMismatch` otherwise.
- Order of IDs does not matter; the relayer chooses which deposits to apply and in what order.
- For each deposit ID:
  - Verifies the deposit exists (`DepositDoesNotExist`) and has not already been applied or withdrawn (`DepositAlreadyApplied`).
  - Verifies the supplied data matches the stored hash (`InvalidDepositData`). This implicitly validates token matching.
  - Deletes the hash (clears storage slot for gas refund).
- After processing all deposits, ensures the Bridge has an infinite approval for the token (cached per token), then calls `batchDepositAndCall()` on the Bridge with all deposits in a single batch. Each `DepositParams.from` is set to the WaitingList contract address.
- Emits `WaitingDepositApplied(depositId)` for each applied deposit.
- If the Bridge reverts (e.g., daily limit hit), the entire transaction reverts. The relayer is responsible for selecting a set of deposits that fits within available Bridge capacity.

The WaitingList contract must hold `RELAYER_ROLE` on the Bridge. The contract calls `batchDepositAndCall()` which works in both Private and Public mode (via `whenOperational`).

#### Withdrawal

Users or the relayer can withdraw a pending deposit, returning the tokens to the original sender:

```
User/Relayer → DepositWaitingList.withdraw(depositId, token, amount, from, to)
```

- The caller must supply the original deposit data; the contract verifies it matches the stored hash (`InvalidDepositData`).
- Only the original depositor (`from`) or an account with `RELAYER_ROLE` can withdraw (`NotAuthorized`).
- Only works if the deposit has not already been applied or withdrawn (`DepositAlreadyApplied`).
- Returns tokens to the original depositor (`from`), regardless of who calls withdraw.
- Deletes the hash (clears storage slot for gas refund).
- Emits `WaitingDepositWithdrawn(depositId)`.

This ensures user funds are never stuck if the relayer is slow or unresponsive.

#### Accounting

The contract maintains:

1. **Deposit hash mapping** — `mapping(uint256 => bytes32)` storing a keccak256 hash of each deposit's `token`, `amount`, `from`, and `to`. Only 1 storage slot per deposit.
2. **Hash-based state tracking** — A non-zero hash means the deposit is pending. A zero hash with `id < nextDepositId` means the deposit was consumed (applied or withdrawn). A zero hash with `id >= nextDepositId` means the deposit never existed.
3. **Sequential deposit counter** — monotonically increasing `nextDepositId`, assigned at deposit time.

```solidity
mapping(uint256 => bytes32) public depositHashes;
uint256 public nextDepositId;
```

The hash is computed as `keccak256(abi.encode(token, amount, from, to))`. Full deposit data is emitted in the `WaitingDepositCreated` event for off-chain reconstruction.

This design uses 1 storage slot per deposit instead of 4 (the previous struct-based approach), reducing deposit gas cost by ~75%.

#### Access Control

- **Deposit**: Permissionless. Anyone can deposit.
- **Apply**: Restricted to `RELAYER_ROLE`. Only the relayer decides when and which deposits get applied to the Bridge.
- **Withdraw**: Original depositor or `RELAYER_ROLE`.
- **Admin**: `DEFAULT_ADMIN_ROLE` for configuration (setting `callContract`, granting roles).

### Contract Interface

```solidity
interface IDepositWaitingList {
    /// @notice Deposit tokens into the waiting list.
    /// @param token The token to deposit.
    /// @param amount The amount to deposit.
    /// @param to The recipient on the destination chain.
    /// @param permit Tightly packed EIP-2612 permit data (97 bytes) or empty for no permit.
    /// @return depositId The sequential ID assigned to this deposit.
    function deposit(address token, uint256 amount, address to, bytes calldata permit)
        external
        returns (uint256 depositId);

    /// @notice Apply a list of pending deposits to the Bridge via batchDepositAndCall().
    /// @param token The token all deposits must match.
    /// @param depositIds The IDs of deposits to apply, in any order.
    /// @param amounts The deposit amounts, corresponding to depositIds.
    /// @param froms The original depositors, corresponding to depositIds.
    /// @param tos The recipients, corresponding to depositIds.
    function applyDeposits(
        address token,
        uint256[] calldata depositIds,
        uint256[] calldata amounts,
        address[] calldata froms,
        address[] calldata tos
    ) external;

    /// @notice Withdraw a pending deposit, returning tokens to the original sender.
    /// @param depositId The deposit ID to withdraw.
    /// @param token The token of the deposit.
    /// @param amount The amount of the deposit.
    /// @param from The original depositor.
    /// @param to The recipient that was specified at deposit time.
    function withdraw(uint256 depositId, address token, uint256 amount, address from, address to) external;

    /// @notice Update the call contract used for batchDepositAndCall().
    /// @param callContract The new call contract address.
    function setCallContract(address callContract) external;
}
```

### Interaction Diagram

```
                deposit()                          applyDeposits(token, ids, amounts, froms, tos)
   User ──────────────────► WaitingList ◄──────────────────── Relayer
        ◄─────────────────      │
     withdraw(id, data...)      │
                                ▼
                        batchDepositAndCall()
                              Bridge
```

### Properties

1. **Never rejects deposits.** The WaitingList always accepts tokens as long as the ERC20 transfer succeeds. Rate limits are the Bridge's concern, not the user's.
2. **Correct accounting.** Every deposit is recorded with a unique sequential ID. The hash is deleted on apply or withdraw, ensuring no deposit is consumed twice.
3. **Relayer flexibility.** The relayer picks which deposits to apply and in what order, optimizing for available Bridge capacity and gas efficiency.
4. **No ordering constraint.** Deposits do not need to be applied in FIFO order. The relayer can prioritize larger deposits, specific tokens, or whatever strategy is appropriate.
5. **User safety.** Users can always withdraw pending deposits to reclaim their tokens.
6. **Gas efficiency.** Storing only a hash (1 slot) instead of a full struct (4 slots) reduces deposit gas by ~75%. Deleting the hash on consume yields storage refunds.

## Consequences

### Positive

- Users can always deposit regardless of current Bridge rate limits.
- Clean separation of concerns: the WaitingList handles queuing, the Bridge handles bridging and security.
- The relayer has full flexibility to optimize deposit application order and batching.
- Simple contract with minimal state — low audit surface.
- Users can withdraw pending deposits, so funds are never permanently stuck.
- Hash-only storage minimizes gas costs for depositors (1 storage slot vs 4).

### Negative

- Users' tokens are held in the WaitingList contract until applied or withdrawn, adding a custody step.
- Callers of `applyDeposits` and `withdraw` must supply the original deposit data (reconstructed from events), increasing calldata size.
- Relayer must monitor both the WaitingList queue and Bridge capacity to apply deposits efficiently.

### Risks

- **WaitingList contract security**: Holds user funds, so it becomes a target. Must be audited.
- **Relayer liveness**: If the relayer stops applying deposits, funds sit idle. Withdrawal support mitigates this.
- **Token approval management**: The WaitingList must manage approvals to the Bridge. Using infinite approvals per token simplifies this but requires trust in the Bridge contract.
- **Event dependency**: Off-chain systems must index `WaitingDepositCreated` events to reconstruct deposit data for apply/withdraw calls. If event data is lost, the deposit hash can still be verified by brute-forcing the preimage (all fields are known from the transaction).
