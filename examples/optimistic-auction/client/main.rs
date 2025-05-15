use alloy_pubsub::PubSubFrontend;
use alloy_rpc_types::Filter;
use alloy_sol_types::SolEvent;
use alloy_transport::Transport;
use dotenv::dotenv;

use alloy_network::{Ethereum, EthereumWallet, Network, ReceiptResponse};
use alloy_primitives::{Address, Bytes, FixedBytes};
use alloy_provider::{
    fillers::{
        BlobGasFiller, ChainIdFiller, FillProvider, GasFiller, JoinFill, NonceFiller, WalletFiller,
    },
    Identity, RootProvider, WsConnect,
};
use alloy_signer_local::PrivateKeySigner;
use alloy_transport_http::Http;

use anyhow::{anyhow, Result};
use pod_examples_solidity::auction::Auction::{self, AuctionInstance, BidSubmitted};
use pod_sdk::{
    network::PodNetwork,
    provider::{PodProviderBuilder, PodProviderExt},
    Provider, ProviderBuilder, U256,
};

use pod_types::{
    consensus::attestation::TimestampedHeadlessAttestation, ledger::log::VerifiableLog, Hashable,
};

use pod_optimistic_auction::podauctionconsumer::{
    MerkleTree::Proof,
    PodAuctionConsumer::{self, readReturn, PodAuctionConsumerInstance, State},
    PodECDSA::{
        Certificate as AuctionCertificate, CertifiedLog, CertifiedReceipt, Log as AuctionLog,
    },
};
use reqwest::Client;

use std::{env, str::FromStr, thread::sleep, time::Duration};

type PodProviderType = FillProvider<
    JoinFill<
        JoinFill<
            alloy_provider::Identity,
            JoinFill<GasFiller, JoinFill<NonceFiller, ChainIdFiller>>,
        >,
        WalletFiller<EthereumWallet>,
    >,
    RootProvider<PubSubFrontend, PodNetwork>,
    PubSubFrontend,
    PodNetwork,
>;

type AuctionContractType = AuctionInstance<
    PubSubFrontend,
    FillProvider<
        JoinFill<
            JoinFill<
                alloy_provider::Identity,
                JoinFill<GasFiller, JoinFill<NonceFiller, ChainIdFiller>>,
            >,
            WalletFiller<EthereumWallet>,
        >,
        RootProvider<PubSubFrontend, PodNetwork>,
        PubSubFrontend,
        PodNetwork,
    >,
    PodNetwork,
>;

type ConsumerProviderType = FillProvider<
    JoinFill<
        JoinFill<
            Identity,
            JoinFill<GasFiller, JoinFill<BlobGasFiller, JoinFill<NonceFiller, ChainIdFiller>>>,
        >,
        WalletFiller<EthereumWallet>,
    >,
    RootProvider<Http<Client>>,
    Http<Client>,
    Ethereum,
>;

type ConsumerContractType = PodAuctionConsumerInstance<
    Http<Client>,
    FillProvider<
        JoinFill<
            JoinFill<
                Identity,
                JoinFill<GasFiller, JoinFill<BlobGasFiller, JoinFill<NonceFiller, ChainIdFiller>>>,
            >,
            WalletFiller<EthereumWallet>,
        >,
        RootProvider<Http<Client>>,
        Http<Client>,
        Ethereum,
    >,
>;

struct AuctionClient {
    pod_provider: PodProviderType,
    auction_contract: AuctionContractType,
    consumer_provider: ConsumerProviderType,
    consumer_contract: ConsumerContractType,
}

fn get_certifierd_log(log: &VerifiableLog) -> Result<CertifiedLog> {
    let proof = log.generate_proof().unwrap();
    let leaf = log.get_leaf();
    let aggregate_signature = log.aggregate_signatures()?;

    Ok(CertifiedLog {
        log: AuctionLog {
            addr: log.inner.address(),
            topics: log.inner.topics().to_vec(),
            data: log.inner.data().data.clone(),
        },
        logIndex: U256::from(log.inner.log_index.unwrap()),
        certificate: AuctionCertificate {
            certifiedReceipt: CertifiedReceipt {
                receiptRoot: log.pod_metadata.receipt.hash_custom(),
                aggregateSignature: aggregate_signature,
            },
            leaf,
            proof: Proof { path: proof.path },
        },
    })
}

