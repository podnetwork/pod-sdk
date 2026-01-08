// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {Auction} from "../contracts/Auction.sol";
import {Time} from "pod-sdk/Time.sol";

contract AuctionScript is Script {
    Auction public auction;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Deploy the auction contract (no constructor parameters needed)
        auction = new Auction();
        console.log("Auction contract deployed at:", address(auction));

        // Example usage (commented out - replace with actual values when ready to use):
        // 
        // address trophyContract = address(0x1); // Replace with actual ERC721 contract
        // uint256 trophyTokenId = 1; // Replace with actual token ID  
        // address tokenContract = address(0x2); // Replace with actual ERC20 contract
        // Time.Timestamp deadline = Time.fromSeconds(uint64(block.timestamp + 7 days));
        // 
        // uint256 auctionId = auction.startAuction(
        //     trophyContract,
        //     trophyTokenId, 
        //     tokenContract,
        //     deadline
        // );
        // 
        // console.log("Auction started with ID:", auctionId);
        
        console.log("To start an auction, call startAuction() with your NFT details");

        vm.stopBroadcast();
    }
}
