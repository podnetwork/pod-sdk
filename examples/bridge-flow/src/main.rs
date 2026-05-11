use std::time::Duration;

use crate::ERC20::ERC20Instance;
use alloy_network::{Ethereum, EthereumWallet, ReceiptResponse};
use alloy_primitives::{Address, B256, Bytes, U256};
use alloy_provider::{
    Identity, RootProvider,
    fillers::{
        BlobGasFiller, ChainIdFiller, FillProvider, GasFiller, JoinFill, NonceFiller, WalletFiller,
    },
};
use alloy_signer_local::PrivateKeySigner;
use alloy_sol_types::SolEvent;
use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use pod_protocol::bridge::Bridge::{self, BridgeInstance};
use pod_protocol::wrapped_token::WrappedToken::WrappedTokenInstance;
use pod_sdk::{
    Provider, ProviderBuilder,
    alloy_rpc_types::BlockNumberOrTag,
    network::PodNetwork,
    provider::{PodProvider, PodProviderBuilder},
};

alloy_sol_types::sol! {
    #[sol(rpc)]
    contract ERC20 {
        function balanceOf(address account) external view returns (uint256);
    }
}

type SourceChainProviderType = FillProvider<
    JoinFill<
        JoinFill<
            Identity,
            JoinFill<GasFiller, JoinFill<BlobGasFiller, JoinFill<NonceFiller, ChainIdFiller>>>,
        >,
        WalletFiller<EthereumWallet>,
    >,
    RootProvider,
    Ethereum,
>;

struct PodBridgeClient {
    provider: PodProvider,
    #[allow(dead_code)]
    pod_bridge: BridgeInstance<PodProvider, PodNetwork>,
    token_contract: ERC20Instance<PodProvider, PodNetwork>,
}

struct SourceChainBridgeClient {
    source_chain_contract: BridgeInstance<SourceChainProviderType>,
    source_chain_token_contract: WrappedTokenInstance<SourceChainProviderType, Ethereum>,
}

impl SourceChainBridgeClient {
    pub async fn new(
        source_chain_rpc_url: String,
        source_chain_contract_address: Address,
        source_chain_token_contract_address: Address,
        signer: PrivateKeySigner,
    ) -> Result<Self> {
        let wallet = EthereumWallet::from(signer);

        let source_chain_provider = ProviderBuilder::new()
            .wallet(wallet.clone())
            .connect(&source_chain_rpc_url)
            .await?;

        let source_chain_contract =
            BridgeInstance::new(source_chain_contract_address, source_chain_provider.clone());

        let source_chain_token_contract = WrappedTokenInstance::new(
            source_chain_token_contract_address,
            source_chain_provider.clone(),
        );

        Ok(Self {
            source_chain_contract,
            source_chain_token_contract,
        })
    }

    pub async fn deposit_token(&self, to: Address, amount: U256) -> Result<(B256, u64)> {
        let approve_receipt = self
            .source_chain_token_contract
            .approve(*self.source_chain_contract.address(), amount)
            .send()
            .await
            .context("sending approve tx to source chain")?
            .get_receipt()
            .await
            .context("getting receipt for approve tx")?;
        assert!(approve_receipt.status());

        let receipt = self
            .source_chain_contract
            .deposit(
                *self.source_chain_token_contract.address(),
                amount,
                to,
                Address::ZERO,
                U256::ZERO,
                Bytes::new(),
            )
            .send()
            .await
            .context("sending deposit tx to source chain")?
            .get_receipt()
            .await
            .context("getting receipt for deposit tx")?;

        assert!(receipt.status());

        for log in receipt.logs() {
            let Ok(deposit) = Bridge::Deposit::decode_log(&log.inner) else {
                continue;
            };
            let request_id = B256::from(deposit.data.id);
            let block_number = receipt.block_number();
            if let Some(block_number) = block_number {
                return Ok((request_id, block_number));
            }
        }

        Err(anyhow::anyhow!("Request ID not found"))
    }
}

impl PodBridgeClient {
    pub async fn new(
        pod_rpc_url: String,
        pod_bridge_contract_address: Address,
        pod_token_contract_address: Address,
        signer: PrivateKeySigner,
    ) -> Result<Self> {
        let wallet = EthereumWallet::from(signer);

        let pod_provider = PodProviderBuilder::with_recommended_settings()
            .wallet(wallet.clone())
            .on_url(pod_rpc_url)
            .await?;

        let pod_bridge = BridgeInstance::new(pod_bridge_contract_address, pod_provider.clone());

        let pod_token_contract =
            ERC20Instance::new(pod_token_contract_address, pod_provider.clone());

        Ok(Self {
            provider: pod_provider,
            pod_bridge,
            token_contract: pod_token_contract,
        })
    }
}

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[arg(long)]
    private_key: PrivateKeySigner,

    #[arg(long, env)]
    pod_rpc_url: String,

    #[arg(long, env)]
    source_chain_rpc_url: String,

    #[arg(long, env)]
    source_chain_bridge_contract_address: Address,

    #[arg(long, env)]
    pod_bridge_contract_address: Address,

    #[arg(long, env)]
    pod_token_contract_address: Address,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
