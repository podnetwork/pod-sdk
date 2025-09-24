// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IBridgeMintBurn} from "../src/interfaces/IBridgeMintBurn.sol";
import {BridgeMintBurn} from "../src/BridgeMintBurn.sol";
import {IBridge} from "../src/interfaces/IBridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {WrappedToken} from "../src/WrappedToken.sol";

contract CreateAndWhitelistToken is Script {
    function run() external {
        vm.startBroadcast();

        IBridgeMintBurn bridgeMintBurn = new BridgeMintBurn(
            makeAddr("otherBridgeContract"),
            IBridge.TokenLimits({minAmount: 1e18, deposit: 10000e18, claim: 10000e18}),
            1
        );

        address token = bridgeMintBurn.createAndWhitelistMirrorToken(
            "Test Token",
            "TEST",
            address(0),
            address(0x3B1b6FfAC8831f1c1c9a425Bb240Cd1bbF23F146),
            18,
            IBridge.TokenLimits({minAmount: 1e18, deposit: 10000e18, claim: 10000e18})
        );

        console.log("Token created and whitelisted at:", token);

        vm.stopBroadcast();
    }
}
