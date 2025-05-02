// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import "forge-std/console.sol";

import {PodRegistry} from "../src/PodRegistry.sol";

contract PodRegistryDeployer is Script {
    function run() public {
        address[] memory initialValidators = new address[](4);
        initialValidators[0] = 0xD64C0A2A1BAe8390F4B79076ceaE7b377B5761a3;
        initialValidators[1] = 0x8646d958225301A00A6CB7b6609Fa23bab87DA7C;
        initialValidators[2] = 0x7D5761b7b49fC7BFdD499E3AE908a4aCFe0807E6;
        initialValidators[3] = 0x06aD294f74dc98bE290E03797e745CF0D9c03dA2;

        vm.startBroadcast();
        PodRegistry podRegistry = new PodRegistry(initialValidators);
        vm.stopBroadcast();

        console.log("PodRegistry deployed:");
        console.logAddress(address(podRegistry));
    }
}
