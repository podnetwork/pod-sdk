// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {requireTimeBefore} from "pod-sdk/Time.sol";

contract Auction {
    event BidSubmitted(uint256 indexed deadline, uint128 bid, bytes data);

    function submitBid(uint256 deadline, uint128 bid, bytes calldata data) external {
        require(bid > 0, "Bid amount must be greater than zero");
        requireTimeBefore(deadline, "Auction deadline passed");

        emit BidSubmitted(deadline, bid, data);
    }
}
