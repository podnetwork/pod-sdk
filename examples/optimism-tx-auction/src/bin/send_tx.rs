use std::time::{Duration, SystemTime, UNIX_EPOCH};

use alloy::{
    consensus::{Signed, TxEip1559},
    eips::{BlockId, BlockNumberOrTag::Latest, Encodable2718},
    network::TxSigner,
    primitives::TxKind,
};
use anyhow::{Context, ensure};
use clap::Parser;
use op_alloy::{consensus::OpTxEnvelope, network::Optimism, rpc_types::OpTransactionRequest};
use optimism_tx_auction::bindings;
use pod_sdk::{
    Address, PrivateKeySigner, Provider, ProviderBuilder, U256, alloy_rpc_types::Block,
    provider::PodProviderBuilder,
};

// some funded keys on the builder playground network for testing
const DEFAULT_PRV_KEYS: [&str; 10] = [
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
    "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
    "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
    "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
    "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
];

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    /// Address of the auction contract on pod
    #[arg(long, env)]
    contract_address: Address,

    /// Funded private key for signing bid transactions on the pod network
    #[arg(long, env)]
    pod_private_key: PrivateKeySigner,

    /// Private key for account on the Optimism network to send funds from.
    #[arg(long, env, default_value = DEFAULT_PRV_KEYS[1])]
    private_key: PrivateKeySigner,

    /// RPC URL for the Pod network
    #[arg(long, env, default_value = "ws://localhost:18545")]
    pod_rpc_url: String,

    /// RPC URL for the Optimism network
    #[arg(long, env, default_value = "ws://localhost:8547")]
    rpc_url: String,

    /// Amount to send
    #[arg(long, env, default_value_t = 1)]
    amount: u64,

    /// Address to send the transaction to.
    // Private key of the default one: 0xe1c4b604d0ff32147b478e5d2bcd04a4672bb36b71c7271503bc79f11fe7ffd6
    #[arg(
        long,
        env,
        default_value = "0x8d84a54F0038526422950137b119AdF02cCD6960"
    )]
    to: Address,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    let op_signer = cli.private_key;
    let op_provider = Box::new(
        ProviderBuilder::new_with_network::<Optimism>()
            .with_call_batching()
            .connect(&cli.rpc_url)
            .await
            .with_context(|| format!("connecting to an Optimism provider @ {}", cli.rpc_url))?,
    );

    let (chain_id, latest_block, nonce, gas_price, estimated_gas) = tokio::try_join!(
        op_provider.get_chain_id(),
        op_provider.get_block(BlockId::Number(Latest)),
        op_provider.get_transaction_count(op_signer.address()),
        op_provider.get_gas_price(),
        op_provider.estimate_gas(OpTransactionRequest::default())
    )?;
    let latest_block =
        latest_block.ok_or_else(|| anyhow::anyhow!("Failed to fetch the latest block"))?;

    let (deadline, block_number) = calculate_deadline_and_block_number(latest_block).await?;

    let max_priority_fee = rand::random_range(0..gas_price / 5);

    let mut tx = TxEip1559 {
        chain_id,
        nonce,
        max_fee_per_gas: gas_price,
        max_priority_fee_per_gas: max_priority_fee,
        gas_limit: estimated_gas,
        to: TxKind::Call(cli.to),
        value: U256::from(cli.amount),
        ..Default::default()
    };

    let signature = op_signer.sign_transaction(&mut tx).await?;
    let signed_tx: OpTxEnvelope = Signed::new_unhashed(tx, signature).into();
    let enc = signed_tx.encoded_2718();

    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .with_private_key(cli.pod_private_key.credential().clone())
        .on_url(&cli.pod_rpc_url)
        .await
        .with_context(|| format!("connecting to a Pod provider @ {}", cli.pod_rpc_url))?;
    let auction = bindings::Auction::AuctionInstance::new(cli.contract_address, pod_provider);

    let pending_tx = auction
        .submitBid(U256::from(deadline), max_priority_fee, enc.into())
        .max_priority_fee_per_gas(0)
        .send()
        .await
        .context("sending TX to pod")?;
    let receipt = pending_tx.get_receipt().await?;
    ensure!(receipt.status(), "Failed to submit TX bid on pod");
    println!(
        "[{block_number} @ {}] TX {:#} from {:#} fee {max_priority_fee} (pod TX: https://explorer.v2.pod.network/tx/{} )",
        humantime::format_rfc3339_seconds(UNIX_EPOCH + Duration::from_secs(deadline)),
        signed_tx.tx_hash(),
        op_signer.address(),
        receipt.transaction_hash,
    );

    Ok(())
}

/// Calculate auction deadline and the corresponding block number.
/// Makes sure the deadline matches the block timestamp parity.
async fn calculate_deadline_and_block_number<T>(
    latest_block: Block<T>,
) -> anyhow::Result<(u64, u64)> {
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
    Ok((deadline, block_number))
}
