---
layout: simple
---

! content id="auction-contract"

## Auction Contract

### Solidity

The auction contract implements a time-based bidding system where participants can submit bids during an active auction period. Here's the complete contract code:

The contract features:

- Checking that the auction was sent before the deadline.
- Events for tracking bid submissions

! content end

! content

! sticky

! codeblock title="Solidity"

```javascript
contract Auction {
    // Event emitted when a bid is submitted
    event BidSubmitted(
        uint256 indexed auction_id,
        address indexed bidder,
        uint256 indexed deadline,
        uint256 value
    );

    /**
     * @notice Submit a bid for an auction
     * @param auction_id The ID of the auction
     * @param deadline The deadline for the auction
     * @param value The bid value
     * @param data Additional data for the bid
     */
    function submitBid(
        uint256 auction_id,
        uint256 deadline,
        uint256 value,
        bytes calldata data
    ) public {
        // Check that the auction deadline hasn't passed
        requireTimeBefore(deadline, "Auction deadline passed");

        // Emit the bid submission event
        emit BidSubmitted(auction_id, msg.sender, deadline, value);
    }
}
```

! codeblock end

! sticky end

! content end
