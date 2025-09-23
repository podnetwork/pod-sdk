// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {console} from "forge-std/console.sol";

import {Auction} from "../src/Auction.sol";
import {RankedFeed} from "../src/RankedFeed.sol";
import {Voting} from "../src/Voting.sol";
import {BaseDeployer} from "pod-protocol-scripts/BaseDeployer.s.sol";
import {PodRegistry} from "pod-protocol/PodRegistry.sol";
import {PodAuctionConsumer} from "optimistic-auction/PodAuctionConsumer.sol";
import {TestMintBalancePrecompile} from "../src/TestMintBalancePrecompile.sol";
import {BridgeMintBurn} from "pod-protocol/BridgeMintBurn.sol";
import {IBridge} from "pod-protocol/interfaces/IBridge.sol";

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

            address OTHER_BRIDGE_CONTRACT = makeAddr("otherBridgeContract");
            IBridge.TokenLimits memory nativeTokenLimits =
                IBridge.TokenLimits({minAmount: 0.01 ether, deposit: 5000000 ether, claim: 4000000 ether});

            BridgeMintBurn bridgeMintBurn = new BridgeMintBurn(OTHER_BRIDGE_CONTRACT, nativeTokenLimits, 0);
            console.log("BridgeMintBurn deployed at:", address(bridgeMintBurn));

            address MIRROR_TOKEN_ADDRESS = makeAddr("mirrorToken");

            address token = bridgeMintBurn.createAndWhitelistMirrorToken(
                "Test Token", "TEST", address(0), address(MIRROR_TOKEN_ADDRESS), 18, nativeTokenLimits
            );

            console.log("Token deployed at:", token);
        }

        vm.stopBroadcast();
    }
}
