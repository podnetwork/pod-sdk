// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {PodTest} from "pod-sdk/test/podTest.sol";
import {Auction} from "../contracts/Auction.sol";
import {Time} from "pod-sdk/Time.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

using Time for Time.Timestamp;

// Test contracts extending OpenZeppelin implementations
contract TestERC20 is ERC20 {
    constructor() ERC20("Test Token", "TEST") {}
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract TestERC721 is ERC721 {
    constructor() ERC721("Test NFT", "TNFT") {}
    
    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }
}

contract AuctionTest is PodTest {
    Auction public auction;
    TestERC20 public token;
    TestERC721 public trophy;
    
    address public auctioneer = address(0x1);
    address public bidder1 = address(0x2);
    address public bidder2 = address(0x3);
    
    uint256 public constant TROPHY_TOKEN_ID = 1;
    uint256 public auctionId;
    Time.Timestamp public deadline;

    function setUp() public {
        // Set up POD test environment
        podMockQuorum();
        
        token = new TestERC20();
        trophy = new TestERC721();
        auction = new Auction(); // Deploy contract with no parameters
        
        // Set up initial state
        deadline = Time.fromSeconds(uint64(block.timestamp + 1 days));
        podWarp(deadline); // Set the POD timestamp to the deadline for testing
        
        // Mint trophy to auctioneer
        trophy.mint(auctioneer, TROPHY_TOKEN_ID);
        
        // Start auction as the auctioneer
        vm.startPrank(auctioneer);
        trophy.approve(address(auction), TROPHY_TOKEN_ID); // Approve the contract to transfer NFT
        
        // Warp back to current time so auction can be started (deadline must be in future)
        podWarp(Time.fromSeconds(uint64(block.timestamp)));
        
        auctionId = auction.startAuction(
            address(trophy),
            TROPHY_TOKEN_ID,
            address(token),
            deadline
        );
        vm.stopPrank();
        
        // Give tokens to bidders
        token.mint(bidder1, 1000 ether);
        token.mint(bidder2, 1000 ether);
        
        // Approve auction contract to spend tokens
        vm.prank(bidder1);
        token.approve(address(auction), 1000 ether);
        
        vm.prank(bidder2);
        token.approve(address(auction), 1000 ether);
    }

    function test_StartAuction() public view {
        // Test that auction was created correctly
        assertEq(auction.getAuctioneer(auctionId), auctioneer);
        assertEq(auction.getTokenContract(auctionId), address(token));
        assertEq(auction.getTrophyContract(auctionId), address(trophy));
        assertEq(auction.getTrophyTokenId(auctionId), TROPHY_TOKEN_ID);
        assertEq(auction.getPayoutGiven(auctionId), 0);
        assertEq(auction.isPrizeRefunded(auctionId), false);
        assertTrue(auction.getDeadline(auctionId).eq(deadline));
        assertEq(auction.getWinningBid(auctionId), 0);
        
        // Test that NFT was transferred to contract
        assertEq(trophy.ownerOf(TROPHY_TOKEN_ID), address(auction));
    }

    function test_SubmitBid() public {
        uint256 bidAmount = 100 ether;
        uint256 expectedBidId = _calculateBidId(auctionId, bidder1, bidAmount);
        
        // Expect the BidSubmitted event to be emitted
        vm.expectEmit(true, true, true, true, address(auction));
        emit Auction.BidSubmitted(auctionId, expectedBidId, bidder1, bidAmount);
        
        vm.prank(bidder1);
        auction.submitBid(auctionId, bidAmount);
        
        // Check that tokens were transferred
        assertEq(token.balanceOf(bidder1), 900 ether);
        assertEq(token.balanceOf(address(auction)), bidAmount);
        
        // Check that this became the winning bid
        assertTrue(auction.getWinningBid(auctionId) != 0);
    }

    function test_SubmitBidAfterDeadline() public {
        // Move past deadline
        podWarp(Time.fromSeconds(deadline.toSeconds() + 1));
        
        uint256 bidAmount = 100 ether;
        uint256 expectedBidId = _calculateBidId(auctionId, bidder1, bidAmount);
        
        // Expect the BidSubmitted event to be emitted (bid is accepted even after deadline)
        vm.expectEmit(true, true, true, true, address(auction));
        emit Auction.BidSubmitted(auctionId, expectedBidId, bidder1, bidAmount);
        
        vm.prank(bidder1);
        auction.submitBid(auctionId, bidAmount);
        
        // Bid should be accepted but not set as winning bid
        assertEq(auction.getWinningBid(auctionId), 0);
        assertEq(token.balanceOf(address(auction)), bidAmount);
    }

    function test_MultipleWinningBids() public {
        // First bid
        vm.prank(bidder1);
        auction.submitBid(auctionId, 100 ether);
        
        uint256 firstWinningBid = auction.getWinningBid(auctionId);
        assertTrue(firstWinningBid != 0);
        
        // Second higher bid
        vm.prank(bidder2);
        auction.submitBid(auctionId, 200 ether);
        
        uint256 secondWinningBid = auction.getWinningBid(auctionId);
        assertTrue(secondWinningBid != firstWinningBid);
        assertTrue(secondWinningBid != 0);
    }


    function test_ClaimTrophy() public {
        uint256 bidAmount = 100 ether;
        
        // Submit winning bid and capture bid ID from event
        uint256 bidId = _submitBid(bidder1, auctionId, bidAmount);
        
        // Move past deadline
        podWarp(Time.fromSeconds(deadline.toSeconds() + 1));
        
        // Claim trophy as winner
        vm.prank(bidder1);
        auction.claimTrophy(auctionId, bidId);
        
        // Verify NFT was transferred to winner
        assertEq(trophy.ownerOf(TROPHY_TOKEN_ID), bidder1);
        
        // Verify bid is marked as processed
        assertTrue(auction.isBidProcessed(bidId));
    }

    function test_RefundBid() public {
        uint256 lowerBidAmount = 50 ether;
        uint256 higherBidAmount = 100 ether;
        
        // Submit two bids and capture bid IDs from events
        uint256 lowerBidId = _submitBid(bidder1, auctionId, lowerBidAmount);
        uint256 higherBidId = _submitBid(bidder2, auctionId, higherBidAmount);
        
        // Move past deadline
        podWarp(Time.fromSeconds(deadline.toSeconds() + 1));
        
        uint256 bidder1BalanceBefore = token.balanceOf(bidder1);
        
        // Refund losing bid
        vm.prank(bidder1);
        auction.refundBid(auctionId, lowerBidId, higherBidId);
        
        // Verify tokens were refunded
        assertEq(token.balanceOf(bidder1), bidder1BalanceBefore + lowerBidAmount);
        
        // Verify bid is marked as processed
        assertTrue(auction.isBidProcessed(lowerBidId));
    }

    function test_ClaimPayout() public {
        uint256 bidAmount = 100 ether;
        
        // Submit winning bid and capture bid ID from event
        uint256 bidId = _submitBid(bidder1, auctionId, bidAmount);
        
        // Move past deadline
        podWarp(Time.fromSeconds(deadline.toSeconds() + 1));
        
        uint256 auctioneerBalanceBefore = token.balanceOf(auctioneer);
        
        // Claim payout as auctioneer
        vm.prank(auctioneer);
        auction.claimPayout(auctionId, bidId);
        
        // Verify tokens were transferred to auctioneer
        assertEq(token.balanceOf(auctioneer), auctioneerBalanceBefore + bidAmount);
        
        // Verify payout was recorded
        assertEq(auction.getPayoutGiven(auctionId), bidAmount);
    }

    function test_RefundTrophy() public {
        // Create auction with no bids
        uint256 newAuctionId;
        uint256 newTrophyTokenId = 2;
        
        // Mint new trophy to auctioneer
        trophy.mint(auctioneer, newTrophyTokenId);
        
        vm.startPrank(auctioneer);
        trophy.approve(address(auction), newTrophyTokenId);
        
        newAuctionId = auction.startAuction(
            address(trophy),
            newTrophyTokenId,
            address(token),
            deadline
        );
        vm.stopPrank();
        
        // Move past deadline (no bids submitted)
        podWarp(Time.fromSeconds(deadline.toSeconds() + 1));
        
        // Refund trophy as auctioneer
        vm.prank(auctioneer);
        auction.refundTrophy(newAuctionId);
        
        // Verify NFT was returned to auctioneer
        assertEq(trophy.ownerOf(newTrophyTokenId), auctioneer);
        
        // Verify prize refund was recorded
        assertTrue(auction.isPrizeRefunded(newAuctionId));
    }

    // Helper functions
    
    // Helper function to calculate bid ID (same logic as in contract)
    function _calculateBidId(uint256 _auctionId, address bidder, uint256 amount) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(_auctionId, bidder, amount)));
    }
    
    // Helper function to submit bid and return the bid ID
    function _submitBid(address bidder, uint256 _auctionId, uint256 amount) internal returns (uint256 bidId) {
        bidId = _calculateBidId(_auctionId, bidder, amount);
        
        vm.prank(bidder);
        auction.submitBid(_auctionId, amount);
        
        return bidId;
    }
}
