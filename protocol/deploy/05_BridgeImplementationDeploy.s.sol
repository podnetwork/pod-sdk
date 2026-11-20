// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {console, Script} from "forge-std/Script.sol";
import {Bridge} from "pod-protocol/Bridge.sol";

contract BridgeImplementationDeploy is Script {
    function run(Bridge bridge) public returns (Bridge implementation) {
        address podBridge = bridge.BRIDGE_CONTRACT();
        uint256 podChainId = bridge.CHAIN_ID();

        vm.startBroadcast();

        implementation = new Bridge(podBridge, podChainId);

        vm.stopBroadcast();

        console.log("Bridge implementation deployed at:", address(implementation));
    }
}
