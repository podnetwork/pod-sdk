# Optimistic Auctions

The optimistic auctions precompile is a minimal auction contract for intents. Bidders submit bids into auction instances on Pod, but settlement happens elsewhere - on Ethereum, an L2, or any other chain with an on-chain consumer contract. Pod acts as a censorship-resistant bulletin board: it collects bids before a deadline and uses [past perfection](https://docs.v2.pod.network/documentation/core/timestamping#past-perfection) to guarantee that the bid set is complete once the deadline passes.

For background on how optimistic auctions work, see [Optimistic Auctions](https://docs.v2.pod.network/documentation/markets/optimistic-auctions).

**Precompile address:** `0xeDD0670497E00ded712a398563Ea938A29dD28c7`

## Interface

```solidity
interface IOptimisticAuction {
    /// @notice Emitted when a new bid is submitted for an auction instance.
    event BidSubmitted(
        uint256 indexed auction_id,
        address indexed bidder,
        uint64 indexed deadline,
        uint256 value,
        bytes data
    );

    /// @notice Submit a bid into a specific auction instance.
    ///         If the auction_id does not exist yet, it is created implicitly.
    /// @param auction_id Logical auction identifier. Bids with the same id compete together.
    /// @param deadline Unix timestamp in microseconds. After this, the bid is invalid.
    /// @param value Application-defined numeric value associated with the bid.
    /// @param data Opaque payload, commonly encodes an intent or order.
    function submitBid(
        uint256 auction_id,
        uint64 deadline,
        uint256 value,
        bytes calldata data
    ) external;
}
```

{% hint style="warning" %}
**Microseconds, not milliseconds.** Deadlines are Unix timestamps in microseconds.
{% endhint %}
