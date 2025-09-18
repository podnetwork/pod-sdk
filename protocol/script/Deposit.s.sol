// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Bridge} from "../src/abstract/Bridge.sol";

contract Deposit is Script {
    function run() external {
        console.log(
            "=== Depositing tokens; needs to be called with the private key of the token holder because of approve ==="
        );

        vm.startBroadcast();

        address mirrorToken = vm.envAddress("MIRROR_TEST_ERC");

        Bridge bridge = Bridge(vm.envAddress("BRIDGE_MINT_BURN_ADDRESS"));

        uint256 amount = 1 * 1e18;

        IERC20(mirrorToken).approve(address(bridge), amount);

        vm.stopBroadcast();

        vm.startBroadcast();

        address to = vm.envAddress("USER_ADDRESS");

        bridge.deposit(mirrorToken, amount, to);

        vm.stopBroadcast();
    }
}
