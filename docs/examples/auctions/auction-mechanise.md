---
layout: single
---

! anchor auction-mechanise

## Auction Mechanism

The Pod Auction is an optimistic, single-shot, first-price auction. It is optimistic because it assumes participants behave honestly by default, and only resorts to dispute resolution when misbehavior occurs.

### Protocol Overview

- **Single-shot**: Participants submit bids once without revisions.
- **First-price**: Highest bid wins the auction.
- **Decentralized**: No trusted third-party auctioneer. Pod network replicas act as validators.

### Auction Phases

1. Bidding Phase:

   - Bidders submit bids to Pod replicas within a specific timeframe (auction start to auction finish).
   - Valid bids are signed by pod validators if submitted within this timeframe.

2. Optimistic Outcome:

   - Once the bidding phase concludes (after the deadline is reached), bidders read Pod to locally identify the winner.
   - The bidder observing themselves as the winner optimistically announces this outcome with sufficient signatures (2f+1) to an on-chain consumer.

3. Optimistic Dispute Resolution (only if needed):

   - If a bidder wrongly claims victory, other bidders can dispute the outcome by submitting evidence of a higher bid.
   - The smart contract consumer verifies signatures and settles disputes transparently.

4. No-Show Handling:

   - If no bidder announces victory, bidders submit their local winning bids, and the consumer selects the highest valid bid.
