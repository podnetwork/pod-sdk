use alloy_sol_types::SolEvent;
use dotenv::dotenv;

use alloy_network::{Ethereum, EthereumWallet, ReceiptResponse};
use alloy_primitives::Address;
use alloy_provider::{
    Identity, RootProvider,
    fillers::{
        BlobGasFiller, ChainIdFiller, FillProvider, GasFiller, JoinFill, NonceFiller, WalletFiller,
    },
};
use alloy_signer_local::PrivateKeySigner;

use anyhow::Result;
use pod_sdk::{
    Provider, ProviderBuilder, U256,
    network::PodNetwork,
    provider::{PodProvider, PodProviderBuilder},
};

use pod_protocol::{
    bridge_deposit_withdraw::BridgeDepositWithdraw::BridgeDepositWithdrawInstance,
    bridge_mint_burn::BridgeMintBurn::{BridgeMintBurnInstance, Deposit, DepositNative},
    wrapped_token::WrappedToken::WrappedTokenInstance,
};

use pod_types::{Hashable, ledger::log::VerifiableLog, rpc::filter::LogFilterBuilder};

use pod_protocol::bridge_deposit_withdraw::{
    MerkleTree::Proof,
    PodECDSA::{
        Certificate as BridgeCertificate, CertifiedLog, CertifiedReceipt, Log as BridgeLog,
    },
};

use std::{env, str::FromStr, thread::sleep, time::Duration};

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

type SourceChainContractType = BridgeDepositWithdrawInstance<
    FillProvider<
        JoinFill<
            JoinFill<
                Identity,
                JoinFill<GasFiller, JoinFill<BlobGasFiller, JoinFill<NonceFiller, ChainIdFiller>>>,
            >,
            WalletFiller<EthereumWallet>,
        >,
        RootProvider,
        Ethereum,
    >,
>;

struct PodBridgeClient {
    pod_provider: PodProvider,
    pod_bridge: BridgeMintBurnInstance<PodProvider, PodNetwork>,
    pod_token_contract: WrappedTokenInstance<PodProvider, PodNetwork>,
}

struct SourceChainBridgeClient {
    source_chain_provider: SourceChainProviderType,
    source_chain_contract: SourceChainContractType,
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
            .connect_http(source_chain_rpc_url.parse()?);

        let source_chain_contract = BridgeDepositWithdrawInstance::new(
            source_chain_contract_address,
            source_chain_provider.clone(),
        );

        let source_chain_token_contract = WrappedTokenInstance::new(
            source_chain_token_contract_address,
            source_chain_provider.clone(),
        );