impl AuctionClient {
    pub async fn new(
        pod_rpc_url: String,
        consumer_rpc_url: String,
        auction_contract_address: Address,
        consumer_contract_address: Address,
        signer: PrivateKeySigner,
    ) -> Result<Self> {
        let wallet = EthereumWallet::from(signer);

        let ws_connect = WsConnect::new(pod_rpc_url);

        let pod_provider = PodProviderBuilder::new()
            .with_recommended_fillers()
            .wallet(wallet.clone())
            .on_ws(ws_connect)
            .await?;

        let auction_contract = Auction::new(auction_contract_address, pod_provider.clone());

        let consumer_provider = ProviderBuilder::new()
            .with_recommended_fillers()
            .wallet(wallet.clone())
            .on_http(consumer_rpc_url.parse()?);

        let consumer_contract =
            PodAuctionConsumer::new(consumer_contract_address, consumer_provider.clone());

        Ok(Self {
            pod_provider,
            auction_contract,
            consumer_provider,
            consumer_contract,
        })
    }

    pub async fn submit_bid(
        &self,
        auction_id: U256,
        deadline: U256,
        value: U256,
        data: Vec<u8>,
    ) -> Result<()> {
        let tx = self
            .auction_contract
            .submitBid(auction_id, U256::from(deadline), value, data.into())
            .gas(1000000)
            .gas_price(1000000000)
            .send()
            .await
            .unwrap();

        println!("Waiting for receipt... {:?}", tx.tx_hash());
        sleep(Duration::from_millis(100));

        check_receipt_status::<_, _, PodNetwork>(self.pod_provider.clone(), *tx.tx_hash()).await?;

        Ok(())
    }

    pub async fn bond(&self) -> Result<()> {
        let bond_tx = match self
            .consumer_contract
            .bond()
            .value(U256::from(1000000000000000000_i64))
            .send()
            .await
        {
            Ok(tx) => tx,
            Err(e) => {
                println!("{:?}", e);
                return Ok(());
            }
        };

        println!("Waiting for receipt - BOND... {:?}", bond_tx.tx_hash());
        sleep(Duration::from_millis(100));

        check_receipt_status::<_, _, Ethereum>(self.consumer_provider.clone(), *bond_tx.tx_hash())
            .await?;

        Ok(())
    }

    pub async fn write(&self, certified_log: CertifiedLog) -> Result<()> {
        let write_tx = match self.consumer_contract.write(certified_log).send().await {
            Ok(tx) => tx,
            Err(e) => {
                println!("{:?}", e);
                return Ok(());
            }
        };

        println!("Waiting for receipt - WRITE... {:?}", write_tx.tx_hash());
        sleep(Duration::from_millis(100));

        check_receipt_status::<_, _, Ethereum>(self.consumer_provider.clone(), *write_tx.tx_hash())
            .await?;

        Ok(())
    }

    pub async fn blame_ill_announced(&self, certified_log: CertifiedLog) -> Result<()> {
        let blame_tx = match self
            .consumer_contract
            .blameIllAnnounced(certified_log)
            .send()
            .await
        {
            Ok(tx) => tx,
            Err(e) => {
                println!("{:?}", e);
                return Ok(());
            }
        };

        println!("Waiting for receipt - BLAME... {:?}", blame_tx.tx_hash());
        sleep(Duration::from_millis(100));

        check_receipt_status::<_, _, Ethereum>(self.consumer_provider.clone(), *blame_tx.tx_hash())
            .await?;

        Ok(())
    }

    // TODO: uncomment if you wish to use
    // pub async fn blame_no_show(&self, certified_log: CertifiedLog) -> Result<()> {
    //     let blame_tx = match self
    //         .consumer_contract
    //         .blameNoShow(certified_log)
    //         .send()
    //         .await
    //     {
    //         Ok(tx) => tx,
    //         Err(e) => {
    //             println!("{:?}", e);
    //             return Ok(());
    //         }
    //     };

    //     println!(
    //         "Waiting for receipt - BLAME NO SHOW... {:?}",
    //         blame_tx.tx_hash()
    //     );
    //     sleep(Duration::from_millis(100));

    //     check_receipt_status::<_, _, Ethereum>(self.consumer_provider.clone(), *blame_tx.tx_hash())
    //         .await?;

    //     Ok(())
    // }

    pub async fn read_state(&self, auction_id: U256, deadline: U256) -> Result<()> {
        let state: readReturn = self
            .consumer_contract
            .read(auction_id, deadline)
            .call()
            .await?;

        let result: State = state._0;

        println!("WINNER: {:?}", result.winner);
        println!("BLAMED: {:?}", result.blamed);

        Ok(())
    }

    pub async fn get_certified_log(
        &self,
        auction_id: U256,
        bidder_address: Address,
        deadline: U256,
    ) -> Result<CertifiedLog> {
        let bidder_filter = U256::from_str(&bidder_address.to_string())?;

        let filter = Filter::new()
            .address(Address::from(self.auction_contract.address().0))
            .event_signature(BidSubmitted::SIGNATURE_HASH)
            .topic1(auction_id)
            .topic2(bidder_filter)
            .topic3(deadline);

        let logs = self.pod_provider.get_verifiable_logs(&filter).await?;

        assert_eq!(logs.len(), 1);
        let log = &logs[0];

        get_certifierd_log(log)
    }
}

