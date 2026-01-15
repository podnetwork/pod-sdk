pragma solidity ^0.8.26;

interface IAuction {
    event BidSubmitted(
        uint256 indexed auction_id, address indexed bidder, uint64 indexed deadline, uint256 value, bytes data
    );

    /// @notice Submit a bid to an auction
    /// @param auction_id The auction identifier
    /// @param deadline Deadline in microseconds
    /// @param value The bid value
    /// @param data Additional bid data
    function submitBid(uint256 auction_id, uint64 deadline, uint256 value, bytes calldata data) external;
}
