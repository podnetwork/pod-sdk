// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {BridgeMintBurn} from "../src/BridgeMintBurn.sol";
import {IBridge} from "../src/interfaces/IBridge.sol";

contract DeployMintBurn is Script {
    address constant OTHER_BRIDGE_CONTRACT = 0x12296f2D128530a834460DF6c36a2895B793F26d;
    IBridge.TokenLimits nativeTokenLimits = IBridge.TokenLimits({minAmount: 0.01 ether, deposit: 500e18, claim: 400e18});

    function run() external {
        console.log("=== Deploying BridgeMintBurn to localhost:8545 (chainId 1293) ===");

        vm.startBroadcast();

        BridgeMintBurn bridgeMintBurn = new BridgeMintBurn(OTHER_BRIDGE_CONTRACT, nativeTokenLimits);
        console.log("BridgeMintBurn deployed at:", address(bridgeMintBurn));

        vm.stopBroadcast();

        console.log("=== BridgeMintBurn deployment complete ===");
        console.log("Network: localhost:8545 (chainId 1293)");
        console.log("BridgeMintBurn:", address(bridgeMintBurn));
    }
}
