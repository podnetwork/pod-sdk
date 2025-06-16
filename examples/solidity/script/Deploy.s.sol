pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import "forge-std/console.sol";

import {Auction} from "../src/Auction.sol";
import {RankedFeed} from "../src/RankedFeed.sol";
import {Voting} from "../src/Voting.sol";
import {PodRegistry} from "pod-sdk/verifier/PodRegistry.sol";
import {PodAuctionConsumer} from "optimistic-auction/PodAuctionConsumer.sol";

import {console} from "forge-std/console.sol";

contract Deployer is Script {
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
            address[] memory initialValidators = new address[](4);
            initialValidators[0] = 0xD64C0A2A1BAe8390F4B79076ceaE7b377B5761a3;
            initialValidators[1] = 0x8646d958225301A00A6CB7b6609Fa23bab87DA7C;
            initialValidators[2] = 0x7D5761b7b49fC7BFdD499E3AE908a4aCFe0807E6;
            initialValidators[3] = 0x06aD294f74dc98bE290E03797e745CF0D9c03dA2;

            PodRegistry podRegistry = new PodRegistry(initialValidators);
            console.log("PodRegistry deployed at:", address(podRegistry));

            uint256 bondAmount = 1 ether;
            PodAuctionConsumer auctionConsumer = new PodAuctionConsumer(address(podRegistry), bondAmount);

            console.log("PodAuctionConsumer deployed at:", address(auctionConsumer));
        }

        vm.stopBroadcast();
    }
}
