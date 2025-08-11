// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {console} from "forge-std/console.sol";
import {BaseDeployer} from "./BaseDeployer.s.sol";

import {PodRegistry} from "../src/verifier/PodRegistry.sol";

contract PodRegistryDeployer is BaseDeployer {
    function run() public {
        address[] memory initialValidators = getValidatorAddresses();

        vm.startBroadcast();
        PodRegistry podRegistry = new PodRegistry(initialValidators);
        vm.stopBroadcast();

        console.log("PodRegistry deployed:");
        console.logAddress(address(podRegistry));
    }
}
