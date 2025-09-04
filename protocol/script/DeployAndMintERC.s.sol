// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {WrappedToken} from "../src/WrappedToken.sol";

contract DeployAndMintERC is Script {
    function run() external {
        console.log("=== Minting tokens ===");

        vm.startBroadcast();

        address token = vm.envOr("MIRROR_TEST_ERC", address(0));

        WrappedToken mirrorToken;
        if (token == address(0)) {
            mirrorToken = new WrappedToken("Test Token", "TEST", 18);
        } else {
            mirrorToken = WrappedToken(vm.envAddress("MIRROR_TEST_ERC"));
        }

        mirrorToken.mint(vm.envAddress("USER_ADDRESS"), 100 * 1e18);

        vm.stopBroadcast();
    }
}
