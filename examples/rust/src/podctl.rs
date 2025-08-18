//! A minimal sample CLI for the Pod SDK demonstrating four commands:
//!   - balance:  read balance (wei) of an address
//!   - transfer: send value using the ENV wallet
//!   - committee: print the current committee
//!   - logs: tail verifiable logs (requires WS RPC; optionally verify)
//!
//! Run from `examples/rust/`:
//!   export POD_RPC_URL=https://rpc.v2.pod.network
//!   # POD_PRIVATE_KEY only needed for `transfer`
//!
//!   cargo run --bin podctl -- --help
//!   cargo run --bin podctl -- balance 0x<address>
//!   cargo run --bin podctl -- committee
//!   cargo run --bin podctl -- transfer --to 0x<recipient> --amount 1000
//!   export POD_RPC_URL=wss://<your-ws-endpoint>   # required for logs
//!   cargo run --bin podctl -- logs --address 0x<contract> --limit 3

use std::str::FromStr;

use anyhow::{Result, anyhow};
use clap::{Parser, Subcommand};
use futures::StreamExt;

use pod_sdk::{
    Address, LogFilterBuilder, Provider, U256, alloy_primitives::FixedBytes,
    provider::PodProviderBuilder,
};

#[derive(Parser)]
#[command(name = "podctl", version, about = "Pod Network sample CLI")]
struct Cli {
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// Print balance (wei) of an address
    Balance { address: String },

    /// Transfer from ENV wallet to a recipient
    Transfer {
        /// Recipient address (0x + 40 hex)
        #[arg(long)]
        to: String,
        /// Amount in wei (decimal string, e.g. 1000)
        #[arg(long)]
        amount: String,
    },

    /// Show current committee
    Committee {
        /// Print as JSON (default: true)
        #[arg(long, default_value_t = true)]
        json: bool,
    },

    /// Tail verifiable logs (requires WS RPC; optionally verify with committee)
    Logs {
        /// Contract address (0x + 40 hex)
        #[arg(long)]
        address: String,
        /// topic0 (keccak256 signature, 0x + 64 hex), optional
        #[arg(long)]
        topic0: Option<String>,
        /// Verify each log against current committee
        #[arg(long, default_value_t = false)]
        verify: bool,
        /// Print at most N logs (0 = infinite stream)
        #[arg(long, default_value_t = 0)]
        limit: usize,
    },
}

/// Helper: strict address parsing with a friendly error.
fn parse_address(s: &str) -> Result<Address> {
    Address::from_str(s).map_err(|_| anyhow!("Invalid address `{s}`. Expected: 0x + 40 hex chars."))
}

#[tokio::main]
async fn main() -> Result<()> {
    // Parse CLI FIRST so `--help` exits before any env-required setup.
    let cli = Cli::parse();

    match cli.cmd {
        // --------------------------
        // podctl balance <address>
        // --------------------------
        Cmd::Balance { address } => {
            // Read-only provider: only needs POD_RPC_URL
            let rpc_url = std::env::var("POD_RPC_URL")
                .unwrap_or_else(|_| "http://127.0.0.1:8545".to_string());
            let provider = PodProviderBuilder::with_recommended_settings()
                .on_url(&rpc_url)
                .await
                .map_err(|e| anyhow!("provider error: {e:?}"))?;

            let addr = parse_address(&address)?;
            let wei = provider.get_balance(addr).await?;
            println!("{wei}");
        }

        // -----------------------------------------------------
        // podctl transfer --to <address> --amount <amount_wei>
        // -----------------------------------------------------
        Cmd::Transfer { to, amount } => {
            // Signing provider: requires POD_PRIVATE_KEY in ENV
            let provider = PodProviderBuilder::with_recommended_settings()
                .from_env()
                .await
                .map_err(|e| anyhow!("wallet/provider error: {e:?}"))?;

            let to = parse_address(&to)?;
            let amt = U256::from_str(&amount)
                .map_err(|_| anyhow!("Invalid amount `{amount}`. Use a decimal integer (wei)."))?;

            let receipt = provider
                .transfer(to, amt)
                .await
                .map_err(|e| anyhow!("transfer error: {e:?}"))?;

            println!("{}", serde_json::to_string_pretty(&receipt)?);
        }

        // -------------------------
        // podctl committee [--json]
        // -------------------------
        Cmd::Committee { json } => {
            // Read-only provider: only needs POD_RPC_URL
            let rpc_url = std::env::var("POD_RPC_URL")
                .unwrap_or_else(|_| "http://127.0.0.1:8545".to_string());
            let provider = PodProviderBuilder::with_recommended_settings()
                .on_url(&rpc_url)
                .await
                .map_err(|e| anyhow!("provider error: {e:?}"))?;

            let committee = provider.get_committee().await?;
            if json {
                println!("{}", serde_json::to_string_pretty(&committee)?);
            } else {
                println!("{committee:#?}");
            }
        }

        // ----------------------------------------------------------------
        // podctl logs --address 0x<contract> [--topic0 0x<64hex>] [--verify]
        // ----------------------------------------------------------------
        Cmd::Logs {
            address,
            topic0,
            verify,
            limit,
        } => {
            // Require WebSocket RPC for subscriptions; bail early on HTTP.
            let rpc_url = std::env::var("POD_RPC_URL").unwrap_or_default();
            let is_ws = rpc_url.starts_with("ws://") || rpc_url.starts_with("wss://");
            if !is_ws {
                eprintln!(
                    "logs: WebSocket RPC required (ws:// or wss://). \
Current POD_RPC_URL='{rpc_url}'. Use balance/committee/transfer with HTTP, \
or switch to a WS endpoint to use logs."
                );
                return Ok(());
            }

            // Read-only provider over the given WS URL
            let provider = PodProviderBuilder::with_recommended_settings()
                .on_url(&rpc_url)
                .await
                .map_err(|e| anyhow!("provider error: {e:?}"))?;

            // Validate address (should be a contract that emits events)
            let addr = parse_address(&address)?;

            // Build filter
            let mut builder = LogFilterBuilder::new().address(addr).min_attestations(1);

            if let Some(t0) = topic0 {
                let t0_trim = t0.trim();
                let sig: FixedBytes<32> = t0_trim
                    .parse()
                    .map_err(|_| anyhow!("Invalid topic0 `{t0_trim}`. Expected 0x + 64 hex."))?;
                builder = builder.event_signature(sig);
            }

            if limit > 0 {
                builder = builder.limit(limit);
            }

            let filter = builder.build();

            // Optionally fetch committee for verification
            let maybe_committee = if verify {
                Some(provider.get_committee().await?)
            } else {
                None
            };

            // Subscribe and stream
            let sub = provider
                .subscribe_verifiable_logs(&filter)
                .await
                .map_err(|e| anyhow!("subscribe error: {e:?}"))?;
            let mut stream = sub.into_stream();

            let mut count = 0usize;
            while let Some(log) = stream.next().await {
                if let Some(c) = &maybe_committee {
                    let verified = log.verify(c).is_ok(); // Result<(), E> -> bool
                    println!("verified={verified} log={log:#?}");
                } else {
                    println!("{log:#?}");
                }

                if limit > 0 {
                    count += 1;
                    if count >= limit {
                        break;
                    }
                }
            }
        }
    }

    Ok(())
}
