pragma solidity ^0.8.26;

contract Auction {
    event BidSubmitted(
        uint256 indexed auction_id, address indexed bidder, uint128 indexed deadline, uint256 value, bytes data
    );

    /// @notice deadline in microseconds
    function submitBid(uint256 auction_id, uint128 deadline, uint256 value, bytes calldata data) public {}
}
