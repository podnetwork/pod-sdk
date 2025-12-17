// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BaseDeployer} from "./BaseDeployer.s.sol";
import {console} from "forge-std/console.sol";
import {Bridge} from "pod-protocol/Bridge.sol";
import {PodRegistry} from "pod-protocol/PodRegistry.sol";

contract Deploy is BaseDeployer {
    function run(address podBridgeAddr) external returns (address podRegistry, address depositWithdraw) {
        address[] memory initialValidators = getValidatorAddresses();
        vm.startBroadcast();
        PodRegistry reg = new PodRegistry(initialValidators);
        Bridge bdw = new Bridge(address(reg), podBridgeAddr);
        vm.stopBroadcast();
        console.log("PodRegistry deployed at:", address(reg));
        console.log("BridgeDepositWithdraw deployed at:", address(bdw));
        return (address(reg), address(bdw));
    }
}
