---
title: Auctions
layout: single

url: /examples/auctions

toc:
  auction-contract: Smart contract
  submitting-a-bid: Submitting a bid
  reading-bids: Reading bids
---

! content

# Auctions

This guide explains how to conduct fast decentralised auctions on pod. In these auctions, bidders submit bids before a predetermined deadline, and then anyone can query for the set of valid bids.

This collection of bids is the only output exposed by the protocol. Higher-order logic — such as pricing mechanism, validity filters, or winner selection — can be implemented on top of the primitive described here.


For an example implementation, go to [examples/auctions](https://github.com/podnetwork/pod-sdk/tree/main/examples/auction) of `podnetwork/pod-sdk` github repository.

```bash
 $ git clone https://github.com/podnetwork/pod-sdk.git && cd pod-sdk/examples/auctions
```

! content end

---

! content id="auction-contract"

## Auction Contract

### Solidity

The solidity smart contract code shows how to implement a basic decentralised auction on pod.

The `requireTimeBefore` primitive provided by pod ensures that a supermajority of pod validators received the bid before the deadline has passed. Even if a minority of validators is unavailable or faulty at the time, the bid will be accepted and these validators will eventually also include the bid in their ledger.

The contract assumes that the `deadline` for an `auction_id` is known between the bidders and if someone submits the wrong deadline the bid will be filtered out by the bidders.

! codeblock title="Auction.sol"

```solidity
import {requireTimeBefore} from "pod-sdk/Time.sol";

contract Auction {
    // Event emitted when a bid is submitted
    event BidSubmitted(
        uint256 indexed auction_id,
        address indexed bidder,
        uint256 indexed deadline,
        uint256 value,
        bytes data
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
        emit BidSubmitted(auction_id, msg.sender, deadline, value, data);
    }
}
```

! codeblock end

! content end

---

! content id="submitting-a-bid"

## Submitting a bid

Bid submission follows the standard way to send a transaction with a smart contract call to any EVM-based chain.

! codeblock title="main.rs"

```rust
use alloy_provider::Provider;
use alloy_primitives::Address;
use alloy_primitives::U256;
use eyre::Result;
use pod_core::contracts::auction::Auction;
use alloy_rpc_types_eth::TransactionReceipt;

pub async fn submit_bid<P: Provider>(
    pod_provider: &P,
    contract_address: Address,
    auction_id: U256,
    deadline: U256,
    value: U256,
    data: Vec<u8>,
) -> Result<TransactionReceipt> {
    let auction = Auction::new(contract_address, pod_provider);

    let call = auction.submit_bid(auction_id, deadline, value, data);

    let pending_tx = call.send().await?;
    println!("Submitted tx: {:?}", pending_tx.hash());

    let receipt = pending_tx.get_receipt().await?;
    println!("Transaction receipt: {:?}", receipt);

    Ok(receipt)
}
```

! codeblock end

! content end

! content id="reading-bids"

## Reading bids

To read the bids submitted to the auction, use `eth_getLogs` making sure to filter for the correct event signature, auction_id **and deadline**, therefore rejecting any bids that were submitted with the wrong deadline.

However, before reading bids, it is essential to make sure that there will not be more bids that will be accepted by a supermajority of the validators after reading. This can be tricky because each node on the network receives a transaction at different timestamps, but also because some of the nodes can be malicious.

The rpc interface of a pod fullnode provides `wait_past_perfect_time(deadline)` method, that guarantees that all transactions that will ever pass the check `requireTimeBefore(deadline)` for this deadline will already have been executed by the full node.

! codeblock title="main.rs"

```rust
use alloy_provider::Provider;
use alloy_primitives::{Address, U256, H256};
use alloy_rpc_types_eth::{BlockNumber, Filter, ValueOrArray};
use futures::StreamExt;
use pod_core::contracts::auction::Auction as AuctionContract;

async fn subscribe_logs_for_auction_until_deadline<P: Provider>(
    pod_provider: &P,
    contract_address: Address,
    auction_id: U256,
    deadline: U257,
) -> Result<()> {
    println!("Waiting for on-chain time to pass the deadline {deadline}...");
    pod_provider.wait_past_perfect_time(deadline.as_u64()).await?;
    println!("On-chain time is now past {deadline}.");

    let bid_submitted_sig = AuctionContract::events::BidSubmitted::SIGNATURE_HASH;

    let auction_id_topic = H256::from_uint(&auction_id);

    let filter = Filter::new()
        .address(contract_address)
        .topic0(ValueOrArray::Value(bid_submitted_sig))
        .topic1(ValueOrArray::Value(auction_id_topic))
        .topic2(ValueOrArray::Value(deadline));

    let logs = pod_provider.get_logs(&filter).await?;
    for log in logs {
        let bid =
            AuctionContract::events::BidSubmitted::decode_log(&log)
            .expect("Could not decode BidSubmitted event");
        println!("Bid received: {:?}", decoded);
    });

    Ok(())
}
```

! codeblock end

! content end