        Ok(Self {
            source_chain_provider,
            source_chain_contract,
            source_chain_token_contract,
        })
    }

    pub async fn deposit_native(&self, to: Address, value: U256) -> Result<(U256, u64)> {
        let tx = self
            .source_chain_contract
            .depositNative(to)
            .max_fee_per_gas(1_000_000_000u128)
            .max_priority_fee_per_gas(0)
            .value(value)
            .send()
            .await?;

        sleep(Duration::from_millis(100));

        println!(
            "Successfully deposited {:?} native to address: {:?}",
            value, to
        );

        let receipt = self
            .source_chain_provider
            .get_transaction_receipt(*tx.tx_hash())
            .await?
            .unwrap();

        assert!(receipt.status());
        assert!(receipt.logs().len() == 1);

        for log in receipt.logs() {
            let event_signature = log.topic0();
            if Some(*event_signature.unwrap()) == Some(DepositNative::SIGNATURE_HASH) {
                let request_id = log.topics()[1];
                let block_number = receipt.block_number();
                if block_number.is_some() {
                    return Ok((request_id.into(), block_number.unwrap()));
                }
            }
        }

        Err(anyhow::anyhow!("Request ID not found"))
    }

    pub async fn deposit_token(&self, to: Address, amount: U256) -> Result<(U256, Address, u64)> {
        let tx = self
            .source_chain_contract
            .deposit(*self.source_chain_token_contract.address(), amount, to)
            .send()
            .await?;

        sleep(Duration::from_millis(1000));

        let receipt = self
            .source_chain_provider
            .get_transaction_receipt(*tx.tx_hash())
            .await?
            .unwrap();

        assert!(receipt.status());
        assert!(receipt.logs().len() == 2);

        println!(
            "Successfully deposited {:?} token to address: {:?}",
            amount, to
        );

        for log in receipt.logs() {
            let event_signature = log.topic0();
            if Some(*event_signature.unwrap()) == Some(Deposit::SIGNATURE_HASH) {
                let request_id = log.topics()[1];
                let token_address = log.topics()[2];
                let block_number = receipt.block_number();
                if block_number.is_some() {
                    return Ok((
                        request_id.into(),
                        Address::from_slice(&token_address.0[12..]),
                        block_number.unwrap(),
                    ));
                }
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
            .source_chain_provider
            .get_transaction_receipt(*tx.tx_hash())
            .await?
            .unwrap();

        assert!(receipt.status());
        assert!(receipt.logs().len() == 2);

        println!("Successfully claimed token from source chain",);

        Ok(())
    }

    pub async fn claim_native(&self, certified_log: CertifiedLog) -> Result<()> {
        let tx = self
            .source_chain_contract
            .claimNative(certified_log)
            .send()
            .await?;

        sleep(Duration::from_millis(100));

        let receipt = self
            .source_chain_provider
            .get_transaction_receipt(*tx.tx_hash())
            .await?
            .unwrap();

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
            WrappedTokenInstance::new(pod_token_contract_address, pod_provider.clone());

        Ok(Self {
            pod_provider,
            pod_bridge,
            pod_token_contract,
        })
    }

    pub async fn deposit_native(&self, to: Address, value: U256) -> Result<U256> {
        let tx = self
            .pod_bridge
            .depositNative(to)
            .value(value)
            .send()
            .await
            .unwrap();

        let receipt = tx.get_receipt().await?;

        assert!(receipt.status());
        assert!(receipt.receipt.logs().len() == 1);

        println!(
            "Successfully deposited {:?} native to address: {:?}",
            value, to
        );

        for log in receipt.logs() {
            let event_signature = log.topic0();
            if Some(*event_signature.unwrap()) == Some(DepositNative::SIGNATURE_HASH) {
                let request_id = log.topics()[1];
                return Ok(request_id.into());
            }
        }
        Err(anyhow::anyhow!("Request ID not found"))
    }

    pub async fn deposit_token(&self, to: Address, amount: U256) -> Result<(U256, Address)> {
        let tx = self
            .pod_bridge
            .deposit(*self.pod_token_contract.address(), amount, to)
            .max_fee_per_gas(1_000_000_000u128)
            .max_priority_fee_per_gas(0)
            .send()
            .await
            .unwrap();

        let receipt = tx.get_receipt().await?;

        assert!(receipt.status());
        assert!(receipt.logs().len() == 2);

        println!(
            "Successfully deposited {:?} token to address: {:?}",
            amount, to
        );

        for log in receipt.logs() {
            let event_signature = log.topic0();
            if Some(*event_signature.unwrap()) == Some(Deposit::SIGNATURE_HASH) {
                let request_id = log.topics()[1];
                let token_address = log.topics()[2];
                return Ok((
                    request_id.into(),
                    Address::from_slice(&token_address.0[12..]),
                ));
            }
        }
        Err(anyhow::anyhow!("Request ID not found"))
    }

    pub async fn claim_token(
        &self,
        request_id: U256,
        token_address: Address,
        block_number: U256,
        to: Address,
    ) -> Result<()> {
        let tx = self
            .pod_bridge
            .claim(request_id, token_address, block_number)
            .send()
            .await?;

        let receipt = tx.get_receipt().await?;

        assert!(receipt.status());
        assert!(receipt.logs().len() == 2);

        println!(
            "Successfully claimed request id: {:?} by address: {:?}",
            request_id, to
        );

        Ok(())
    }

    pub async fn claim_native(
        &self,
        request_id: U256,
        block_number: U256,
        to: Address,
    ) -> Result<()> {
        let prev_balance = self.pod_provider.get_balance(to).await?;

        let tx = self
            .pod_bridge
            .claimNative(request_id, block_number)
            .send()
            .await?;

        let receipt = tx.get_receipt().await?;

        assert!(receipt.status());
        assert!(self.pod_provider.get_balance(to).await? > prev_balance);

        println!(
            "Successfully claimed request id: {:?} by address: {:?}",
            request_id, to
        );

        Ok(())
    }

    pub async fn get_deposit_native_certified_log(&self, request_id: U256) -> Result<CertifiedLog> {
        let filter = LogFilterBuilder::new()
            .address(Address::from(self.pod_bridge.address().0))
            .event_signature(DepositNative::SIGNATURE_HASH)
            .topic1(request_id)
            .build();

        sleep(Duration::from_millis(1000));

        let logs = self.pod_provider.get_verifiable_logs(&filter).await?;

        assert_eq!(logs.len(), 1);
        let log = &logs[0];

        let certified_log = get_certified_log(log)?;

        println!("Generated certified log for request id: {:?}", request_id);

        Ok(certified_log)
    }

    pub async fn get_deposit_token_certified_log(
        &self,
        request_id: U256,
        token_address: Address,
    ) -> Result<CertifiedLog> {
        let token_address_filter = U256::from_str(&token_address.to_string())?;
        let filter = LogFilterBuilder::new()
            .address(Address::from(self.pod_bridge.address().0))
            .event_signature(Deposit::SIGNATURE_HASH)
            .topic1(request_id)
            .topic2(token_address_filter)
            .build();

        sleep(Duration::from_millis(1000));

        let logs = self.pod_provider.get_verifiable_logs(&filter).await?;

        assert_eq!(logs.len(), 1);
        let log = &logs[0];

        let certified_log = get_certified_log(log)?;

        println!("Generated certified log for request id: {:?}", request_id);

        Ok(certified_log)
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();

    let to = env::var("USER_ADDRESS").expect("USER_ADDRESS must be set");
    let to = Address::from_str(&to)?;

    let pod_rpc_url = env::var("POD_RPC_URL").expect("POD_RPC_URL must be set");
    let pod_bridge_contract_address =
        env::var("POD_BRIDGE_CONTRACT_ADDRESS").expect("POD_BRIDGE_CONTRACT_ADDRESS must be set");
    let pod_bridge_contract_address = Address::from_str(&pod_bridge_contract_address)?;
    let pod_token_contract_address =
        env::var("POD_TOKEN_CONTRACT_ADDRESS").expect("POD_TOKEN_CONTRACT_ADDRESS must be set");
    let pod_token_contract_address = Address::from_str(&pod_token_contract_address)?;

    let source_chain_rpc_url =
        env::var("SOURCE_CHAIN_RPC_URL").expect("SOURCE_CHAIN_RPC_URL must be set");
    let source_chain_contract_address = env::var("SOURCE_CHAIN_BRIDGE_CONTRACT_ADDRESS")
        .expect("SOURCE_CHAIN_BRIDGE_CONTRACT_ADDRESS must be set");
    let source_chain_contract_address = Address::from_str(&source_chain_contract_address)?;

    let source_chain_token_contract_address = env::var("SOURCE_CHAIN_TOKEN_CONTRACT_ADDRESS")
        .expect("SOURCE_CHAIN_TOKEN_CONTRACT_ADDRESS must be set");
    let source_chain_token_contract_address =
        Address::from_str(&source_chain_token_contract_address)?;

    let user_private_key = env::var("USER_PRIVATE_KEY").expect("USER_PRIVATE_KEY must be set");
    let user_signer: PrivateKeySigner = user_private_key.parse()?;

    let source_chain_bridge_client = SourceChainBridgeClient::new(
        source_chain_rpc_url.clone(),
        source_chain_contract_address,
        source_chain_token_contract_address,
        user_signer.clone(),
    )
    .await?;

    let pod_bridge_client = PodBridgeClient::new(
        pod_rpc_url,
        pod_bridge_contract_address,
        pod_token_contract_address,
        user_signer,
    )
    .await?;

    let amount = U256::from(1000000000000000000u128);

    bridge_native_from_source_chain_to_pod(
        &source_chain_bridge_client,
        &pod_bridge_client,
        to,
        amount,
    )
    .await?;

    bridge_native_from_pod_to_source_chain(
        &pod_bridge_client,
        &source_chain_bridge_client,
        to,
        amount,
    )
    .await?;

    bridge_token_from_source_chain_to_pod(
        &source_chain_bridge_client,
        &pod_bridge_client,
        to,
        amount,
    )
    .await?;

    bridge_token_from_pod_to_source_chain(
        &pod_bridge_client,
        &source_chain_bridge_client,
        to,
        amount,
    )
    .await?;

    Ok(())
}

async fn bridge_native_from_source_chain_to_pod(
    source_chain_bridge_client: &SourceChainBridgeClient,
    pod_bridge_client: &PodBridgeClient,
    to: Address,
    value: U256,
) -> Result<()> {
    let prev_balance_source = source_chain_bridge_client
        .source_chain_provider
        .get_balance(to)
        .await?;

    let prev_balance_pod = pod_bridge_client.pod_provider.get_balance(to).await?;

    let (request_id, source_chain_block_number) =
        source_chain_bridge_client.deposit_native(to, value).await?;

    pod_bridge_client
        .claim_native(request_id, U256::from(source_chain_block_number), to)
        .await?;

    sleep(Duration::from_millis(1000));

    assert!(pod_bridge_client.pod_provider.get_balance(to).await? > prev_balance_pod);
    assert!(
        source_chain_bridge_client
            .source_chain_provider
            .get_balance(to)
            .await?
            < prev_balance_source
    );

    Ok(())
}

async fn bridge_native_from_pod_to_source_chain(
    pod_bridge_client: &PodBridgeClient,
    source_chain_bridge_client: &SourceChainBridgeClient,
    to: Address,
    value: U256,
) -> Result<()> {
    let prev_balance_pod = pod_bridge_client.pod_provider.get_balance(to).await?;
    let prev_balance_source = source_chain_bridge_client
        .source_chain_provider
        .get_balance(to)
        .await?;

    let request_id = pod_bridge_client.deposit_native(to, value).await?;

    let certified_log = pod_bridge_client
        .get_deposit_native_certified_log(request_id)
        .await?;

    source_chain_bridge_client
        .claim_native(certified_log)
        .await?;

    assert!(pod_bridge_client.pod_provider.get_balance(to).await? < prev_balance_pod);
    assert!(
        source_chain_bridge_client
            .source_chain_provider
            .get_balance(to)
            .await?
            > prev_balance_source
    );

    Ok(())
}

async fn bridge_token_from_source_chain_to_pod(
    source_chain_bridge_client: &SourceChainBridgeClient,
    pod_bridge_client: &PodBridgeClient,
    to: Address,
    amount: U256,
) -> Result<()> {
    let prev_balance_source = source_chain_bridge_client
        .source_chain_token_contract
        .balanceOf(to)
        .call()
        .await?;
    let prev_balance_pod = pod_bridge_client
        .pod_token_contract
        .balanceOf(to)
        .call()
        .await?;

    let (request_id, token_address, block_number) =
        source_chain_bridge_client.deposit_token(to, amount).await?;

    pod_bridge_client
        .claim_token(request_id, token_address, U256::from(block_number), to)
        .await?;

    assert!(
        pod_bridge_client
            .pod_token_contract
            .balanceOf(to)
            .call()
            .await?
            > prev_balance_pod
    );

    assert!(
        source_chain_bridge_client
            .source_chain_token_contract
            .balanceOf(to)
            .call()
            .await?
            < prev_balance_source
    );

    Ok(())
}

async fn bridge_token_from_pod_to_source_chain(
    pod_bridge_client: &PodBridgeClient,
    source_chain_bridge_client: &SourceChainBridgeClient,
    to: Address,
    amount: U256,
) -> Result<()> {
    let prev_balance_pod = pod_bridge_client
        .pod_token_contract
        .balanceOf(to)
        .call()
        .await?;
    let prev_balance_source = source_chain_bridge_client
        .source_chain_token_contract
        .balanceOf(to)
        .call()
        .await?;

    let (request_id, token_address) = pod_bridge_client.deposit_token(to, amount).await?;

    let certified_log = pod_bridge_client
        .get_deposit_token_certified_log(request_id, token_address)
        .await?;

    source_chain_bridge_client
        .claim_token(certified_log)
        .await?;

    assert!(
        pod_bridge_client
            .pod_token_contract
            .balanceOf(to)
            .call()
            .await?
            < prev_balance_pod
    );

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
