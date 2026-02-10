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

- Transfers `amount` of `token` from the user to the WaitingList contract via `safeTransferFrom`.
- If `permit` is non-empty (97 bytes: `deadline(32) + v(1) + r(32) + s(32)`), executes an EIP-2612 permit before the transfer, mirroring the Bridge's permit pattern. If empty, the user must have pre-approved the WaitingList.
- Records the deposit in a mapping with a sequential `depositId`.
- Never reverts due to rate limits (only reverts on actual transfer failure, zero address, or zero amount).
- Emits `WaitingDepositCreated(depositId, from, to, token, amount)`.

#### Apply Flow (Relayer-Facing)

```
Relayer → DepositWaitingList.applyDeposits(token, depositIds)
```

- The relayer specifies a token and an arbitrary list of deposit IDs to apply (e.g., `token, [4, 7, 8]`).
- All deposit IDs must be for the specified token; the contract validates each deposit's token matches and reverts with `TokenMismatch` on mismatch.
- Order of IDs does not matter; the relayer chooses which deposits to apply and in what order.
- For each deposit ID:
  - Verifies the deposit exists (`DepositDoesNotExist`) and has not already been applied or withdrawn (`DepositAlreadyApplied`).
  - Verifies the deposit's token matches the specified token.
  - Marks it as applied.
- After processing all deposits, ensures the Bridge has an infinite approval for the token (cached per token), then calls `batchDepositAndCall()` on the Bridge with all deposits in a single batch. Each `DepositParams.from` is set to the WaitingList contract address.
- Emits `WaitingDepositApplied(depositId)` for each applied deposit.
- If the Bridge reverts (e.g., daily limit hit), the entire transaction reverts. The relayer is responsible for selecting a set of deposits that fits within available Bridge capacity.

The WaitingList contract must hold `RELAYER_ROLE` on the Bridge. The contract calls `batchDepositAndCall()` which works in both Private and Public mode (via `whenOperational`).

#### Withdrawal

Users or the relayer can withdraw a pending deposit, returning the tokens to the original sender:

```
User/Relayer → DepositWaitingList.withdraw(depositId)
```

- Only the original depositor (`from`) or an account with `RELAYER_ROLE` can withdraw.
- Only works if the deposit has not already been applied or withdrawn.
- Returns tokens to the original depositor (`from`), regardless of who calls withdraw.
- Sets the `applied` flag to prevent future application.
- Emits `WaitingDepositWithdrawn(depositId)`.

This ensures user funds are never stuck if the relayer is slow or unresponsive.

#### Accounting

The contract maintains:

1. **Deposit mapping** — `mapping(uint256 => WaitingDeposit)` storing each deposit's `token`, `amount`, `from`, `to`, and `applied` flag.
2. **Applied flag** — a boolean per deposit that prevents double-application or double-withdrawal. Once set, the deposit cannot be applied or withdrawn again.
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
    function applyDeposits(address token, uint256[] calldata depositIds) external;

    /// @notice Withdraw a pending deposit, returning tokens to the original sender.
    /// @param depositId The deposit ID to withdraw.
    function withdraw(uint256 depositId) external;

    /// @notice Update the call contract used for batchDepositAndCall().
    /// @param callContract The new call contract address.
    function setCallContract(address callContract) external;
}
```

### Interaction Diagram

```
                deposit()                          applyDeposits(token, [4,7,8])
   User ──────────────────► WaitingList ◄──────────────────── Relayer
        ◄─────────────────      │
          withdraw(id)          │
                                ▼
                        batchDepositAndCall()
                              Bridge
```

### Properties

1. **Never rejects deposits.** The WaitingList always accepts tokens as long as the ERC20 transfer succeeds. Rate limits are the Bridge's concern, not the user's.
2. **Correct accounting.** Every deposit is recorded with a unique sequential ID. The `applied` flag ensures no deposit is applied or withdrawn twice.
3. **Relayer flexibility.** The relayer picks which deposits to apply and in what order, optimizing for available Bridge capacity and gas efficiency.
4. **No ordering constraint.** Deposits do not need to be applied in FIFO order. The relayer can prioritize larger deposits, specific tokens, or whatever strategy is appropriate.
5. **User safety.** Users can always withdraw pending deposits to reclaim their tokens.

## Consequences

### Positive

- Users can always deposit regardless of current Bridge rate limits.
- Clean separation of concerns: the WaitingList handles queuing, the Bridge handles bridging and security.
- The relayer has full flexibility to optimize deposit application order and batching.
- Simple contract with minimal state — low audit surface.
- Users can withdraw pending deposits, so funds are never permanently stuck.

### Negative

- Users' tokens are held in the WaitingList contract until applied or withdrawn, adding a custody step.
- Introduces an additional contract in the deposit path, increasing gas costs slightly.
- Relayer must monitor both the WaitingList queue and Bridge capacity to apply deposits efficiently.

### Risks

- **WaitingList contract security**: Holds user funds, so it becomes a target. Must be audited.
- **Relayer liveness**: If the relayer stops applying deposits, funds sit idle. Withdrawal support mitigates this.
- **Token approval management**: The WaitingList must manage approvals to the Bridge. Using infinite approvals per token simplifies this but requires trust in the Bridge contract.
