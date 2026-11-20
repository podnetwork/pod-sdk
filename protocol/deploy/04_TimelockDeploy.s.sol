// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {console, Script} from "forge-std/Script.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

// Does not import the Bridge, so it can be built with other compiler settings than the rest of
// the project. The Arbitrum One timelock was (see CLAUDE.md for the command).
contract TimelockDeploy is Script {
    // Check manually:
    // - at least two executors
    // - no executor is address(0), a multisig, or one of their signers
    // - the proposer multisig is not the fast admin multisig
    function run(address proposer, address[] memory executors) public returns (TimelockController timelock) {
        address[] memory proposers = new address[](1);
        proposers[0] = proposer;

        vm.startBroadcast();

        // No external admin: the timelock administers its own roles
        timelock = new TimelockController(72 hours, proposers, executors, address(0));

        vm.stopBroadcast();

        console.log("TimelockController deployed at:", address(timelock));
    }
}
