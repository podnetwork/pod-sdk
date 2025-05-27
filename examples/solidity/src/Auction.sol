pragma solidity ^0.8.26;

contract Auction {
    event BidSubmitted(uint256 indexed auction_id, address indexed bidder, uint256 indexed deadline, uint256 value);

    function submitBid(uint256 auction_id, uint256 deadline, uint256 value, bytes calldata data) public {
        require(block.timestamp <= deadline, "Auction deadline passed");

        emit BidSubmitted(auction_id, msg.sender, deadline, value);
    }
}
