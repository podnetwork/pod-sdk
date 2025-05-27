use std::{
    io::{Read, stdin},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use alloy::{primitives::ruint::aliases::U256, sol_types::SolEvent};
use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use futures::StreamExt;
use pod_sdk::{Address, Hash, alloy_rpc_types::Filter, provider::PodProviderBuilder};

use pod_sdk::alloy_primitives::keccak256;
use pod_types::Timestamp;

alloy::sol!(
    #[sol(rpc)]
    "Notary.sol"
);

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    /// Address of the Notary contract
    #[arg(long, default_value = "0x12296f2D128530a834460DF6c36a2895B793F26d")]
    contract_address: Address,

    /// RPC URL for the Pod network
    #[arg(long, default_value = "ws://localhost:8545")]
    rpc_url: String,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Get timestamp of document identified by its hash
    GetTimestamp { hash: String },
    /// Timestamp a document
    Timestamp {
        /// Private key for signing the transaction
        #[arg(long)]
        private_key: String,

        /// Document text to be timestamped.
        /// Will read from stdin if not provided
        document: Option<String>,
    },
    /// Watch timestamping events
    Watch {
        /// Watch timestamp events created by specified address
        #[arg(long = "from")]
        from_submitter: Option<Address>,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Watch { from_submitter } => {
            watch(cli.rpc_url, cli.contract_address, from_submitter).await?;
        }
        Commands::GetTimestamp { hash } => {
            match get_timestamp(cli.rpc_url, cli.contract_address, hash).await? {
                Some(timestamp) => {
                    println!("{}", humantime::format_rfc3339(timestamp));
                }
                None => {
                    println!("document isn't timestamped");
                }
            }
        }
        Commands::Timestamp {
            private_key,
            document,
        } => {
            let (hash, ts) =
                timestamp(cli.rpc_url, cli.contract_address, private_key, document).await?;
            println!(
                "timestamped document with hash: {} @ {}",
                hex::encode(hash.as_slice()),
                humantime::format_rfc3339(ts)
            );
        }
    }

    Ok(())
}

async fn watch(
    rpc_url: String,
    contract_address: Address,
    submitter: Option<Address>,
) -> Result<()> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .on_url(rpc_url)
        .await?;

    let mut filter = Filter::new()
        .address(contract_address)
        .event_signature(Notary::DocumentTimestamped::SIGNATURE_HASH);
    if let Some(submitter) = submitter {
        filter = filter.topic2(submitter.into_word());
    }

    let mut stream = pod_provider
        .subscribe_verifiable_logs(&filter)
        .await?
        .into_stream();

    let committee = pod_provider.get_committee().await?;

    while let Some(log) = stream.next().await {
        if !log.verify(&committee)? {
            eprintln!(" got invalid event!");
            continue;
        }
        let event = Notary::DocumentTimestamped::decode_log(&log.inner.inner, true)
            .context("decoding event failed. deployed contract version might not match")?;

        let timestamp = humantime::format_rfc3339(decode_timestamp(event.timestamp)?);
        println!(
            "Address {} timestamped  document hash {} @ {}",
            event.submitter, event.documentHash, timestamp
        );
    }

    Ok(())
}

async fn timestamp(
    rpc_url: String,
    contract_address: Address,
    private_key: String,
    document: Option<String>,
) -> Result<(Hash, SystemTime)> {
    let pk_bytes = hex::decode(private_key)?;
    let pk = pod_sdk::SigningKey::from_slice(&pk_bytes)?;

    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .with_private_key(pk)
        .on_url(rpc_url)
        .await?;
    let notary = Notary::new(contract_address, pod_provider);
    let timestamp = Timestamp::now() + Duration::from_secs(60);
    let document_hash = match document {
        Some(doc) => keccak256(doc),
        None => {
            let mut buffer = String::new();
            stdin().read_to_string(&mut buffer)?;
            keccak256(buffer)
        }
    };

    let pendix_tx = notary
        .timestamp(document_hash, U256::from(timestamp.as_micros()))
        .send()
        .await?;

    let receipt = pendix_tx.get_receipt().await?;
    anyhow::ensure!(receipt.status(), "timestamping failed");

    Ok((document_hash, timestamp.into()))
}

async fn get_timestamp(
    rpc_url: String,
    contract_address: Address,
    hash: String,
) -> Result<Option<SystemTime>> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .on_url(rpc_url)
        .await?;

    let notary = Notary::new(contract_address, pod_provider);

    let hash_bytes = hex::decode(hash.trim_start_matches("0x"))?;
    let hash = U256::try_from_be_slice(&hash_bytes).unwrap();
    let timestamp = notary.timestamps(hash.into()).call().await?._0;
    if timestamp.is_zero() {
        return Ok(None);
    }

    Ok(Some(decode_timestamp(timestamp)?))
}

fn decode_timestamp(timestamp: U256) -> Result<SystemTime> {
    let duration_since_epoch = Duration::from_micros(
        timestamp
            .try_into()
            .context("timestamp should fit in u64")?,
    );

    Ok(UNIX_EPOCH + duration_since_epoch)
}
