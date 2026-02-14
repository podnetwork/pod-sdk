# Bid in an optimistic auction

This guide walks through submitting a bid to the optimistic auctions precompile and waiting for the bid set to finalize. For background on how optimistic auctions work, see [Optimistic Auctions](https://docs.v2.pod.network/documentation/markets/optimistic-auctions).

## Submit a bid

A bid is a transaction to the `submitBid` function on the precompile. Each bid specifies an `auction_id` (which auction to join), a `deadline` (in microseconds), a `value` (application-defined score or price), and a `data` payload (e.g. an encoded intent or signed transaction).

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.v1.dev.pod.network");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const AUCTION = "0xeDD0670497E00ded712a398563Ea938A29dD28c7";
const abi = [
  "function submitBid(uint256 auction_id, uint64 deadline, uint256 value, bytes data)",
  "event BidSubmitted(uint256 indexed auction_id, address indexed bidder, uint64 indexed deadline, uint256 value, bytes data)",
];
const auction = new ethers.Contract(AUCTION, abi, wallet);

const auctionId = 1n;
const deadline = BigInt(Date.now()) * 1000n + 10_000_000n; // 10 seconds from now, in microseconds
const value = ethers.parseEther("100");                     // application-defined bid value
const data = "0x";                                          // opaque payload

const tx = await auction.submitBid(auctionId, deadline, value, data);
console.log("Bid tx:", tx.hash);
```
{% endtab %}

{% tab title="Rust (pod-sdk)" %}
```rust
use pod_sdk::{
    auctions::client::AuctionClient,
    provider::PodProviderBuilder,
    U256,
};
use std::time::{Duration, SystemTime};

let provider = PodProviderBuilder::with_recommended_settings()
    .with_private_key(PRIVATE_KEY.parse()?)
    .on_url("wss://rpc.v2.pod.network")
    .await?;

let auction = AuctionClient::new(
    provider,
    "0xeDD0670497E00ded712a398563Ea938A29dD28c7".parse()?,
);

let auction_id = U256::from(1);
let deadline = SystemTime::now() + Duration::from_secs(10);
let value = U256::from(100) * U256::from(10).pow(U256::from(18));
let data = vec![];

let receipt = auction
    .submit_bid(auction_id, deadline, value, data)
    .await?;
println!("Bid tx: {}", receipt.transaction_hash);
```
{% endtab %}
{% endtabs %}

{% hint style="warning" %}
**Microseconds, not milliseconds.** Deadlines are Unix timestamps in microseconds.
{% endhint %}

## Wait for the bid set to finalize

After submitting a bid, call `pod_waitPastPerfectTime` to block until the past perfect certificate is available for the auction deadline. Once it returns, the bid set is complete.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
// Wait for past perfection at the deadline
const result = await provider.send("pod_waitPastPerfectTime", [Number(deadline)]);
console.log("Bid set is final");
```
{% endtab %}

{% tab title="Rust (pod-sdk)" %}
```rust
// Wait for past perfection at the deadline
auction.wait_for_auction_end(deadline).await?;
println!("Bid set is final");
```
{% endtab %}
{% endtabs %}

## Fetch the finalized bid set

Once past perfection is reached, query the `BidSubmitted` event logs to read all bids in the auction.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
const filter = auction.filters.BidSubmitted(auctionId);
const logs = await auction.queryFilter(filter);

for (const log of logs) {
  console.log(`Bidder: ${log.args.bidder}, Value: ${log.args.value}`);
}
```
{% endtab %}

{% tab title="Rust (pod-sdk)" %}
```rust
let bids = auction.fetch_bids(auction_id).await?;

for bid in &bids {
    println!("Bidder: {}, Value: {}", bid.bidder, bid.amount);
}
```
{% endtab %}
{% endtabs %}
