use std::time::{Duration, SystemTime};

use alloy::{
    consensus::Signed,
    eips::{BlockId, BlockNumberOrTag::Latest, Encodable2718},
    network::TxSigner,
};
use anyhow::{Context, ensure};
use clap::Parser;
use op_alloy::{consensus::OpTxEnvelope, network::Optimism, rpc_types::OpTransactionRequest};
use optimism_tx_auction::bindings;
use pod_sdk::{
    Address, EthereumWallet, PrivateKeySigner, Provider, ProviderBuilder, TxLegacy, U256,
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

const CHAIN_ID: u64 = 13;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    /// Address of the auction contract on pod
    #[arg(
        long,
        env,
        default_value = "0x12296f2D128530a834460DF6c36a2895B793F26d"
    )]
    contract_address: Address,

    /// Funded private key for signing bid transactions on the pod network
    #[arg(
        long,
        env,
        default_value = "0x6df79891f22b0f3c9e9fb53b966a8861fd6fef69f99772c5c4dbcf303f10d901"
    )]
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

    /// Deadline for the bid in seconds since UNIX epoch.
    /// Must match the block timestamp parity (even/odd).
    /// If not provided, defaults to 5 seconds from now.
    #[arg(long, env)]
    deadline: Option<u64>,

    /// Bid amount in wei.
    #[arg(long, env, default_value_t = 100)]
    bid: u64,

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
            .wallet(EthereumWallet::new(op_signer.clone()))
            .connect(&cli.rpc_url)
            .await
            .with_context(|| format!("connecting to an Optimism provider @ {}", cli.rpc_url))?,
    );

    let (deadline, block_number) =
        calculate_deadline_and_block_number(op_provider.clone(), cli.deadline).await?;

    let nonce = op_provider
        .get_transaction_count(op_signer.address())
        .await
        .context("getting nonce")?;
    let gas_price = op_provider.get_gas_price().await.unwrap();
    let estimated_gas = op_provider
        .estimate_gas(OpTransactionRequest::default())
        .await
        .context("estimating gas")?;

    let mut tx = TxLegacy {
        chain_id: Some(CHAIN_ID),
        nonce,
        gas_price,
        gas_limit: estimated_gas,
        to: pod_sdk::TxKind::Call(cli.to),
        value: U256::from(cli.amount),
        ..Default::default()
    };

    let signature = op_signer.sign_transaction(&mut tx).await?;
    let signed_tx = Signed::new_unhashed(tx, signature);
    let signed_tx: OpTxEnvelope = signed_tx.into();
    let enc = signed_tx.encoded_2718();

    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .with_private_key(cli.pod_private_key.credential().clone())
        .on_url(&cli.pod_rpc_url)
        .await
        .with_context(|| format!("connecting to a Pod provider @ {}", cli.pod_rpc_url))?;
    let auction = bindings::Auction::AuctionInstance::new(cli.contract_address, pod_provider);

    println!(
        "Bidding TX {:#} for block {} sending {} from {:#} to {:#} with deadline: {deadline} and bid {}",
        signed_tx.tx_hash(),
        block_number,
        cli.amount,
        op_signer.address(),
        cli.to,
        cli.bid,
    );

    let pending_tx = auction
        .submitBid(U256::from(deadline), U256::from(cli.bid), enc.into())
        .send()
        .await
        .context("sending TX to pod")?;
    let receipt = pending_tx.get_receipt().await?;
    ensure!(receipt.status(), "Failed to submit TX bid on pod");
    Ok(())
}

/// Calculate auction deadline and the corresponding block number.
/// Makes sure the deadline matches the block timestamp parity.
async fn calculate_deadline_and_block_number(
    provider: Box<dyn Provider<Optimism>>,
    user_deadline: Option<u64>,
) -> anyhow::Result<(u64, u64)> {
    let latest_block = provider
        .get_block(BlockId::Number(Latest))
        .await?
        .expect("there should be a latest block");

    let blocks_timestamp_even = (latest_block.header.timestamp % 2) == 0;

    let deadline = match user_deadline {
        Some(deadline) => {
            ensure!(
                deadline >= latest_block.header.timestamp + 2,
                "Deadline must be in the future."
            );
            let tt = if blocks_timestamp_even { "even" } else { "odd" };
            ensure!(
                blocks_timestamp_even == (deadline % 2 == 0),
                "Blocks are produced at {tt} timestamps - deadline must be {tt}.",
            );
            deadline
        }
        None => {
            let deadline = (SystemTime::now() + Duration::from_secs(5))
                .duration_since(std::time::UNIX_EPOCH)?
                .as_secs();
            if blocks_timestamp_even {
                deadline + (deadline % 2)
            } else {
                deadline + (1 - (deadline % 2))
            }
        }
    };

    let block_timestamp = deadline + 2; // block is built 2s after the deadline
    let block_number =
        latest_block.header.number + (block_timestamp - latest_block.header.timestamp) / 2;
    Ok((deadline, block_number))
}
