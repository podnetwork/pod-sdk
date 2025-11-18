use std::{
    path::PathBuf,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use alloy::{
    consensus::{Signed, Transaction},
    eips::{BlockId, BlockNumberOrTag::Latest, Encodable2718},
    network::{TransactionBuilder, TxSigner},
};
use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use futures::StreamExt;
use op_alloy::{consensus::OpTxEnvelope, network::Optimism, rpc_types::OpTransactionRequest};
use pod_sdk::{
    Address, PrivateKeySigner, Provider, ProviderBuilder, Timestamp, U256, alloy_rpc_types::Block,
    auctions::client::AuctionClient, provider::PodProviderBuilder,
};
use tokio::{task::JoinHandle, time::timeout};

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    /// Address of the auction contract on pod
    #[arg(long, default_value = "0xedd0670497e00ded712a398563ea938a29dd28c7")]
    contract_address: Address,

    /// RPC URL for the Pod network
    #[arg(long, default_value = "wss://rpc.v2.pod.network")]
    pod_rpc_url: String,

    /// RPC URL for the Optimism network
    #[arg(long, default_value = "ws://localhost:8547")]
    rpc_url: String,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
#[allow(clippy::large_enum_variant)]
enum Commands {
    /// Bid a single transfer transaction on the Pod network
    BidTransfer {
        /// Amount to send
        #[arg(long, default_value_t = 1)]
        amount: u64,

        /// Address to send the transaction to.
        // Private key of the default one: 0xe1c4b604d0ff32147b478e5d2bcd04a4672bb36b71c7271503bc79f11fe7ffd6
        #[arg(long, default_value = "0x8d84a54F0038526422950137b119AdF02cCD6960")]
        to: Address,

        /// Funded private key for signing bid transactions on the pod network
        /// Will use `private_key` to sign both TXs with the same key if not provided.
        #[arg(long)]
        pod_private_key: Option<PrivateKeySigner>,

        /// Private key for account on the Optimism network to send funds from.
        #[arg(
            long,
            default_value = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
        )]
        private_key: PrivateKeySigner,
    },
    /// Bid a batch of transfer transactions on the Pod network, using the hardcoded set of private
    /// keys (for simplicity of testing).
    BidBatch {
        /// Amount to send
        #[arg(long, default_value_t = 1)]
        amount: u64,

        /// Address to send the transaction to.
        // Private key of the default one: 0xe1c4b604d0ff32147b478e5d2bcd04a4672bb36b71c7271503bc79f11fe7ffd6
        #[arg(long, default_value = "0x8d84a54F0038526422950137b119AdF02cCD6960")]
        to: Address,

        /// JSON file with keys to be used to bid TXs
        /// Will bid 1 TX per key.
        /// Keys need to be funded both on L2 and on pod.
        #[arg(long, default_value = "keys.json")]
        keys: PathBuf,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    println!("💡 Connecting to L2 node at {}", cli.rpc_url);
    println!("💡 Connecting to pod node at {}", cli.pod_rpc_url);
    let op_provider = Box::new(
        ProviderBuilder::new_with_network::<Optimism>()
            .connect(&cli.rpc_url)
            .await
            .with_context(|| format!("connecting to an Optimism provider @ {}", cli.rpc_url))?,
    );

    let (chain_id, latest_block, gas_price, estimated_gas) = tokio::try_join!(
        op_provider.get_chain_id(),
        op_provider.get_block(BlockId::Number(Latest)),
        op_provider.get_gas_price(),
        op_provider.estimate_gas(OpTransactionRequest::default())
    )?;

    let latest_block =
        latest_block.ok_or_else(|| anyhow::anyhow!("Failed to fetch the latest block"))?;
    let (deadline, block_number) = calculate_deadline_and_block_number(latest_block).await?;
    let auction_id = U256::from(Timestamp::from(deadline).as_micros());
    println!(
        "Bidding for block {block_number} with auction deadline {}",
        humantime::format_rfc3339_seconds(deadline)
    );

    let tx = OpTransactionRequest::default()
        .with_chain_id(chain_id)
        .gas_limit(estimated_gas)
        .max_fee_per_gas(gas_price);

    match cli.command {
        Commands::BidTransfer {
            amount,
            to,
            pod_private_key: pod_signer,
            private_key: op_signer,
        } => {
            let max_priority_fee = rand::random_range(0..gas_price / 5);
            let nonce = op_provider
                .get_transaction_count(op_signer.address())
                .await
                .context("Failed to get transaction count")?;
            let mut tx = tx
                .max_priority_fee_per_gas(max_priority_fee)
                .value(U256::from(amount))
                .to(to)
                .nonce(nonce)
                .build_typed_tx()
                .map_err(|e| anyhow::anyhow!("Failed to build transaction: {e:?}"))?;

            let signature = op_signer.sign_transaction(&mut tx).await?;
            let signed_tx: OpTxEnvelope = Signed::new_unhashed(tx, signature).into();
            let pod_signer = pod_signer.unwrap_or(op_signer.clone());

            let pod_provider = PodProviderBuilder::with_recommended_settings()
                .with_private_key(pod_signer.credential().clone())
                .on_url(&cli.pod_rpc_url)
                .await
                .with_context(|| format!("connecting to a Pod provider @ {}", cli.pod_rpc_url))?;
            let auction = AuctionClient::new(pod_provider, cli.contract_address);

            let receipt = auction
                .submit_bid(
                    auction_id,
                    deadline,
                    U256::from(max_priority_fee),
                    signed_tx.encoded_2718(),
                )
                .await
                .context("submitting TX bid on pod auction")?;

            println!(
                "[{}] TX {:#} from {:#} fee {max_priority_fee} (pod TX: https://explorer.v2.pod.network/tx/{} )",
                humantime::format_rfc3339_seconds(SystemTime::now()),
                signed_tx.tx_hash(),
                op_signer.address(),
                receipt.transaction_hash,
            );
        }
        Commands::BidBatch { amount, to, keys } => {
            let keys = std::fs::File::open(keys).context("Failed to read keys.json file")?;
            let private_keys: Vec<String> =
                serde_json::from_reader(&keys).context("Failed to parse keys.json")?;

            let mut pending_bid_txs = Vec::new();
            let tx = tx.value(U256::from(amount)).to(to);
            for private_key in private_keys {
                let op_signer: PrivateKeySigner = private_key.parse().unwrap();
                let op_signer_address = op_signer.address();
                let op_provider = op_provider.clone();
                let pod_rpc_url = cli.pod_rpc_url.clone();
                let tx = tx.clone();
                let max_priority_fee = rand::random_range(0..gas_price / 5);

                let pending_bid: JoinHandle<Result<()>> = tokio::spawn(async move {
                    let nonce = op_provider
                        .get_transaction_count(op_signer.address())
                        .await
                        .context("Failed to get transaction count")?;
                    let mut tx = tx
                        .max_priority_fee_per_gas(max_priority_fee)
                        .nonce(nonce)
                        .build_typed_tx()
                        .map_err(|e| anyhow::anyhow!("failed to build transaction: {e:?}"))?;

                    let signature = op_signer.sign_transaction(&mut tx).await?;
                    let signed_tx: OpTxEnvelope = Signed::new_unhashed(tx, signature).into();

                    let pod_provider = PodProviderBuilder::with_recommended_settings()
                        .with_private_key(op_signer.credential().clone())
                        .on_url(&pod_rpc_url)
                        .await
                        .with_context(|| format!("connecting to a Pod provider @ {pod_rpc_url}"))?;
                    let auction = AuctionClient::new(pod_provider, cli.contract_address);

                    let receipt = auction
                        .submit_bid(
                            auction_id,
                            deadline,
                            U256::from(max_priority_fee),
                            signed_tx.encoded_2718(),
                        )
                        .await
                        .context("submitting TX bid on pod auction")?;

                    println!(
                        "[{}] TX {:#} from {:#} fee {max_priority_fee} (pod TX: https://explorer.v2.pod.network/tx/{} )",
                        humantime::format_rfc3339_seconds(SystemTime::now()),
                        signed_tx.tx_hash(),
                        op_signer.address(),
                        receipt.transaction_hash,
                    );
                    Ok(())
                });
                pending_bid_txs.push((op_signer_address, pending_bid));
            }

            for (address, handle) in pending_bid_txs {
                if let Err(e) = handle.await? {
                    println!("Failed to submit TX bid for {address:#}: {e:?}");
                }
            }
        }
    }

    println!(
        "\n💡 View the auction at https://explorer.v2.pod.network/auctions/0x{auction_id:064x}/{}",
        Timestamp::from(deadline).as_micros(),
    );

    wait_for_block(&op_provider, block_number).await?;

    Ok(())
}

