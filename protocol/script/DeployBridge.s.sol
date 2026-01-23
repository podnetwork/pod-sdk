// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BaseDeployer} from "./BaseDeployer.s.sol";
import {console} from "forge-std/console.sol";
import {Bridge} from "pod-protocol/Bridge.sol";

contract Deploy is BaseDeployer {
    function run(address podBridgeAddr, uint256 srcChainId, uint256 version) external returns (address bridge) {
        address[] memory initialValidators = getValidatorAddresses();
        vm.startBroadcast();
        uint8 f = uint8((initialValidators.length - 1) / 3);
        Bridge bdw = new Bridge(podBridgeAddr, initialValidators, f, srcChainId, version);
        vm.stopBroadcast();
        console.log("Bridge deployed at:", address(bdw));
        return address(bdw);
    }
}
