// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {requireTimeBefore, requireTimeAfter, Time} from "pod-sdk/Time.sol";
import {requireQuorum} from "pod-sdk/Quorum.sol";

using Time for Time.Timestamp;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IERC721 {
    function transferFrom(address from, address to, uint256 tokenId) external;
}

contract Auction {
    struct Bid {
        address bidder;
        uint256 amount;
        bool processed;
    }

    struct AuctionData {
        address auctioneer;
        address tokenContract;
        address trophyContract;
        uint256 trophyTokenId;
        uint256 payoutGiven;
        bool prizeRefunded;
        Time.Timestamp deadline;
        uint256 winningBid;
    }

    mapping(uint256 => AuctionData) public auctions;
    mapping(uint256 => Bid) public bids;

    event AuctionStarted(uint256 indexed auctionId, address indexed auctioneer, address trophyContract, uint256 trophyTokenId, Time.Timestamp deadline);
    event WinningBid(uint256 indexed auctionId, uint256 indexed bidId);
    event BidSubmitted(uint256 indexed auctionId, uint256 indexed bidId, address indexed bidder, uint256 amount);
    event TrophyClaimed(uint256 indexed auctionId, uint256 indexed bidId, address indexed bidder);
    event BidRefunded(uint256 indexed auctionId, uint256 indexed bidId, address indexed bidder, uint256 amount);
    event PayoutClaimed(uint256 indexed auctionId, uint256 indexed bidId, address indexed auctioneer, uint256 amount);
    event TrophyRefunded(uint256 indexed auctionId, address indexed auctioneer, uint256 indexed trophyTokenId);

    // startAuction creates a new auction and transfers the trophy to the contract
    function startAuction(
        address trophyContract,
        uint256 trophyTokenId,
        address tokenContract,
        Time.Timestamp deadline
    ) external returns (uint256 auctionId) {
        requireTimeBefore(deadline, "Deadline must be in the future");
        
        auctionId = uint256(keccak256(abi.encodePacked(msg.sender, trophyTokenId, deadline)));
        
        // Check auction doesn't already exist (deadline 0 means uninitialized)
        require(auctions[auctionId].deadline.eq(Time.Timestamp.wrap(0)), "Auction already exists");
        
        auctions[auctionId] = AuctionData({
            auctioneer: msg.sender,
            tokenContract: tokenContract,
            trophyContract: trophyContract,
            trophyTokenId: trophyTokenId,
            payoutGiven: 0,
            prizeRefunded: false,
            deadline: deadline,
            winningBid: 0
        });

        IERC721(trophyContract).transferFrom(msg.sender, address(this), trophyTokenId);
        
        emit AuctionStarted(auctionId, msg.sender, trophyContract, trophyTokenId, deadline);
    }

    // submitBid used to participate in the auction
    // payment for a bid is accepted regardless of timing
    // but a bid can only be considered for winning the auction if the transaction is executed before the deadline
    function submitBid(uint256 auctionId, uint256 amount) external {
        AuctionData storage auction = auctions[auctionId];
        // Avoid explicit existence check - if deadline is 0, other checks will fail naturally
        
        uint256 bidId = uint256(keccak256(abi.encodePacked(auctionId, msg.sender, amount))); 
        require(bids[bidId].bidder == address(0), "Bid already exists");
        bids[bidId] = Bid(msg.sender, amount, false);

        IERC20(auction.tokenContract).transferFrom(msg.sender, address(this), amount);

        // cannot enforce with require/requireQuorum because payment must succeed regardless
        if (Time.currentTime().lt(auction.deadline) && amount > bids[auction.winningBid].amount) {
            auction.winningBid = bidId;
            emit WinningBid(auctionId, bidId);
        }

        emit BidSubmitted(auctionId, bidId, msg.sender, amount);
    }

    // claimTrophy is used by the winner to receive the auctioned trophy
    // highest bid must be honest (executed before deadline) to allow requireQuorum on it being the winning bid
    function claimTrophy(uint256 auctionId, uint256 bidId) external {
        AuctionData storage auction = auctions[auctionId];
        require(bids[bidId].bidder == msg.sender, "Not bidder"); // can only be called by the bidder so that claimTrophy/refundBid are ordered
        requireTimeAfter(auction.deadline, "Deadline not passed yet");
        requireQuorum(auction.winningBid == bidId, "Not the winning bid");
        requireQuorum(!bids[bidId].processed, "Bid already processed");

        IERC721(auction.trophyContract).transferFrom(address(this), msg.sender, auction.trophyTokenId);
        bids[bidId].processed = true;

        emit TrophyClaimed(auctionId, bidId, msg.sender);
    }

    // refundBid is used by a losing bidder to get their money back
    // honest bidder can refund using a higherBidId by forcing it to be executed, even after the deadline
    function refundBid(uint256 auctionId, uint256 bidId, uint256 higherBidId) external {
        AuctionData storage auction = auctions[auctionId];
        require(bids[bidId].bidder == msg.sender, "Not bidder"); // can only be called by the bidder so that claimTrophy/refundBid are ordered
        requireTimeAfter(auction.deadline, "Deadline not passed yet");
        requireQuorum(!bids[bidId].processed, "Bid already processed");
        requireQuorum(_isHigherBid(higherBidId, bidId), "Invalid higher bid");

        IERC20(auction.tokenContract).transfer(msg.sender, bids[bidId].amount);
        bids[bidId].processed = true;

        emit BidRefunded(auctionId, bidId, msg.sender, bids[bidId].amount);
    }

    // claimPayout is used by the auctioneer to get money from the auction
    // auctioneer might claim multiple times using increasing bid amounts
    function claimPayout(uint256 auctionId, uint256 bidId) external {
        AuctionData storage auction = auctions[auctionId];
        require(auction.auctioneer == msg.sender, "Not auctioneer"); // can only be called by auctioneer so that claimPayout/refundTrophy are ordered
        requireTimeAfter(auction.deadline, "Deadline not passed yet");
        requireQuorum(bids[bidId].amount > auction.payoutGiven, "Bid amount not greater than already given payout");
        requireQuorum(!auction.prizeRefunded, "Prize already refunded");

        uint256 remainingAmount = bids[bidId].amount - auction.payoutGiven;
        IERC20(auction.tokenContract).transfer(auction.auctioneer, remainingAmount);
        auction.payoutGiven = bids[bidId].amount;

        emit PayoutClaimed(auctionId, bidId, auction.auctioneer, remainingAmount);
    }

    // refundTrophy is used by the auctioneer to get the trophy back if there were no bids
    // if there were malicious bids, auctioneer can choose to refund or accept malicious bids
    // if there was an honest winning bid, auctioneer cannot refund trophy
    function refundTrophy(uint256 auctionId) external {
        AuctionData storage auction = auctions[auctionId];
        require(msg.sender == auction.auctioneer, "Not auctioneer"); // can only be called by auctioneer so that claimPayout/refundTrophy are ordered
        requireTimeAfter(auction.deadline, "Deadline not passed yet");
        requireQuorum(auction.payoutGiven == 0, "Some money already paid out to the auctioneer");
        requireQuorum(auction.winningBid == 0, "There is a non-zero winning bid");
        requireQuorum(!auction.prizeRefunded, "Prize already refunded");

        IERC721(auction.trophyContract).transferFrom(address(this), auction.auctioneer, auction.trophyTokenId);
        auction.prizeRefunded = true;

        emit TrophyRefunded(auctionId, auction.auctioneer, auction.trophyTokenId);
    }

    // first bid id has higher amount or has a larger hash
    function _isHigherBid(uint256 higherBidId, uint256 bidId) internal view returns (bool) {
        uint256 am1 = bids[higherBidId].amount;
        uint256 am2 = bids[bidId].amount;
        return (am1 > am2) || (am1 == am2 && higherBidId > bidId);
    }

    // getWinningBid returns the current winning bid ID for an auction
    function getWinningBid(uint256 auctionId) external view returns (uint256) {
        return auctions[auctionId].winningBid;
    }

    // getPayoutGiven returns how much payout has been given to the auctioneer
    function getPayoutGiven(uint256 auctionId) external view returns (uint256) {
        return auctions[auctionId].payoutGiven;
    }

    // isPrizeRefunded returns whether the prize has been refunded to the auctioneer
    function isPrizeRefunded(uint256 auctionId) external view returns (bool) {
        return auctions[auctionId].prizeRefunded;
    }

    // isBidProcessed returns whether a bid has been processed (claimed or refunded)
    function isBidProcessed(uint256 bidId) external view returns (bool) {
        return bids[bidId].processed;
    }

    // getAuctioneer returns the auctioneer address for an auction
    function getAuctioneer(uint256 auctionId) external view returns (address) {
        return auctions[auctionId].auctioneer;
    }

    // getTokenContract returns the token contract address for an auction
    function getTokenContract(uint256 auctionId) external view returns (address) {
        return auctions[auctionId].tokenContract;
    }

    // getTrophyContract returns the trophy contract address for an auction
    function getTrophyContract(uint256 auctionId) external view returns (address) {
        return auctions[auctionId].trophyContract;
    }

    // getTrophyTokenId returns the trophy token ID for an auction
    function getTrophyTokenId(uint256 auctionId) external view returns (uint256) {
        return auctions[auctionId].trophyTokenId;
    }

    // getDeadline returns the deadline for an auction
    function getDeadline(uint256 auctionId) external view returns (Time.Timestamp) {
        return auctions[auctionId].deadline;
    }
}
