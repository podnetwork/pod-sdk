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

```solidity
import {requireTimeBefore, Time} from "pod-sdk/Time.sol";

contract Auction {
    using Time for Time.Timestamp;

    // Event emitted when a bid is submitted
    event BidSubmitted(
        uint256 indexed auction_id,
        address indexed bidder,
        Time.Timestamp indexed deadline,
        uint256 value,
        bytes data
    );

    /**
     * @notice Submit a bid for an auction
     * @param auction_id The ID of the auction
     * @param deadline The deadline for the auction
     * @param value The bid value
     * @param data Additional data for the bid
     * @notice deadline in microseconds
     */
    function submitBid(
        uint256 auction_id,
        Time.Timestamp deadline,
        uint256 value,
        bytes calldata data
    ) public {
        // Check that the auction deadline hasn't passed
        requireTimeBefore(deadline, "Auction deadline passed");

        // Emit the bid submission event
        emit BidSubmitted(auction_id, msg.sender, deadline, value, data);
    }
}
```

! codeblock end

! sticky end

! content end
