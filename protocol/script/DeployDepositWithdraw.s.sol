// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {BridgeDepositWithdraw} from "../src/BridgeDepositWithdraw.sol";
import {PodRegistry} from "../src/PodRegistry.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import {IBridge} from "../src/interfaces/IBridge.sol";
import {BaseDeployer} from "./BaseDeployer.s.sol";

contract DeployDepositWithdraw is BaseDeployer {
    uint256 constant CHAIN_ID = 31337;
    string constant RPC_URL = "http://localhost:8546";

    function run() external {
        console.log("=== Deploying BridgeDepositWithdraw to localhost:8546 (chainId 31337) ===");

        // Create a fork of the deposit/withdraw network
        vm.createSelectFork(RPC_URL);
        require(block.chainid == CHAIN_ID, "Wrong chain ID for deposit/withdraw network");

        // Deploy PodRegistry first
        address[] memory initialValidators = getValidatorAddresses();

        PodRegistry podRegistry = new PodRegistry(initialValidators);
        console.log("PodRegistry deployed at:", address(podRegistry));

        BridgeDepositWithdraw bridgeDepositWithdraw = new BridgeDepositWithdraw(address(podRegistry));
        console.log("BridgeDepositWithdraw deployed at:", address(bridgeDepositWithdraw));

        // Deploy some test tokens
        ERC20Mock testToken = new ERC20Mock();
        ERC20Mock mirrorToken = new ERC20Mock();
        console.log("Test token deployed at:", address(testToken));
        console.log("Mirror token deployed at:", address(mirrorToken));

        // Configure the bridge
        bridgeDepositWithdraw.whiteListToken(
            address(testToken),
            address(mirrorToken),
            IBridge.TokenLimits({minAmount: 1e18, deposit: 10000e18, claim: 10000e18})
        );
        console.log("Token whitelisted on bridge");

        vm.stopBroadcast();

        console.log("=== BridgeDepositWithdraw deployment complete ===");
        console.log("Network: localhost:8546 (chainId 1337)");
        console.log("PodRegistry:", address(podRegistry));
        console.log("BridgeDepositWithdraw:", address(bridgeDepositWithdraw));
        console.log("Test Token:", address(testToken));
        console.log("Mirror Token:", address(mirrorToken));
    }
}
