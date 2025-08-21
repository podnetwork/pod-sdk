// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title QuorumRestrictedAction
/// @notice Demonstrates gating function execution on quorum over a boolean predicate.
/// @dev Uses the `POD_REQUIRE_QUORUM` precompile to enforce quorum on pod.
contract QuorumRestrictedAction {

    address constant REQUIRE_QUORUM = address(uint160(uint256(keccak256("POD_REQUIRE_QUORUM"))));
    uint256 public etherThreshold = 1 ether;

    event ActionAllowed(address indexed account);

    /// @notice Reverts unless there is validator quorum over the predicate
    /// `account.balance >= etherThreshold`.
    /// @dev Calls the precompile via `staticcall` with the boolean predicate.
    /// @param account The account whose Ether balance is checked.
    modifier requireEnoughEther(address account) {
        (bool success,) = REQUIRE_QUORUM.staticcall(abi.encode(account.balance >= etherThreshold));
        require(success, "Not enough Ether balance");
        _;
    }

    /// @notice Example function restricted to callers whose Ether balance meets `etherThreshold`.
    /// @dev Emits an `ActionAllowed` event on success.
    function restrictedAction() public requireEnoughEther(msg.sender) {
        emit ActionAllowed(msg.sender);
    }
}