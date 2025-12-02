use std::{str::FromStr, thread::sleep, time::Duration};

use crate::{
    BridgeMintBurn::{BridgeMintBurnInstance, DepositNative},
    ERC20::ERC20Instance,
};
use alloy_network::{Ethereum, EthereumWallet, ReceiptResponse};
use alloy_primitives::{Address, B256, U256};
use alloy_provider::{
    Identity, RootProvider,
    fillers::{
        BlobGasFiller, ChainIdFiller, FillProvider, GasFiller, JoinFill, NonceFiller, WalletFiller,
    },
};
use alloy_signer_local::PrivateKeySigner;
use alloy_sol_types::SolEvent;
use anyhow::{Context, Result};
use clap::{Parser, Subcommand, arg};
use pod_protocol::bridge_deposit_withdraw::{
    BridgeDepositWithdraw,
    MerkleTree::Proof,
    PodECDSA::{
        Certificate as BridgeCertificate, CertifiedLog, CertifiedReceipt, Log as BridgeLog,
    },
};
use pod_protocol::{
    bridge_deposit_withdraw::BridgeDepositWithdraw::BridgeDepositWithdrawInstance,
    wrapped_token::WrappedToken::WrappedTokenInstance,
};
use pod_sdk::{
    Provider, ProviderBuilder,
    alloy_rpc_types::BlockNumberOrTag,
    network::PodNetwork,
    provider::{PodProvider, PodProviderBuilder},
};
use pod_types::{Hashable, ledger::log::VerifiableLog, rpc::filter::LogFilterBuilder};

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

alloy_sol_types::sol! {
    #[sol(rpc)]
    contract ERC20 {
        function getBalance() external returns (uint256);
    }

    #[sol(rpc)]
    contract BridgeMintBurn {
        event Deposit(bytes32 indexed id, address indexed token, uint256 amount);
        event DepositNative(bytes32 indexed id, uint256 amount);

        function deposit(address token, uint256 amount) external;
        function depositNative() external payable;
    }
}

struct PodBridgeClient {
    provider: PodProvider,
    pod_bridge: BridgeMintBurnInstance<PodProvider, PodNetwork>,
    token_contract: ERC20Instance<PodProvider, PodNetwork>,
}

struct SourceChainBridgeClient {
    provider: SourceChainProviderType,
    source_chain_contract: BridgeDepositWithdrawInstance<SourceChainProviderType>,
    source_chain_token_contract: WrappedTokenInstance<SourceChainProviderType, Ethereum>,
}

