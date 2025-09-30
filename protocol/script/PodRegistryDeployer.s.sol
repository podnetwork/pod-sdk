// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {console} from "forge-std/console.sol";
import {BaseDeployer} from "./BaseDeployer.s.sol";

import {PodRegistry} from "../src/PodRegistry.sol";

contract PodRegistryDeployer is BaseDeployer {
    function run() public {
        address[] memory initialValidators = getValidatorAddresses();
        (string[] memory initialHosts, uint16[] memory initialPorts) = getValidatorHostsAndPorts();

        vm.startBroadcast();
        PodRegistry registry = new PodRegistry(initialValidators, initialHosts, initialPorts);
        vm.stopBroadcast();

        console.log("PodRegistry deployed:");
        console.logAddress(address(registry));
    }
}
