pragma solidity ^0.8.26;

import {requireTimeBefore, Time} from "pod-sdk/Time.sol";

contract Auction {
    using Time for Time.Timestamp;

    event BidSubmitted(
        uint256 indexed auction_id, address indexed bidder, Time.Timestamp indexed deadline, uint256 value, bytes data
    );

    /**
     * @notice Submit a bid for an auction
     * @param auction_id The ID of the auction
     * @param deadline The deadline for the auction
     * @param value The bid value
     * @param data Additional data for the bid
     * @notice deadline in microseconds
     */
    function submitBid(uint256 auction_id, Time.Timestamp deadline, uint256 value, bytes calldata data) public {
        requireTimeBefore(deadline, "Auction deadline passed");

        emit BidSubmitted(auction_id, msg.sender, deadline, value, data);
    }
}