fn get_certified_log(log: &VerifiableLog) -> Result<CertifiedLog> {
    let proof = log.generate_proof().unwrap();
    let leaf = log.get_leaf();

    Ok(CertifiedLog {
        log: BridgeLog {
            addr: log.inner.address(),
            topics: log.inner.topics().to_vec(),
            data: log.inner.data().data.clone(),
        },
        logIndex: U256::from(log.inner.log_index.unwrap()),
        certificate: BridgeCertificate {
            certifiedReceipt: CertifiedReceipt {
                receiptRoot: log.pod_metadata.receipt.hash_custom(),
                aggregateSignature: log.aggregate_signatures().into(),
                sortedAttestationTimestamps: log.get_sorted_attestation_timestamps_in_seconds(),
            },
            leaf,
            proof: Proof { path: proof.path },
        },
    })
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

        let source_chain_contract = BridgeDepositWithdrawInstance::new(
            source_chain_contract_address,
            source_chain_provider.clone(),
        );

        let source_chain_token_contract = WrappedTokenInstance::new(
            source_chain_token_contract_address,
            source_chain_provider.clone(),
        );

        Ok(Self {
            provider: source_chain_provider,
            source_chain_contract,
            source_chain_token_contract,
        })
    }

    pub fn token_address(&self) -> &Address {
        self.source_chain_token_contract.address()
    }

    pub async fn deposit_native(&self, to: Address, value: U256) -> Result<(U256, u64)> {
        let tx = self
            .source_chain_contract
            .depositNative(to)
            .max_fee_per_gas(1_000_000_000u128)
            .max_priority_fee_per_gas(1)
            .value(value)
            .send()
            .await?;

        let receipt = tx.get_receipt().await?;
        assert!(&receipt.status());
        assert!(receipt.logs().len() == 1);

        for log in receipt.logs() {
            let Ok(deposit) = BridgeDepositWithdraw::DepositNative::decode_log(&log.inner) else {
                continue;
            };
            let request_id = deposit.data.id;
            let block_number = receipt.block_number();
            if let Some(block_number) = block_number {
                return Ok((request_id, block_number));
            }
        }

        Err(anyhow::anyhow!("Request ID not found"))
    }

    pub async fn deposit_token(&self, to: Address, amount: U256) -> Result<(U256, u64)> {
        let receipt = self
            .source_chain_contract
            .deposit(*self.source_chain_token_contract.address(), amount, to)
            .send()
            .await
            .context("sending deposit tx to source chain")?
            .get_receipt()
            .await
            .context("getting receipt for deposit tx")?;

        assert!(receipt.status());
        assert!(receipt.logs().len() == 2);

        for log in receipt.logs() {
            let Ok(deposit) = BridgeDepositWithdraw::Deposit::decode_log(&log.inner) else {
                continue;
            };
            let request_id = deposit.data.id;
            let block_number = receipt.block_number();
            if let Some(block_number) = block_number {
                return Ok((request_id, block_number));
            }
        }

        Err(anyhow::anyhow!("Request ID not found"))
    }

    pub async fn claim_token(&self, certified_log: CertifiedLog) -> Result<()> {
        let tx = self
            .source_chain_contract
            .claim(certified_log)
            .send()
            .await?;

        sleep(Duration::from_millis(100));

        let receipt = self
            .provider
            .get_transaction_receipt(*tx.tx_hash())
            .await?
            .unwrap();

        assert!(receipt.status());
        assert!(receipt.logs().len() == 2);

        println!("Successfully claimed token from source chain");

        Ok(())
    }

    pub async fn claim_native(&self, certified_log: CertifiedLog) -> Result<()> {
        let tx = self
            .source_chain_contract
            .claimNative(certified_log)
            .send()
            .await?;

        let receipt = tx.get_receipt().await?;

        assert!(receipt.status());
        assert!(receipt.logs().len() == 1);

        println!("Successfully claimed native from source chain",);

        Ok(())
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

        let pod_bridge =
            BridgeMintBurnInstance::new(pod_bridge_contract_address, pod_provider.clone());

        let pod_token_contract =
            ERC20Instance::new(pod_token_contract_address, pod_provider.clone());

        Ok(Self {
            provider: pod_provider,
            pod_bridge,
            token_contract: pod_token_contract,
        })
    }

    pub async fn deposit_native(&self, to: Address, value: U256) -> Result<B256> {
        let tx = self
            .pod_bridge
            .depositNative()
            .value(value)
            .send()
            .await
            .unwrap();

        let receipt = tx.get_receipt().await?;

        assert!(receipt.status());
        assert!(receipt.receipt.logs().len() == 2);

        println!("Successfully deposited {value} native to address: {to}");

        for log in receipt.logs() {
            let Ok(deposit) = BridgeMintBurn::DepositNative::decode_log(&log.inner) else {
                continue;
            };
            return Ok(deposit.data.id);
        }
        Err(anyhow::anyhow!("Request ID not found"))
    }

    async fn deposit_token(&self, amount: U256) -> Result<B256> {
        let tx = self
            .pod_bridge
            .deposit(*self.token_contract.address(), amount)
            .max_fee_per_gas(1_000_000_000u128)
            .max_priority_fee_per_gas(0)
            .send()
            .await
            .unwrap();

        let receipt = tx.get_receipt().await?;

        assert!(receipt.status());
        assert!(receipt.logs().len() == 2);

        for log in receipt.logs() {
            let Ok(deposit) = BridgeMintBurn::Deposit::decode_log(&log.inner) else {
                continue;
            };
            return Ok(deposit.data.id);
        }
        Err(anyhow::anyhow!("Request ID not found"))
    }

    pub async fn get_deposit_native_certified_log(&self, request_id: B256) -> Result<CertifiedLog> {
        let filter = LogFilterBuilder::new()
            .address(Address::from(self.pod_bridge.address().0))
            .event_signature(DepositNative::SIGNATURE_HASH)
            .topic1(request_id)
            .build();

        sleep(Duration::from_millis(200));

        let logs = self.provider.get_verifiable_logs(&filter).await?;

        assert_eq!(logs.len(), 1);
        let log = &logs[0];

        let certified_log = get_certified_log(log)?;

        println!("Generated certified log for request id: {request_id}");

        Ok(certified_log)
    }

    pub async fn get_deposit_token_certified_log(
        &self,
        request_id: B256,
        token_address: Address,
    ) -> Result<CertifiedLog> {
        let token_address_filter = U256::from_str(&token_address.to_string())?;
        let filter = LogFilterBuilder::new()
            .address(Address::from(self.pod_bridge.address().0))
            .event_signature(BridgeMintBurn::Deposit::SIGNATURE_HASH)
            .topic1(request_id)
            .topic2(token_address_filter)
            .build();

        sleep(Duration::from_millis(200));

        let logs = self.provider.get_verifiable_logs(&filter).await?;

        assert_eq!(logs.len(), 1);
        let log = &logs[0];

        let certified_log = get_certified_log(log)?;

        println!("Generated certified log for request id: {request_id}");

        Ok(certified_log)
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
    DepositNativeToPod {
        #[arg(long)]
        amount: U256,
    },
    TransferNativeFromPod {
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
        Commands::DepositNativeToPod { amount } => {
            println!("Depositing {amount} native to Pod account {to:?}");

            let source_chain_bridge_client = SourceChainBridgeClient::new(
                cli.source_chain_rpc_url,
                cli.source_chain_bridge_contract_address,
                Address::ZERO,
                cli.private_key.clone(),
            )
            .await?;

            let new_balance = bridge_native_from_source_chain_to_pod(
                &source_chain_bridge_client,
                &pod_bridge_client,
                to,
                amount,
                Duration::from_mins(20), // block finalization can take minutes
            )
            .await?;
            println!("New Pod native balance: {new_balance}");
            Ok(())
        }
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
                Duration::from_mins(20), // block finalization can take minutes
            )
            .await?;
            println!("New Pod token balance: {new_balance}");
            Ok(())
        }
        Commands::TransferNativeFromPod { amount } => {
            println!("Transferring {amount} native from Pod to source chain account {to:?}");
            let source_chain_bridge_client = SourceChainBridgeClient::new(
                cli.source_chain_rpc_url,
                cli.source_chain_bridge_contract_address,
                Address::ZERO,
                cli.private_key.clone(),
            )
            .await?;
            bridge_native_from_pod_to_source_chain(
                &pod_bridge_client,
                &source_chain_bridge_client,
                to,
                amount,
            )
            .await
        }
    }
}

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

    let (request_id, source_chain_block_number) = source_chain_bridge_client
        .deposit_native(to, amount)
        .await?;

    println!("Deposited; Request ID: {request_id}, Block Number: {source_chain_block_number}");

    let end_balance = tokio::time::timeout(timeout, async {
        loop {
            let pod_balance = pod_bridge_client.provider.get_balance(to).await?;
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

async fn bridge_native_from_pod_to_source_chain(
    pod_bridge_client: &PodBridgeClient,
    source_chain_bridge_client: &SourceChainBridgeClient,
    to: Address,
    value: U256,
) -> Result<()> {
    let prev_balance_pod = pod_bridge_client.provider.get_balance(to).await?;
    let prev_balance_source = source_chain_bridge_client.provider.get_balance(to).await?;

    let request_id = pod_bridge_client.deposit_native(to, value).await?;

    let certified_log = pod_bridge_client
        .get_deposit_native_certified_log(request_id)
        .await?;

    source_chain_bridge_client
        .claim_native(certified_log)
        .await?;

    assert!(pod_bridge_client.provider.get_balance(to).await? < prev_balance_pod);
    assert!(source_chain_bridge_client.provider.get_balance(to).await? > prev_balance_source);

    Ok(())
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
        .getBalance()
        .from(to)
        .call()
        .await?;

    let (request_id, block_number) = source_chain_bridge_client.deposit_token(to, amount).await?;
    println!("Deposited; request ID: {request_id}, Block Number: {block_number}");
    println!("Waiting for confirmation on pod");

    let end_balance = tokio::time::timeout(timeout, async {
        loop {
            let pod_balance = pod_bridge_client
                .token_contract
                .getBalance()
                .from(to)
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

async fn bridge_token_from_pod_to_source_chain(
    pod_bridge_client: &PodBridgeClient,
    source_chain_bridge_client: &SourceChainBridgeClient,
    amount: U256,
    to: Address,
) -> Result<()> {
    let prev_balance_pod = pod_bridge_client.token_contract.getBalance().call().await?;
    let prev_balance_source = source_chain_bridge_client
        .source_chain_token_contract
        .balanceOf(to)
        .call()
        .await?;

    let request_id = pod_bridge_client.deposit_token(amount).await?;
    let token_address = pod_bridge_client.token_contract.address();

    let certified_log = pod_bridge_client
        .get_deposit_token_certified_log(request_id, *token_address)
        .await?;

    source_chain_bridge_client
        .claim_token(certified_log)
        .await?;

    assert!(pod_bridge_client.token_contract.getBalance().call().await? < prev_balance_pod);

    assert!(
        source_chain_bridge_client
            .source_chain_token_contract
            .balanceOf(to)
            .call()
            .await?
            > prev_balance_source
    );

    Ok(())
}
