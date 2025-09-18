// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IBridgeMintBurn} from "../src/interfaces/IBridgeMintBurn.sol";
import {IBridge} from "../src/interfaces/IBridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {WrappedToken} from "../src/WrappedToken.sol";

contract CreateAndWhitelistToken is Script {
    function run() external {
        vm.startBroadcast();

        IERC20 testToken = IERC20(vm.envAddress("TEST_ERC"));
        WrappedToken mirrorToken = WrappedToken(vm.envAddress("MIRROR_TEST_ERC"));
        IBridgeMintBurn bridgeMintBurn = IBridgeMintBurn(vm.envAddress("BRIDGE_MINT_BURN_ADDRESS"));

        bridgeMintBurn.createAndWhitelistMirrorToken(
            "Test Token",
            "TEST",
            address(mirrorToken),
            address(testToken),
            18,
            IBridge.TokenLimits({minAmount: 1e18, deposit: 10000e18, claim: 10000e18})
        );

        console.log("Token created and whitelisted");

        vm.stopBroadcast();
    }
}
