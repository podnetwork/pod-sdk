// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {console, Script} from "forge-std/Script.sol";
import {Bridge} from "pod-protocol/Bridge.sol";
import {BridgeDeployer} from "../script/DeployBridge.s.sol";
import {DepositWaitingList} from "pod-protocol/DepositWaitingList.sol";

contract ArbitrumWhitelist is Script {
    function run() public {
        // TODO: update with actual address after deployment
        Bridge bridgeProxyOnArbitrum = Bridge(0x2DEd0774D7dAD35EC7ED73A7083E33F7881e2F00);
        address usdcOnArbitrum = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        address usdcOnPod = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
        address exchangeOnPod = address(0x50D0000000000000000000000000000000000002);
        uint256 minAmount = 5 * 10 ** 6; // 5 USDC with 6 decimals
        uint256 depositLimit = 1000000 * 10 ** 6; // 1 million USDC with 6 decimals
        uint256 claimLimit = 100000 * 10 ** 6; // 100k USDC with 6 decimals

        vm.startBroadcast();
        bridgeProxyOnArbitrum.whiteListToken(usdcOnArbitrum, usdcOnPod, minAmount, depositLimit, claimLimit);
        bridgeProxyOnArbitrum.setCallContractWhitelist(exchangeOnPod, true);
        vm.stopBroadcast();
    }
}
