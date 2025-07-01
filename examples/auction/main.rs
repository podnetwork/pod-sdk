use std::{collections::HashSet, str::FromStr, time::SystemTime};

use anyhow::Result;
use clap::{Parser, Subcommand};
use futures::StreamExt;
use pod_sdk::{
    alloy_primitives, alloy_sol_types::SolEvent, provider::PodProviderBuilder, Address, Bytes,
    EthereumWallet, PrivateKeySigner, U256,
};
use pod_types::{rpc::filter::LogFilterBuilder, Timestamp};
use tokio::sync::mpsc;

use pod_examples_solidity::auction::Auction;

const AUCTION_CONTRACT_ADDRESS: &str = "0x6145AC8fb73eB26588245c2afc454fC9629Ad5b3";
const POD_EXPLORER_URL: &str = "https://explorer.dev.pod.network";

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    /// RPC URL for the Pod network
    #[arg(long, default_value = "wss://rpc.dev.pod.network")]
    rpc_url: String,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Submit a bid for an auction
    Vote {
        /// The auction ID
        auction_id: U256,
        /// The deadline timestamp in seconds
        deadline: u64,
        /// The bid value in wei
        #[arg(long)]
        value: U256,
        /// Additional data for the bid
        #[arg(long)]
        data: Bytes,
        /// Private key for signing the transaction
        #[arg(long)]
        private_key: String,
    },
    /// Watch an auction for bids and deadline
    Watch {
        /// The auction ID
        auction_id: U256,
        /// The deadline timestamp
        deadline: u64,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Vote {
            auction_id,
            deadline,
            value,
            data,
            private_key,
        } => {
            vote(auction_id, deadline, value, data, private_key, cli.rpc_url).await?;
        }
        Commands::Watch {
            auction_id,
            deadline,
        } => {
            watch(auction_id, deadline, cli.rpc_url).await?;
        }
    }

    Ok(())
}

async fn vote(
    auction_id: U256,
    deadline: u64,
    value: U256,
    data: Bytes,
    private_key: String,
    rpc_url: String,
) -> Result<()> {
    // Validate deadline
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)?
        .as_secs();
    if deadline <= now {
        return Err(anyhow::anyhow!("Deadline must be in the future"));
    }

    // Create provider with private key
    let key_bytes = hex::decode(private_key)?;
    let signing_key = pod_sdk::SigningKey::from_slice(&key_bytes)?;
    let signer = PrivateKeySigner::from_signing_key(signing_key);
    let wallet = EthereumWallet::new(signer);

    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .wallet(wallet.clone())
        .on_url(rpc_url)
        .await?;

    // Get auction contract instance
    let auction_address = Address::from_str(AUCTION_CONTRACT_ADDRESS)?;
    let auction = Auction::new(auction_address, pod_provider.clone());

    // Submit bid
    println!("Submitting bid for auction {}...", auction_id);
    let pending_tx = auction
        .submitBid(auction_id, U256::from(deadline), value, data)
        .send()
        .await?;

    println!("Transaction sent! Hash: {:?}", pending_tx.tx_hash());
    println!(
        "View on explorer: {}/tx/{:?}",
        POD_EXPLORER_URL,
        pending_tx.tx_hash()
    );

    // Wait for receipt
    let receipt = pending_tx.get_receipt().await?;
    println!("\nTransaction receipt:");
    println!(
        "Status: {}",
        if receipt.status() {
            "Success"
        } else {
            "Failed"
        }
    );
    println!("Gas used: {}", receipt.gas_used);
    println!("Effective gas price: {}", receipt.effective_gas_price);

    // Get committee for verification
    let committee = pod_provider.get_committee().await?;

    // Verify receipt
    if receipt.verify(&committee).is_ok() {
        println!("\nReceipt verified by committee!");
        println!("Attestations:");
        for attestation in &receipt.pod_metadata.attestations {
            println!("  - Public key: {}", attestation.public_key);
            println!("    Signature: {}", attestation.signature);
            println!("    Timestamp: {}", attestation.timestamp);
        }
    } else {
        println!("\nWarning: Receipt verification failed!");
    }

    Ok(())
}

