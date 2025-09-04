// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {BridgeMintBurn} from "../src/BridgeMintBurn.sol";
import {PodRegistry} from "../src/PodRegistry.sol";

contract DeployMintBurn is Script {
    function run() external {
        console.log("=== Deploying BridgeMintBurn to localhost:8545 (chainId 1293) ===");

        vm.startBroadcast();

        BridgeMintBurn bridgeMintBurn = new BridgeMintBurn();
        console.log("BridgeMintBurn deployed at:", address(bridgeMintBurn));

        vm.stopBroadcast();

        console.log("=== BridgeMintBurn deployment complete ===");
        console.log("Network: localhost:8545 (chainId 1293)");
        console.log("BridgeMintBurn:", address(bridgeMintBurn));
    }
}
