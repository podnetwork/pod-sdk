use alloy::{primitives::ruint::aliases::U256, sol_types::SolEvent};
use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use futures::StreamExt;
use pod_sdk::{Address, provider::PodProviderBuilder};

use pod_sdk::network::PodReceiptResponse;
use pod_types::rpc::filter::{LogFilter, LogFilterBuilder};

alloy::sol!(
    #[sol(rpc)]
    "NFTs.sol"
);

/// Simple CLI for interacting with the NFTs contract.
#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    /// Deployed address of the NFTs contract.
    #[arg(long, default_value = "0x12296f2D128530a834460DF6c36a2895B793F26d")]
    contract_address: Address,

    /// Web-socket (WS) endpoint of the Pod JSON-RPC node.
    #[arg(long, default_value = "ws://localhost:8545")]
    rpc_url: String,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Mint a new NFT.
    Mint {
        /// Numeric identifier (tokenId) of the NFT to be minted.
        token_id: U256,

        /// Metadata URI that will be stored for the token.
        uri: String,
    },
    /// Query `tokenURI(tokenId)` for an existing NFT.
    GetTokenURI {
        /// Numeric identifier (tokenId) whose metadata URI you wish to fetch.
        token_id: U256,
    },
    /// Transfer an existing NFT to another address.
    TransferToken {
        /// Numeric identifier (tokenId) of the NFT to transfer.
        token_id: U256,
        /// Recipient account that will receive the token.
        address: Address,
        /// Token sequence
        sequence: U256,
    },
    /// Stream all `Minted` events emitted by the contract.
    Watch {
        /// Only show events where *owner* equals this address.
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
        Commands::Mint { token_id, uri } => {
            let receipt = mint(cli.rpc_url, cli.contract_address, token_id, uri).await?;

            // Print a short success message with the tokenId and the transaction hash.
            println!(
                "✅ Minted token {} in tx 0x{}",
                token_id,
                hex::encode(receipt.transaction_hash.as_slice())
            );
        }
        Commands::TransferToken {
            token_id,
            address,
            sequence,
        } => {
            let receipt = transfer_token(
                cli.rpc_url,
                cli.contract_address,
                token_id,
                address,
                sequence,
            )
            .await?;

            println!(
                "✅ Transferred token {} to {} in tx 0x{}",
                token_id,
                address,
                hex::encode(receipt.transaction_hash.as_slice())
            );
        }
        Commands::GetTokenURI { token_id } => {
            let uri = token_uri(cli.rpc_url, cli.contract_address, token_id).await?;

            println!("ℹ️  tokenURI({}) → {}", token_id, uri);
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

    let mut filter = LogFilterBuilder::new()
        .address(contract_address)
        .event_signature(NFTs::Minted::SIGNATURE_HASH);
    if let Some(submitter) = submitter {
        filter = filter.topic2(submitter.into_word());
    }

    let mut stream = pod_provider
        .subscribe_verifiable_logs(&filter.build())
        .await?
        .into_stream();

    let committee = pod_provider.get_committee().await?;

    while let Some(log) = stream.next().await {
        if !log.verify(&committee)? {
            eprintln!("⚠️  received an invalid event");
            continue;
        }

        let event = NFTs::Minted::decode_log(&log.inner.inner, true)
            .context("decoding event failed – the deployed contract interface may differ")?;

        println!(
            "📝 Owner {} minted token {} (uri: {})",
            event.owner, event.tokenId, event.uri
        );
    }

    Ok(())
}

async fn mint(
    rpc_url: String,
    contract_address: Address,
    token_id: U256,
    uri: String,
) -> Result<PodReceiptResponse> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .on_url(&rpc_url)
        .await?;
    let nfts = NFTs::new(contract_address, pod_provider.clone());

    let pending_tx = nfts.mint(token_id, uri).send().await?;

    Ok(pending_tx.get_receipt().await?)
}

async fn token_uri(rpc_url: String, contract_address: Address, token_id: U256) -> Result<String> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .on_url(&rpc_url)
        .await?;
    let nfts = NFTs::new(contract_address, pod_provider.clone());

    Ok(nfts.tokenURI(token_id).call().await?._0)
}

async fn transfer_token(
    rpc_url: String,
    contract_address: Address,
    token_id: U256,
    destination_address: Address,
    sequence: U256,
) -> Result<PodReceiptResponse> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .on_url(&rpc_url)
        .await?;
    let nfts = NFTs::new(contract_address, pod_provider.clone());

    let pending_tx = nfts
        .safeTransfer_0(token_id, destination_address, sequence)
        .send()
        .await?;
    Ok(pending_tx.get_receipt().await?)
}
