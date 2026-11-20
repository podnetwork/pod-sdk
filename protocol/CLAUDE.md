# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Solidity contracts for the Pod Network bridge protocol, deployable on any Ethereum-compatible chain. Uses Foundry as the development framework with EVM target Prague and IR-based compilation.

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

# Run the admin migration fork tests against the live Arbitrum bridge (skipped without ARBITRUM_RPC_URL)
ARBITRUM_RPC_URL=<arbitrum one rpc> forge test --mp test/BridgeAdminMigration.fork.sol

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
- **Roles**: `DEFAULT_ADMIN_ROLE` (token and call-contract whitelisting, token limits, migration, role changes; meant to sit behind a timelock), `FAST_ADMIN_ROLE` (validator config, `unpause` into Public or Private, `makePrivate`, `makePublic`, token transfer after migration), `PAUSER_ROLE` (`pause` only; no other role can pause), `RELAYER_ROLE`. `initialize` does not grant `FAST_ADMIN_ROLE`; the admin grants it.

**DepositWaitingList.sol** — Non-upgradeable buffer contract (AccessControl) that sits in front of the Bridge. Always accepts deposits regardless of Bridge rate limits, letting a relayer drain them into the Bridge via `batchDepositAndCall()` when capacity allows. Key concepts:
- **Deposits**: Permissionless `deposit(token, amount, to, permit)` with optional EIP-2612 permit support. Sequential `depositId` assigned to each deposit.
- **Apply**: `RELAYER_ROLE`-restricted `applyDeposits(token, depositIds)` validates all deposits match the specified token, marks them applied, and calls `batchDepositAndCall()` on the Bridge.
- **Withdraw**: Original depositor or `RELAYER_ROLE` can withdraw pending deposits via `withdraw(depositId)`, returning tokens to the original sender.
- **Roles**: `DEFAULT_ADMIN_ROLE`, `RELAYER_ROLE`. The WaitingList must also hold `RELAYER_ROLE` on the Bridge.
- **Approval caching**: Infinite approval to the Bridge, cached per token.

**WrappedToken.sol** — ERC20 with mint/pause/burn capabilities and role-based access (MINTER_ROLE, PAUSER_ROLE).

**ProofLib.sol** (`src/lib/`) — Library for signature recovery from aggregated validator signatures and merkle proof verification. Signatures must be ordered by strictly increasing recovered signer address.

### Transaction Hash Computation

Claims reconstruct the deposit tx hash: `keccak256(domainSeparator || bridgeContract || dataHash || auxTxSuffix)` where `dataHash = keccak256(selector || token || amount || to)` with left-padded 32-byte values. The `auxTxSuffix` parameter enables forward-compatible hash structure changes.

### External Dependencies

- OpenZeppelin Contracts & Contracts-Upgradeable and forge-std (git submodules under `lib/`)

### Test Structure

- **Bridge.t.sol**: Main unit test suite (~2300 lines) extending `BridgeClaimProofHelper`
- **Bridge.fork.sol**: Fork tests against mainnet USDC with real EIP-2612 permit flows
- **Bridge.benchmark.sol**: Gas benchmarks scaling across validator set sizes (4–100)
- **DepositWaitingList.t.sol**: Unit and fuzz tests for the DepositWaitingList contract
- **test/abstract/BridgeClaimProofHelper.sol**: Shared test base providing signature aggregation, claim proof generation, and domain separator computation
- **BridgeAdminMigration.t.sol**: Runs the admin migration scripts (`deploy/04`–`07`) on a local bridge with an EOA admin
- **BridgeAdminMigration.fork.sol**: Runs the same scripts against the live Arbitrum One bridge and tests the resulting roles, the timelock, and what each compromised key can reach
- **test/mocks/MockERC20Permit.sol**: Mock ERC20 with permit support

### Deployment

Scripts in `script/` use Foundry's Script framework. `DeployBridge.s.sol` loads validator addresses from `POD_COMMITTEE_KEYS` env var.

`deploy/` holds the numbered, run-once scripts for the Arbitrum One deployment. `01`–`03` deployed and set up the bridge and waiting list. `04`–`07` move the admin to a timelock. Each has the Arbitrum One addresses as constants and a `run()` that uses them (pass `--sig "run()"`, because `run` is overloaded); the `run(...)` with parameters is what the tests call:

- `04_TimelockDeploy.s.sol` deploys a 72-hour `TimelockController` (proposer multisig as the only proposer, separate executor wallets, no outside admin; the executor list is checked by hand). Anyone can run it. It is separate from `05` and does not import the Bridge, so that it can be built with its own compiler settings (see below).
- `05_BridgeImplementationDeploy.s.sol` deploys the new Bridge implementation with the default compiler settings. Anyone can run it.
- `06_FastAdminUpgrade.s.sol` grants `FAST_ADMIN_ROLE` to the fast admin multisig (a different multisig from the proposer) and `DEFAULT_ADMIN_ROLE` to the timelock, then upgrades the proxy. Reversible.
- `07_AdminHandover.s.sol` transfers the ProxyAdmin to the timelock and renounces the old admin's roles. Not reversible.

The Arbitrum One timelock was built with solc 0.8.26, no IR pipeline, 10000 optimizer runs and the cancun EVM version, not with the settings in `foundry.toml`. The settings were passed for that one run only, and everything except `04` was skipped because the Bridge does not compile without the IR pipeline. A plain `forge build` therefore does not reproduce the timelock's bytecode; this does:

```bash
FOUNDRY_SOLC=0.8.26 FOUNDRY_VIA_IR=false FOUNDRY_OPTIMIZER_RUNS=10000 FOUNDRY_EVM_VERSION=cancun \
FOUNDRY_OUT=out-timelock FOUNDRY_CACHE_PATH=cache-timelock \
forge script deploy/04_TimelockDeploy.s.sol:TimelockDeploy \
  --skip 'src/**' --skip 'test/**' --skip 'script/**' --skip 'deploy/0[1-35-7]*' \
  --sig "run()"
```

`06` and `07` are sent by the current admin (the ProxyAdmin owner). To get the calls for a multisig, run them without `--broadcast`: `06` logs each call with its parameters, and the dry-run output has the raw transactions. After `07`, `UpgradeBridge.s.sol` no longer works directly, because upgrades have to be scheduled on the timelock.

### Rust Bindings

The `bindings/` directory contains auto-generated Alloy-based Rust bindings for `IBridge` and `WrappedToken`. Regenerate with `make generate`; CI checks with `make check`.

## Key Remappings (foundry.toml)

```
@openzeppelin/contracts/ → lib/openzeppelin-contracts/contracts/
@openzeppelin/contracts-upgradeable/ → lib/openzeppelin-contracts-upgradeable/contracts/
pod-protocol/ → ./src/
```