pub fn aggregate_signatures_from_attestations(
    attestations: &[TimestampedHeadlessAttestation],
) -> Result<Bytes> {
    let aggregated = attestations
        .iter()
        .map(|a| a.signature.to_bytes())
        .reduce(|mut acc, sig| {
            acc.extend_from_slice(&sig);
            acc
        })
        .ok_or_else(|| anyhow!("error aggregating signatures"))?;

    Ok(Bytes::from(aggregated))
}

async fn advance_time<T: Provider<Http<Client>>>(provider: T, timestamp: U256) -> Result<()> {
    provider
        .raw_request::<_, ()>(
            std::borrow::Cow::Borrowed("evm_setNextBlockTimestamp"),
            vec![timestamp],
        )
        .await?;

    provider
        .raw_request::<_, String>(std::borrow::Cow::Borrowed("evm_mine"), ())
        .await?;

    Ok(())
}

async fn check_receipt_status<T, P, N>(provider: T, tx_hash: FixedBytes<32>) -> Result<()>
where
    T: Provider<P, N>,
    P: Transport + Clone,
    N: Network,
{
    let receipt = provider.get_transaction_receipt(tx_hash).await?.unwrap();

    if receipt.status() {
        println!("✅ Tx succeeded: {:?}", tx_hash);
    } else {
        println!("❌ Tx failed: {:?}", tx_hash);
    }

    assert!(receipt.status());

    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();
    let pod_rpc_url = env::var("POD_RPC_URL").expect("POD_RPC_URL must be set");
    let consumer_rpc_url = env::var("CONSUMER_RPC_URL").expect("CONSUMER_RPC_URL must be set");
    let auction_contract_address_str =
        env::var("AUCTION_CONTRACT_ADDRESS").expect("AUCTION_CONTRACT_ADDRESS must be set");
    let auction_contract_address = Address::from_str(&auction_contract_address_str)?;
    let consumer_contract_address_str =
        env::var("CONSUMER_CONTRACT_ADDRESS").expect("CONSUMER_CONTRACT_ADDRESS must be set");
    let consumer_contract_address = Address::from_str(&consumer_contract_address_str)?;

    let private_key_1 = env::var("PRIVATE_KEY_1").expect("PRIVATE_KEY_1 must be set");
    let signer_1: PrivateKeySigner = private_key_1.parse()?;

    let private_key_2 = env::var("PRIVATE_KEY_2").expect("PRIVATE_KEY_2 must be set");
    let signer_2: PrivateKeySigner = private_key_2.parse()?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)?
        .as_secs()
        + 1400;

    let deadline = U256::from(now + 5);

    let writing_period_ends = deadline + U256::from(601);
    let dispute_period_ends = writing_period_ends + U256::from(601);

    let data = vec![0x12, 0x34, 0x56];

    let auction_id = U256::from(now);
    let value1 = U256::from(1000);

    let auction_client_1 = AuctionClient::new(
        pod_rpc_url.clone(),
        consumer_rpc_url.clone(),
        auction_contract_address,
        consumer_contract_address,
        signer_1.clone(),
    )
    .await?;
    let auction_client_2 = AuctionClient::new(
        pod_rpc_url,
        consumer_rpc_url,
        auction_contract_address,
        consumer_contract_address,
        signer_2.clone(),
    )
    .await?;

    auction_client_1
        .submit_bid(auction_id, deadline, value1, data.clone())
        .await?;

    let value2 = U256::from(2000);

    auction_client_2
        .submit_bid(auction_id, deadline, value2, data.clone())
        .await?;

    advance_time(auction_client_1.consumer_provider.clone(), U256::from(now)).await?;

    let _ = auction_client_1.bond().await;
    let _ = auction_client_2.bond().await;

    let certified_log1 = auction_client_1
        .get_certified_log(auction_id, signer_1.address(), deadline)
        .await?;
    let certified_log2 = auction_client_2
        .get_certified_log(auction_id, signer_2.address(), deadline)
        .await?;

    advance_time(auction_client_1.consumer_provider.clone(), deadline).await?;

    sleep(Duration::from_secs(1));

    auction_client_1.write(certified_log1).await?;

    advance_time(
        auction_client_1.consumer_provider.clone(),
        writing_period_ends,
    )
    .await?;

    let _ = auction_client_2.blame_ill_announced(certified_log2).await;

    advance_time(
        auction_client_1.consumer_provider.clone(),
        dispute_period_ends,
    )
    .await?;

    auction_client_1.read_state(auction_id, deadline).await?;

    // TODO: uncomment if you wish to use, to use this, we need to comment the write + blame ill announced calls
    // let _ = auction_client_1.blame_no_show(certified_log1).await;

    Ok(())
}
