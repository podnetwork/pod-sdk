// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {console, Script} from "forge-std/Script.sol";
import {Bridge} from "pod-protocol/Bridge.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

contract TimelockDeploy is Script {
    // Check manually:
    // - at least two executors
    // - no executor is address(0), the admin multisig, or one of its signers
    function run(Bridge bridge, address adminSafe, address[] memory executors)
        public
        returns (TimelockController timelock, Bridge implementation)
    {
        address[] memory proposers = new address[](1);
        proposers[0] = adminSafe;

        address podBridge = bridge.BRIDGE_CONTRACT();
        uint256 podChainId = bridge.CHAIN_ID();

        vm.startBroadcast();

        // No external admin: the timelock administers its own roles
        timelock = new TimelockController(72 hours, proposers, executors, address(0));
        implementation = new Bridge(podBridge, podChainId);

        vm.stopBroadcast();

        console.log("TimelockController deployed at:", address(timelock));
        console.log("Bridge implementation deployed at:", address(implementation));
    }
}
