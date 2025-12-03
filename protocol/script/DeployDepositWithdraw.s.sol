// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BaseDeployer} from "./BaseDeployer.s.sol";
import {console} from "forge-std/console.sol";
import {BridgeDepositWithdraw} from "pod-protocol/BridgeDepositWithdraw.sol";
import {IBridge} from "pod-protocol/interfaces/IBridge.sol";
import {PodRegistry} from "pod-protocol/PodRegistry.sol";

contract DeployDepositWithdraw is BaseDeployer {
    function run(
        address podBridgeAddr,
        IBridge.TokenLimits memory nativeTokenLimits
    ) external returns (address podRegistry, address depositWithdraw) {
        address[] memory initialValidators = getValidatorAddresses();
        vm.startBroadcast();
        PodRegistry reg = new PodRegistry(initialValidators);
        BridgeDepositWithdraw bdw = new BridgeDepositWithdraw(address(reg), podBridgeAddr, nativeTokenLimits);
        vm.stopBroadcast();
        console.log("PodRegistry deployed at:", address(reg));
        console.log("BridgeDepositWithdraw deployed at:", address(bdw));
        return (address(reg), address(bdw));
    }
}