#[allow(clippy::large_enum_variant)]
enum Commands {
    DepositTokenToPod {
        #[arg(long, env)]
        source_chain_token_contract_address: Address,
        #[arg(long)]
        amount: U256,
    },
    /// The unified Bridge contract has no `depositNative()`. To bridge native
    /// to pod, deposit a wrapped-native ERC20 (e.g. WETH) on the source chain;
    /// pod auto-claims it as native balance for the recipient.
    DepositNativeToPod {
        /// Address of the wrapped-native ERC20 (e.g. WETH) on the source chain.
        #[arg(long, env)]
        source_chain_wrapped_native_address: Address,
        #[arg(long)]
        amount: U256,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    println!(
        "Source chain bridge contract address: {}",
        cli.source_chain_bridge_contract_address
    );
    println!(
        "Pod bridge contract address: {}",
        cli.pod_bridge_contract_address
    );
    println!(
        "Pod token contract address: {}",
        cli.pod_token_contract_address
    );

    println!("Connecting to source chain on {}", cli.source_chain_rpc_url);
    println!("Connecting to pod on {}", cli.pod_rpc_url);

    let pod_bridge_client = PodBridgeClient::new(
        cli.pod_rpc_url,
        cli.pod_bridge_contract_address,
        cli.pod_token_contract_address,
        cli.private_key.clone(),
    )
    .await?;

    let to = cli.private_key.address();

    match cli.command {
        Commands::DepositTokenToPod {
            source_chain_token_contract_address,
            amount,
        } => {
            println!(
                "Depositing {amount} of token {source_chain_token_contract_address} to Pod account {to:?}"
            );

            let source_chain_bridge_client = SourceChainBridgeClient::new(
                cli.source_chain_rpc_url,
                cli.source_chain_bridge_contract_address,
                source_chain_token_contract_address,
                cli.private_key.clone(),
            )
            .await?;

            let new_balance = bridge_token_from_source_chain_to_pod(
                &source_chain_bridge_client,
                &pod_bridge_client,
                to,
                amount,
                Duration::from_secs(20 * 60), // block finalization can take minutes
            )
            .await?;
            println!("New Pod token balance: {new_balance}");
            Ok(())
        }
        Commands::DepositNativeToPod {
            source_chain_wrapped_native_address,
            amount,
        } => {
            println!("Depositing {amount} wrapped native to Pod account {to:?}");

            let source_chain_bridge_client = SourceChainBridgeClient::new(
                cli.source_chain_rpc_url,
                cli.source_chain_bridge_contract_address,
                source_chain_wrapped_native_address,
                cli.private_key.clone(),
            )
            .await?;

            let new_balance = bridge_native_from_source_chain_to_pod(
                &source_chain_bridge_client,
                &pod_bridge_client,
                to,
                amount,
                Duration::from_secs(20 * 60), // block finalization can take minutes
            )
            .await?;
            println!("New Pod native balance: {new_balance}");
            Ok(())
        }
    }
}

#[allow(dead_code)]
async fn wait_for_block<P: Provider>(provider: &P, block_number: u64) -> anyhow::Result<()> {
    println!("Waiting for block {block_number} to be built. This can take ~13min on Sepolia...");

    loop {
        if let Some(block) = provider
            .get_block_by_number(BlockNumberOrTag::Finalized)
            .await?
            && block.number() >= block_number
        {
            println!("Block {block_number} finalized");
            return Ok(());
        }
        tokio::time::sleep(Duration::from_secs(10)).await;
    }
}

async fn bridge_native_from_source_chain_to_pod(
    source_chain_bridge_client: &SourceChainBridgeClient,
    pod_bridge_client: &PodBridgeClient,
    to: Address,
    amount: U256,
    timeout: Duration,
) -> Result<U256> {
    let prev_balance_pod = pod_bridge_client.provider.get_balance(to).await?;

    let (request_id, source_chain_block_number) =
        source_chain_bridge_client.deposit_token(to, amount).await?;

    println!("Deposited; Request ID: {request_id}, Block Number: {source_chain_block_number}");

    let end_balance = tokio::time::timeout(timeout, async {
        loop {
            let pod_balance = pod_bridge_client.provider.get_balance(to).await?;
            if pod_balance > prev_balance_pod {
                return anyhow::Ok(pod_balance);
            }
            tokio::time::sleep(Duration::from_secs(2)).await;
        }
    })
    .await
    .context("waiting for deposited")??;

    Ok(end_balance)
}

async fn bridge_token_from_source_chain_to_pod(
    source_chain_bridge_client: &SourceChainBridgeClient,
    pod_bridge_client: &PodBridgeClient,
    to: Address,
    amount: U256,
    timeout: Duration,
) -> Result<U256> {
    let prev_balance_pod = pod_bridge_client
        .token_contract
        .balanceOf(to)
        .call()
        .await?;

    let (request_id, block_number) = source_chain_bridge_client.deposit_token(to, amount).await?;
    println!("Deposited; request ID: {request_id}, Block Number: {block_number}");
    println!("Waiting for confirmation on pod");

    let end_balance = tokio::time::timeout(timeout, async {
        loop {
            let pod_balance = pod_bridge_client
                .token_contract
                .balanceOf(to)
                .call()
                .await?;
            if pod_balance >= prev_balance_pod + amount {
                return anyhow::Ok(pod_balance);
            }
            tokio::time::sleep(Duration::from_secs(2)).await;
        }
    })
    .await
    .context("waiting for deposited")??;

    Ok(end_balance)
}