/// Calculate auction deadline and the corresponding block number.
/// Makes sure the deadline matches the block timestamp parity.
async fn calculate_deadline_and_block_number<T>(
    latest_block: Block<T>,
) -> anyhow::Result<(SystemTime, u64)> {
    let blocks_timestamp_even = (latest_block.header.timestamp % 2) == 0;

    let mut deadline = (SystemTime::now() + Duration::from_secs(5))
        .duration_since(std::time::UNIX_EPOCH)?
        .as_secs();
    if blocks_timestamp_even {
        deadline += deadline % 2;
    } else {
        deadline += 1 - (deadline % 2)
    }

    let block_timestamp = deadline + 2; // block is built 2s after the deadline
    let block_number =
        latest_block.header.number + (block_timestamp - latest_block.header.timestamp) / 2;
    Ok((UNIX_EPOCH + Duration::from_secs(deadline), block_number))
}

async fn wait_for_block<P: Provider<Optimism>>(
    op_provider: &P,
    block_number: u64,
) -> anyhow::Result<()> {
    println!("\nWaiting for block {block_number} to be built...");

    let mut blocks = op_provider.watch_full_blocks().await?.full().into_stream();
    timeout(Duration::from_secs(10), async move {
        while let Some(block) = blocks.next().await {
            let block = block.context("fetching L2 block")?;
            if block.header.number == block_number {
                println!(
                    "\n[{}]] Block {block_number} built. {} transactions:",
                    humantime::format_rfc3339_seconds(SystemTime::now()),
                    block.transactions.len(),
                );
                for tx in block.transactions.txns() {
                    let tx = &tx.inner.inner;
                    println!(
                        "TX {:#} from {:#} fee {}",
                        tx.tx_hash(),
                        tx.signer(),
                        tx.max_priority_fee_per_gas().unwrap_or_default()
                    );
                }
                return Ok(());
            }
        }
        Err(anyhow::anyhow!("failed waiting for block {block_number}"))
    })
    .await
    .context("timed out waiting for block")??;
    Ok(())
}
