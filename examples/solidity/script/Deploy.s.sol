// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {console} from "forge-std/console.sol";

import {RankedFeed} from "../src/RankedFeed.sol";
import {Voting} from "../src/Voting.sol";
import {BaseDeployer} from "pod-protocol-scripts/BaseDeployer.s.sol";

contract Deployer is BaseDeployer {
    function run() public {
        vm.startBroadcast();

        // Deploy RankedFeed
        RankedFeed rankedFeed = new RankedFeed();
        console.log("RankedFeed deployed at:", address(rankedFeed));

        // Deploy Voting
        Voting voting = new Voting();
        console.log("Voting deployed at:", address(voting));

        vm.stopBroadcast();
    }
}
