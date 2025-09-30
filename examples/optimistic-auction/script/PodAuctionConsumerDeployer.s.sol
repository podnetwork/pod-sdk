// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {console} from "forge-std/console.sol";
import {BaseDeployer} from "pod-protocol-scripts/BaseDeployer.s.sol";

import {PodRegistry} from "pod-protocol/PodRegistry.sol";
import {PodAuctionConsumer} from "../contracts/PodAuctionConsumer.sol";

contract PodAuctionConsumerDeployer is BaseDeployer {
    function run() public {
        address[] memory initialValidators = getValidatorAddresses();
        (string[] memory initialHosts, uint16[] memory initialPorts) = getValidatorHostsAndPorts();

        vm.startBroadcast();

        PodRegistry podRegistry = new PodRegistry(initialValidators, initialHosts, initialPorts);
        console.log("PodRegistry deployed:");
        console.logAddress(address(podRegistry));

        uint256 bondAmount = 1 ether;
        PodAuctionConsumer auctionConsumer = new PodAuctionConsumer(address(podRegistry), bondAmount);

        vm.stopBroadcast();

        console.log("PodAuctionConsumer deployed:");
        console.logAddress(address(auctionConsumer));
    }
}
