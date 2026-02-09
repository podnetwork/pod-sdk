---
description: Batch auctions for intent settlement with protocol-enforced fairness.
---

# \[WIP] Optimistic Auctions

The Optimistic Auctions precompile is a **batch auction primitive** for intent execution.

Use it to collect many bids in one window.

Let solvers compete to produce the best execution.

This is designed to reduce MEV by moving competition into a transparent auction.

Further reading: [From fair ordering to fair inclusion](https://pod.network/blog/from-fair-ordering-to-fair-inclusion-completing-the-journey-to-trustless-l2-auctions).

{% hint style="warning" %}
**Microseconds, not milliseconds.** Deadlines are Unix timestamps in microseconds.
{% endhint %}

### Contract interface

```
sol! {
    #[sol(rpc, extra_derives(Debug))]
    contract OptimisticAuction {
        /**
         * @notice Emitted when a new bid is submitted for an auction instance.
         * @param auction_id Logical auction identifier. Bids with the same id compete together.
         * @param bidder The account that submitted the bid.
         * @param deadline The latest timestamp (microseconds) at which inclusion is acceptable.
         * @param value Application-defined numeric value associated with the bid.
         * @param data Opaque payload interpreted by the auction application/solvers.
         */
        event BidSubmitted(
            uint256 indexed auction_id,
            address indexed bidder,
            uint64 indexed deadline,
            uint256 value,
            bytes data
        );

        /**
         * @notice Submit a bid into a specific auction instance.
         * @dev If `auction_id` does not exist yet, it is created implicitly.
         * @param auction_id Logical auction identifier. Use your app’s convention.
         * @param deadline Unix timestamp in microseconds. After this, the bid is invalid.
         * @param value Application-defined numeric value associated with the bid.
         * @param data Opaque payload. Commonly encodes an intent or order.
         */
        function submitBid(
            uint256 auction_id,
            uint64 deadline,
            uint256 value,
            bytes calldata data
        ) public {}
    }
}
```
