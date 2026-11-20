// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {console, Script} from "forge-std/Script.sol";
import {Bridge} from "pod-protocol/Bridge.sol";

contract BridgeImplementationDeploy is Script {
    // Arbitrum One
    Bridge constant BRIDGE = Bridge(0xB77E6fB078918f255FC71E8b11A798124b7f0Fa0);

    function run() public returns (Bridge implementation) {
        return run(BRIDGE);
    }

    function run(Bridge bridge) public returns (Bridge implementation) {
        address podBridge = bridge.BRIDGE_CONTRACT();
        uint256 podChainId = bridge.CHAIN_ID();

        vm.startBroadcast();

        implementation = new Bridge(podBridge, podChainId);

        vm.stopBroadcast();

        console.log("Bridge implementation deployed at:", address(implementation));
    }
}
