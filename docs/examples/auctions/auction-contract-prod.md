---
layout: simple
---

! content id="auction-contract-on-pod"

## Auction Contract on pod

The auction contract on pod is pre-deployed and ready to use. The implementation on the SDK side using the `sol!` macro looks as follows.

! content end

! content

! sticky

! codeblock title="Production sample"

```rust
use alloy_sol_types::sol;

sol! {
    #[sol(bytecode = "608060405234801561001057600080fd5b506101a8806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063852ca61214610030575b600080fd5b61004361003e3660046100e5565b610045565b005b834211156100995760405162461bcd60e51b815260206004820152601760248201527f41756374696f6e20646561646c696e6520706173736564000000000000000000604482015260640160405180910390fd5b83336001600160a01b0316867f71a5674c44b823bc0df08201dfeb2e8bdf698cd684fd2bbaa79adcf2c99fc186866040516100d691815260200190565b60405180910390a45050505050565b6000806000806000608086880312156100fd57600080fd5b853594506020860135935060408601359250606086013567ffffffffffffffff8082111561012a57600080fd5b818801915088601f83011261013e57600080fd5b81358181111561014d57600080fd5b89602082850101111561015f57600080fd5b969995985093965060200194939250505056fea2646970667358221220b2c739e8530a3ddbc3107dcff0aac4bf8a7a78ab2225b6726d3087eb41178e0264736f6c63430008150033")]
    contract Auction {
        event BidSubmitted(uint256 indexed auction_id, address indexed bidder, uint256 indexed deadline, uint256 value);

        function submitBid(uint256 auction_id, uint256 deadline, uint256 value, bytes calldata data) public {
            require(block.timestamp <= deadline, "Auction deadline passed");

            emit BidSubmitted(auction_id, msg.sender, deadline, value);
        }
    }
}
```

! codeblock end

The contract can be accessed as follows:

! codeblock

```rust
use pod_core::contracts::auction::Auction;
```

! codeblock end

The contract is deployed to the address `0x217F5658c6ecC27D439922263AD9Bb8e992e0373` on pod network.

! sticky end

! content end
