# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Solidity contracts for the Pod Network bridge protocol, deployable on any Ethereum-compatible chain. Uses Foundry as the development framework with Solidity 0.8.28, EVM target Prague, and IR-based compilation.

### How the Bridge Works

Users deposit tokens into the bridge on the source chain. To withdraw (claim) on the destination chain, they must prove that a withdrawal transaction occurred on Pod. This proof is verified natively on-chain by checking that a quorum of Pod validators attested to the withdrawal — no external oracle or off-chain relay is trusted.

When the validator set changes, the bridge undergoes a version upgrade. This invalidates all previous validator signatures by recomputing the signature domain separator. To preserve pending claims from before the upgrade, a merkle tree root is submitted containing all transactions from previous versions. Older claims then use a merkle inclusion proof instead of a validator signature quorum.

The bridge initially operates in **Private mode**, where only a permissioned relayer performs deposits on behalf of users. It can later transition to **Public mode** for permissionless deposits.

## Build & Test Commands

```bash
# Build
forge build

# Run all tests
forge test

# Run a single test by name
forge test --mt test_functionName

# Run a specific test file
forge test --mc BridgeTest

# Run fork tests (requires ETH_RPC_URL)
forge test --mc BridgeForkTest --fork-url $ETH_RPC_URL

# Run benchmarks
forge test --mc BridgeBenchmark --gas-report

# Format code
forge fmt

# Lint
forge lint

# Check Rust bindings are up to date
make check

# Regenerate Rust bindings (for IBridge and WrappedToken)
make generate
```

## Architecture

### Core Contracts

**Bridge.sol** — Upgradeable cross-chain token bridge (TransparentUpgradeableProxy + AccessControlUpgradeable). Key concepts:
- **Deposits**: Three types — simple `deposit()`, `depositAndCall()` (with contract call on destination), and `batchDepositAndCall()` (relayer-only bulk operation). Each deposit gets a sequential `depositIndex`.
- **Claims**: Two proof types, determined by the first byte of the proof parameter:
  - **Certificate (0x00)**: Aggregated validator signatures verified against current `domainSeparator`. Requires weight ≥ `validatorCount - adversarialResilience`.
  - **Merkle (0x01)**: Merkle inclusion proof for claims from previous versions, verified against a stored `merkleRoot`.
- **Contract states**: `Public`, `Private`, `Paused`, `Migrated`.
- **Daily limits**: Per-token deposit and claim limits with boundary-aware reset logic (handles transactions spanning period boundaries without losing capacity).
- **Migration**: Three-phase process (Pause → Migrate → TransferTokens) for moving to a new contract.
- **Roles**: `DEFAULT_ADMIN_ROLE`, `PAUSER_ROLE`, `RELAYER_ROLE`.

**WrappedToken.sol** — ERC20 with mint/pause/burn capabilities and role-based access (MINTER_ROLE, PAUSER_ROLE).

**ProofLib.sol** (`src/lib/`) — Library for signature recovery from aggregated validator signatures and merkle proof verification. Signatures must be ordered by strictly increasing recovered signer address.

### Transaction Hash Computation

Claims reconstruct the deposit tx hash: `keccak256(domainSeparator || bridgeContract || dataHash || auxTxSuffix)` where `dataHash = keccak256(selector || token || amount || to)` with left-padded 32-byte values. The `auxTxSuffix` parameter enables forward-compatible hash structure changes.

### External Dependencies

- OpenZeppelin Contracts & Contracts-Upgradeable (via `lib/`)
- `pod-sdk/` remaps to `../solidity-sdk/src/` — a sibling directory providing shared SDK utilities

### Test Structure

- **Bridge.t.sol**: Main unit test suite (~2300 lines) extending `BridgeClaimProofHelper`
- **Bridge.fork.sol**: Fork tests against mainnet USDC with real EIP-2612 permit flows
- **Bridge.benchmark.sol**: Gas benchmarks scaling across validator set sizes (4–100)
- **test/abstract/BridgeClaimProofHelper.sol**: Shared test base providing signature aggregation, claim proof generation, and domain separator computation
- **test/mocks/MockERC20Permit.sol**: Mock ERC20 with permit support

### Deployment

Scripts in `script/` use Foundry's Script framework. `DeployBridge.s.sol` loads validator addresses from `POD_COMMITTEE_KEYS` env var.

### Rust Bindings

The `bindings/` directory contains auto-generated Alloy-based Rust bindings for `IBridge` and `WrappedToken`. Regenerate with `make generate`; CI checks with `make check`.

## Key Remappings (foundry.toml)

```
@openzeppelin/contracts/ → lib/openzeppelin-contracts/contracts/
@openzeppelin/contracts-upgradeable/ → lib/openzeppelin-contracts-upgradeable/contracts/
pod-sdk/ → ../solidity-sdk/src/
pod-protocol/ → ./src/
```
