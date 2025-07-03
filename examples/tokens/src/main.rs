use alloy::primitives::I256;
use alloy::sol_types::SolEvent;
use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use futures::StreamExt;
use pod_sdk::network::PodReceiptResponse;
use pod_sdk::{Address, provider::PodProviderBuilder};
use pod_types::rpc::filter::LogFilterBuilder;

alloy::sol!(
    #[sol(rpc)]
    "Tokens.sol"
);

/// Lightweight CLI tool for interacting with a fungible **Tokens** contract that follows the
/// standard `balanceOf`, `transfer`, and `Transfer`-event APIs. All calls are executed against a
/// Pod JSON-RPC node provided via the `--rpc-url` flag (defaults to `ws://localhost:8545`).
#[derive(Parser)]
#[command(author, version, about)]
struct Cli {
    /// Deployed address of the **Tokens** contract to interact with.
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
    /// Call `balanceOf(address)` to fetch the current token balance.
    GetBalance {
        /// Account whose balance you want to query.
        address: Address,
    },
    /// Call `transfer(to, amount)` to send tokens to another account.
    TransferToken {
        /// Amount of tokens to transfer (same decimals as on-chain).
        amount: I256,
        /// Recipient address that will receive the tokens.
        address: Address,
    },
    /// Subscribe to on-chain `Transfer` events emitted by the contract.
    Watch {
        /// When supplied, only show events whose **from** address matches this filter.
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
        Commands::TransferToken { amount, address } => {
            let receipt =
                transfer_token(cli.rpc_url, cli.contract_address, amount, address).await?;

            println!(
                "✅ Sent {} token(s) to {} — tx 0x{}",
                amount,
                address,
                hex::encode(receipt.transaction_hash.as_slice())
            );
        }
        Commands::GetBalance { address } => {
            let balance = address_balance(cli.rpc_url, cli.contract_address, address).await?;

            //        address | balance
            println!("ℹ️  Balance of {address}: {balance} token(s)");
        }
    }

    Ok(())
}

/// Stream `Transfer` events from the contract and render them in real-time.
async fn watch(
    rpc_url: String,
    contract_address: Address,
    submitter: Option<Address>,
) -> Result<()> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .on_url(rpc_url)
        .await?;

    // Build a log filter for `Transfer(address indexed from, address indexed to, uint256 value)`.
    let mut filter = LogFilterBuilder::new()
        .address(contract_address)
        .event_signature(Tokens::Transfer::SIGNATURE_HASH);
    if let Some(submitter) = submitter {
        filter = filter.topic2(submitter.into_word());
    }

    let mut stream = pod_provider
        .subscribe_verifiable_logs(&filter.build())
        .await?
        .into_stream();
    let committee = pod_provider.get_committee().await?;

    while let Some(log) = stream.next().await {
        if log.verify(&committee).is_err() {
            eprintln!("⚠️  Received an unverifiable event – ignoring");
            continue;
        }

        let event = Tokens::Transfer::decode_log(&log.inner.inner, true)
            .context("Failed to decode Transfer event – is the ABI up-to-date?")?;

        println!(
            "🔔 Transfer {} → {} : {} token(s)",
            event.from, event.to, event.value
        );
    }

    Ok(())
}

/// Wrapper for `balanceOf(address)`.
async fn address_balance(
    rpc_url: String,
    contract_address: Address,
    address: Address,
) -> Result<I256> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .on_url(&rpc_url)
        .await?;
    let tokens = Tokens::new(contract_address, pod_provider.clone());

    Ok(tokens.balanceOf(address).call().await?._0)
}

/// Wrapper for `transfer(to, amount)` that returns the transaction receipt.
async fn transfer_token(
    rpc_url: String,
    contract_address: Address,
    amount: I256,
    destination_address: Address,
) -> Result<PodReceiptResponse> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .on_url(&rpc_url)
        .await?;
    let tokens = Tokens::new(contract_address, pod_provider.clone());

    let pending_tx = tokens.transfer(destination_address, amount).send().await?;
    Ok(pending_tx.get_receipt().await?)
}
