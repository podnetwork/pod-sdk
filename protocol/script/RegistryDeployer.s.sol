// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {console} from "forge-std/console.sol";
import {BaseDeployer} from "./BaseDeployer.s.sol";

import {Registry} from "../src/Registry.sol";

contract RegistryDeployer is BaseDeployer {
    function run() public {
        address[] memory initialValidators = getValidatorAddresses();
        uint256 f = (initialValidators.length - 1) / 3;

        vm.startBroadcast();
        // forge-lint: disable-next-line(unsafe-typecast)
        Registry registry = new Registry(initialValidators, uint8(f));
        vm.stopBroadcast();

        console.log("PodRegistry deployed:");
        console.logAddress(address(registry));
    }
}
