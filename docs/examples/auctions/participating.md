! content id="participating"

## Participating in the auction

### Loading the Environment variables

First, we need to load the environment variables specified in the start of the documentation:

! content end

! content

! sticky

! codeblock

```rust
use std::env;
use std::str::FromStr;

use alloy::transports::http::reqwest::Url;
use alloy_primitives::Address;
use eyre::Result;

/// Step 1: Load environment variables
fn load_env() -> Result<(Url, String, Address)> {
    // Default to a known WS endpoint if POD_RPC is unset:
    let rpc_ws = env::var("POD_RPC").unwrap_or_else(|_| "wss://rpc.v2.pod.network/ws".to_string());
    // For example: wss://rpc.pod.network/ws or ws://127.0.0.1:8545
    let ws_url = Url::parse(&rpc_ws).expect("Invalid URL in POD_RPC");

    // Private key must be set:
    let private_key_hex =
        env::var("PRIVATE_KEY").expect("Missing PRIVATE_KEY environment variable");

    // Auction contract address must be set:
    let contract_address_str =
        env::var("AUCTION_CONTRACT").expect("Missing AUCTION_CONTRACT environment variable");
    let contract_address =
        Address::from_str(&contract_address_str).expect("Invalid address format for AUCTION_CONTRACT");

    Ok((ws_url, private_key_hex, contract_address))
}
```

! codeblock end

! sticky end

! content end

! content

### Initializing the auction contract:

Third, we want to initialize the auction contract:

! content end

! content

! sticky

! codeblock

```rust
use alloy::providers::Provider;
use alloy_primitives::Address;
use pod_core::contracts::auction::Auction;

/// Step 2: Initialize the Auction contract binding
fn init_auction<P: Provider>(pod_provider: &P, contract_address: Address) -> Auction<P> {
    Auction::new(contract_address, pod_provider)
}
```

! codeblock end

! sticky end

! content end

! content id="submitting-a-bid"

## Submitting a bid:

Now, we want to submit our bid:

! content end

! content

! sticky

! codeblock

```rust
use alloy::providers::Provider;
use alloy_primitives::U256;
use eyre::Result;
use pod_core::contracts::auction::Auction;
use alloy_rpc_types_eth::TransactionReceipt;

/// Step 3: Submit a bid with custom parameters
pub async fn submit_bid<P: Provider>(
    auction: &Auction<P>,
    auction_id: U256,
    deadline: U256,
    value: U256,
    data: Vec<u8>,
) -> Result<TransactionReceipt> {
    // Build the call
    let call = auction.submit_bid(auction_id, deadline, value, data);

    // Send the transaction
    let pending_tx = call.send().await?;
    println!("Submitted tx: {:?}", pending_tx.hash());

    // Optionally wait for the transaction receipt
    let receipt = pending_tx.get_receipt().await?;
    println!("Transaction receipt: {:?}", receipt);

    Ok(receipt)
}
```

! codeblock end

! sticky end

! content end

! content id="subscribing-to-the-logs"

## Subscribing to the logs of the auction

Lastly, we want to subscribe to the auction logs to get all the bids:

! content end

! content

! sticky

! codeblock

```rust
async fn subscribe_logs_for_auction_until_deadline<P: Provider>(
    pod_provider: &P,
    contract_address: Address,
    auction_id: U256,
    deadline: U256,
) -> Result<()> {
    use alloy_rpc_types_eth::{BlockNumber, Filter, ValueOrArray};
    use alloy_primitives::H256;
    use futures::StreamExt;
    use pod_core::contracts::auction::Auction as AuctionContract;

    // (A) Ensure we've advanced the chain time beyond `deadline`
    //     so the next call to `get_block_number()` is guaranteed
    //     to be a block whose timestamp >= `deadline`.
    println!("Waiting for on-chain time to pass the deadline {deadline}...");
    pod_provider.wait_past_perfect_time(deadline.as_u64()).await?;
    println!("On-chain time is now past {deadline}.");

    // (B) Capture the current block number as `block_end`
    //     This block corresponds to (or just follows) the `deadline`.
    let block_end = pod_provider
        .get_block_number()
        .await
        .expect("Failed to fetch current block number");
    println!("Captured block number {block_end} as the block_end (at or after deadline)");

    // 1) BidSubmitted event signature
    let bid_submitted_sig = AuctionContract::events::BidSubmitted::SIGNATURE_HASH;

    // 2) Convert the auction_id to a 32-byte H256
    let auction_id_topic = H256::from_uint(&auction_id);

    // 3) Create a filter with the address, signature, and the auction_id as topic1
    //    plus from_block = earliest (or some known start) and to_block = `block_end`.
    let filter = Filter::new()
        .address(contract_address)
        .topic0(ValueOrArray::Value(bid_submitted_sig))
        .topic1(ValueOrArray::Value(auction_id_topic))
        .from_block(BlockNumber::Earliest)
        .to_block(BlockNumber::Number(block_end));

    // 4) Subscribe to logs up to `block_end`
    //    (No new logs beyond `block_end` will be streamed.)
    let subscription = pod_provider.subscribe_logs_pod(&filter).await?;
    let mut log_stream = subscription.into_stream();

    tokio::spawn(async move {
        while let Some(log) = log_stream.next().await {
            println!("Filtered Log received: {log:?}");

            let decoded =
                AuctionContract::events::BidSubmitted::decode_log(&log)
                    .expect("Could not decode BidSubmitted event");
            println!("Decoded BidSubmitted event: {:?}", decoded);
        }

        println!("No more logs up to block_end = {block_end}. Subscription ended.");
    });

    Ok(())
}
```

! codeblock end

! sticky end

! content end