async fn watch(auction_id: U256, deadline: u64, rpc_url: String) -> Result<()> {
    // Validate deadline
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)?
        .as_secs();
    if deadline <= now {
        return Err(anyhow::anyhow!("Deadline must be in the future"));
    }

    // Create provider
    let provider = PodProviderBuilder::with_recommended_settings()
        .on_url(rpc_url)
        .await?;

    // Get auction contract instance
    let auction_address = Address::from_str(AUCTION_CONTRACT_ADDRESS)?;
    // let _auction = Auction::new(auction_address, provider.clone());

    // Create filter for BidSubmitted events
    let filter = LogFilterBuilder::new()
        .address(auction_address)
        .event_signature(Auction::BidSubmitted::SIGNATURE_HASH)
        .topic1(U256::from(auction_id))
        .build();

    println!(
        "Watching auction {} until deadline {}...",
        auction_id, deadline
    );
    println!(
        "View contract on explorer: {}/account/{}",
        POD_EXPLORER_URL, auction_address
    );

    // Create channel for communication between tasks
    let (tx, mut rx) = mpsc::channel(100);

    // Track highest bid and processed transactions
    let mut highest_bid = U256::ZERO;
    let mut highest_bidder = Address::ZERO;
    let mut processed_txs = HashSet::new();

    // Spawn task to handle log subscription
    let pod_provider_clone = provider.clone();
    let log_handle = tokio::spawn(async move {
        // Subscribe to new events
        let sub = pod_provider_clone
            .subscribe_verifiable_logs(&filter)
            .await?;
        let mut stream = sub.into_stream();

        // Watch for events
        while let Some(log) = stream.next().await {
            // Convert RPC log to primitive log for decoding
            let primitive_log = alloy_primitives::Log {
                address: log.inner.address(),
                data: log.inner.data().clone(),
            };

            if let Ok(event) = Auction::BidSubmitted::decode_log(&primitive_log, true) {
                // Send event to main task
                if tx.send((event, log.inner.transaction_hash)).await.is_err() {
                    // Channel closed, exit task
                    break;
                }
            }
        }
        Ok::<_, anyhow::Error>(())
    });

    // Spawn task to wait for deadline
    // After a time is past perfect, the validator has seen all transactions that can get a 2/3 quorum with timestamp earlier than that.
    let provider_clone = provider.clone();
    let mut deadline_handle = tokio::spawn(async move {
        println!("\nWaiting for auction deadline...");
        provider_clone
            .wait_past_perfect_time(Timestamp::from_seconds(deadline))
            .await?;
        println!("\n\n**Auction deadline reached!**\n\n");
        Ok::<_, anyhow::Error>(())
    });

    // Main task processes events and waits for deadline
    loop {
        tokio::select! {
            // Handle new bid events
            Some((event, Some(tx_hash))) = rx.recv() => {
                // Skip if we've already processed this transaction
                if !processed_txs.insert(tx_hash) {
                    continue;
                }

                println!("\nNew bid received!");
                println!("Bidder: {}", event.bidder);
                println!("Value: {} wei", event.value);
                println!("View on explorer: {}/tx/{:?}", POD_EXPLORER_URL, tx_hash);

                // Update highest bid if needed
                if event.value > highest_bid {
                    highest_bid = event.value;
                    highest_bidder = event.bidder;
                    println!("New highest bid!");
                }
            }
            // Check if deadline task completed
            result = &mut deadline_handle => {
                match result {
                    Ok(Ok(_)) => break,
                    Ok(Err(e)) => return Err(e),
                    Err(e) => return Err(anyhow::anyhow!("Deadline task failed: {}", e)),
                }
            }
        }
    }

    // Cancel the log subscription task
    log_handle.abort();

    // Print winner
    if highest_bid > U256::ZERO {
        println!("\nAuction winner:");
        println!("Address: {}", highest_bidder);
        println!("Bid amount: {} wei", highest_bid);
        println!(
            "View winner on explorer: {}/account/{}",
            POD_EXPLORER_URL, highest_bidder
        );
    } else {
        println!("\nNo bids were received for this auction.");
    }

    Ok(())
}
