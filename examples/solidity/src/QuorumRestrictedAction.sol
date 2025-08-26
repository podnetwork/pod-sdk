// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {requireQuorum} from "pod-sdk/Quorum.sol";

/// @title QuorumRestrictedAction
/// @notice Demonstrates gating function execution on quorum over a boolean predicate.
contract QuorumRestrictedAction {
    uint256 public etherThreshold = 1 ether;

    event ActionAllowed(address indexed account);

    /// @notice Reverts unless there is validator quorum over the predicate
    /// `account.balance >= etherThreshold`.
    /// @param account The account whose Ether balance is checked.
    modifier requireEnoughEther(address account) {
        requireQuorum(account.balance >= etherThreshold, "Not enough Ether balance");
        _;
    }

    /// @notice Example function restricted to callers whose Ether balance meets `etherThreshold`.
    /// @dev Emits an `ActionAllowed` event on success.
    function restrictedAction() public requireEnoughEther(msg.sender) {
        emit ActionAllowed(msg.sender);
    }
}
