// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {console, Script} from "forge-std/Script.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

// Does not import the Bridge, so it can be built with other compiler settings than the rest of
// the project. The Arbitrum One timelock was (see CLAUDE.md for the command).
contract TimelockDeploy is Script {
    // Arbitrum One
    address constant PROPOSER = 0x34B16959F6BccEe214B370dE66674A0563F36107;
    address constant EXECUTOR_1 = 0xA7Bf378E578477a887dd5C84fa34a98636571355;
    address constant EXECUTOR_2 = 0xe2168ae8eC1CB0F275378212C3067C214F511F8b;
    address constant EXECUTOR_3 = 0x0E8504006CA3e6955603ec5F92B239f5c9f532d9;

    function run() public returns (TimelockController timelock) {
        address[] memory executors = new address[](3);
        executors[0] = EXECUTOR_1;
        executors[1] = EXECUTOR_2;
        executors[2] = EXECUTOR_3;
        return run(PROPOSER, executors);
    }

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
