// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {console} from "forge-std/console.sol";
import {BaseDeployer} from "pod-sdk-scripts/BaseDeployer.s.sol";

import {Auction} from "../src/Auction.sol";
import {RankedFeed} from "../src/RankedFeed.sol";
import {Voting} from "../src/Voting.sol";
import {PodRegistry} from "pod-sdk/verifier/PodRegistry.sol";
import {PodAuctionConsumer} from "optimistic-auction/PodAuctionConsumer.sol";
import {TestMintBalancePrecompile} from "../src/TestMintBalancePrecompile.sol";

contract Deployer is BaseDeployer {
    function run() public {
        bool testContracts = vm.envOr("TEST_CONTRACTS", false);
        vm.startBroadcast();

        // Deploy Auction
        Auction auction = new Auction();
        console.log("Auction deployed at:", address(auction));

        // Deploy RankedFeed
        RankedFeed rankedFeed = new RankedFeed();
        console.log("RankedFeed deployed at:", address(rankedFeed));

        // Deploy Voting
        Voting voting = new Voting();
        console.log("Voting deployed at:", address(voting));

        if (testContracts) {
            address[] memory initialValidators = getValidatorAddresses();

            PodRegistry podRegistry = new PodRegistry(initialValidators);
            console.log("PodRegistry deployed at:", address(podRegistry));

            uint256 bondAmount = 1 ether;
            PodAuctionConsumer auctionConsumer = new PodAuctionConsumer(address(podRegistry), bondAmount);

            console.log("PodAuctionConsumer deployed at:", address(auctionConsumer));

            TestMintBalancePrecompile testMintBalance = new TestMintBalancePrecompile();
            console.log("TestMintBalancePrecompile contract deployed at:", address(testMintBalance));
        }

        vm.stopBroadcast();
    }
}
