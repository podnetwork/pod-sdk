# ADR-001: Deposit Waiting List Contract

## Status

Proposed

## Context

The Bridge contract enforces per-token daily deposit limits. When these limits are exhausted, subsequent deposits revert with `DailyLimitExhausted`. This creates a poor user experience: a user who wants to bridge tokens may be turned away entirely because the daily capacity is full.

In Private mode (the initial operating mode), the relayer batches deposits via `batchDepositAndCall()`. If the batch exceeds the daily limit, the entire transaction reverts, and the relayer must figure out which subset fits. In Public mode, individual users calling `deposit()` face the same rejection.

We never want to refuse a user's money. If someone wants to bridge tokens, we should accept the deposit immediately and queue it for bridging when capacity is available.

## Decision

Introduce a **DepositWaitingList** contract that sits in front of the Bridge as the recommended deposit entry point. It acts as a buffer that always accepts deposits and lets a relayer drain them into the Bridge as rate limits allow.

### Design

#### Deposit Flow (User-Facing)

```
User → DepositWaitingList.deposit(token, amount, to)
```

- Transfers `amount` of `token` from the user to the WaitingList contract.
- Records the deposit in an append-only list with a sequential `depositId`.
- Never reverts due to rate limits (only reverts on actual transfer failure).
- Emits a `Deposited(depositId, from, to, token, amount)` event.

EIP-2612 permit variant:

```
User → DepositWaitingList.deposit(token, amount, to, permit)
```

Same behavior but executes a permit before the transfer, mirroring the Bridge's permit pattern.

#### Apply Flow (Relayer-Facing)

```
Relayer → DepositWaitingList.applyDeposits(address token, uint256[] depositIds)
```

- The relayer specifies a token and an arbitrary list of deposit IDs to apply (e.g., `token, [4, 7, 8]`).
- All deposit IDs must be for the specified token; the contract validates each deposit's token matches and reverts on mismatch.
- Order of IDs does not matter; the relayer chooses which deposits to apply and in what order.
- For each deposit ID:
  - Verifies the deposit exists and has not already been applied.
  - Verifies the deposit's token matches the specified token.
  - Marks it as applied.
- After processing all deposits, approves the Bridge to spend the token (infinite approval, cached per token) and calls `batchDepositAndCall()` on the Bridge with all deposits in a single batch.
- Emits a `WaitingDepositApplied(depositId)` event for each applied deposit.
- If any individual deposit fails (e.g., Bridge limit hit mid-batch), the entire transaction reverts. The relayer is responsible for selecting a set of deposits that fits within available Bridge capacity.

The WaitingList contract must hold `RELAYER_ROLE` on the Bridge. The contract calls `batchDepositAndCall()` which works in both Private and Public mode (via `whenOperational`).

#### Accounting

The contract maintains:

1. **Deposit list** — an append-only array (or mapping by `depositId`) storing each deposit's `token`, `amount`, `from`, `to`, and `applied` flag.
2. **Applied flag** — a boolean per deposit that prevents double-application. Once set, the deposit cannot be applied again.
3. **Sequential deposit counter** — monotonically increasing `nextDepositId`, assigned at deposit time.

```solidity
struct WaitingDeposit {
    address token;
    uint256 amount;
    address from;
    address to;
    bool applied;
}

mapping(uint256 => WaitingDeposit) public deposits;
uint256 public nextDepositId;
```

#### Cancellation (Optional, for consideration)

Users may want to cancel a pending (not yet applied) deposit and reclaim their tokens. If supported:

```
User → DepositWaitingList.cancel(uint256 depositId)
```

- Only the original depositor (`from`) can cancel.
- Only works if the deposit has not been applied yet.
- Returns tokens to the depositor.
- Marks the deposit as cancelled (distinct from applied) to prevent future application.

This is optional and can be deferred to a future version.

#### Access Control

- **Deposit**: Permissionless. Anyone can deposit.
- **Apply**: Restricted to `RELAYER_ROLE`. Only the relayer decides when and which deposits get applied to the Bridge.
- **Admin**: Standard admin role for configuration (setting the Bridge address, granting relayer role).

### Contract Interface

```solidity
interface IDepositWaitingList {
    /// @notice Deposit tokens into the waiting list.
    /// @param token The token to deposit.
    /// @param amount The amount to deposit.
    /// @param to The recipient on the destination chain.
    /// @param permit Optional EIP-2612 permit data (empty bytes if none).
    /// @return depositId The sequential ID assigned to this deposit.
    function deposit(address token, uint256 amount, address to, bytes calldata permit)
        external
        returns (uint256 depositId);

    /// @notice Apply a list of pending deposits to the Bridge.
    /// @param token The token all deposits must match.
    /// @param depositIds The IDs of deposits to apply, in any order.
    function applyDeposits(address token, uint256[] calldata depositIds) external;

    /// @notice Check whether a deposit has been applied.
    /// @param depositId The deposit ID to check.
    /// @return True if the deposit has been applied.
    function isApplied(uint256 depositId) external view returns (bool);
}
```

### Interaction Diagram

```
                    deposit()                      applyDeposits([4,7,8])
   User ──────────────────► WaitingList ◄──────────────────── Relayer
                                │
                                │  (for each deposit ID)
                                │
                                ▼
                    deposit() / batchDepositAndCall()
                            Bridge
```

### Properties

1. **Never rejects deposits.** The WaitingList always accepts tokens as long as the ERC20 transfer succeeds. Rate limits are the Bridge's concern, not the user's.
2. **Correct accounting.** Every deposit is recorded with a unique sequential ID. The `applied` flag ensures no deposit is applied twice.
3. **Relayer flexibility.** The relayer picks which deposits to apply and in what order, optimizing for available Bridge capacity and gas efficiency.
4. **No ordering constraint.** Deposits do not need to be applied in FIFO order. The relayer can prioritize larger deposits, specific tokens, or whatever strategy is appropriate.

## Consequences

### Positive

- Users can always deposit regardless of current Bridge rate limits.
- Clean separation of concerns: the WaitingList handles queuing, the Bridge handles bridging and security.
- The relayer has full flexibility to optimize deposit application order and batching.
- Simple contract with minimal state — low audit surface.

### Negative

- Users' tokens are held in the WaitingList contract until applied, adding a custody step.
- Introduces an additional contract in the deposit path, increasing gas costs slightly.
- Relayer must monitor both the WaitingList queue and Bridge capacity to apply deposits efficiently.
- Without cancellation support, user funds could be stuck if the relayer is slow or unresponsive.

### Risks

- **WaitingList contract security**: Holds user funds, so it becomes a target. Must be audited.
- **Relayer liveness**: If the relayer stops applying deposits, funds sit idle. Cancellation support mitigates this.
- **Token approval management**: The WaitingList must manage approvals to the Bridge. Using infinite approvals per token simplifies this but requires trust in the Bridge contract.
