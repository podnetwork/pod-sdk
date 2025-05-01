//! Example showing how to send a legacy transaction.

use std::{
    env,
    str::FromStr,
    time::{SystemTime, UNIX_EPOCH},
};

use alloy_network::{EthereumWallet, TransactionBuilder};
use alloy_primitives::{address, Address, TxKind, U256};
use alloy_provider::Provider;
use alloy_signer::k256::ecdsa::SigningKey;
use alloy_transport_http::reqwest::Url;
use eyre::Result;

use alloy_provider::WsConnect;
use alloy_rpc_types_eth::Filter;
use futures::StreamExt;
// Removed pod_types::Clock import
use pod_sdk::PrivateKeySigner;

pub mod provider;

mod network;
use crate::network::PodTransactionRequest;

use crate::provider::PodProviderExt;

use alloy_sol_types::SolEvent;

use pod_contracts::auction::Auction;

// Add internal clock trait and implementation
trait Clock {
    fn now(&self) -> Timestamp;
}

struct Timestamp {
    seconds: u64,
}

impl Timestamp {
    fn as_seconds(&self) -> u64 {
        self.seconds
    }
}

struct InternalClock;

impl Clock for InternalClock {
    fn now(&self) -> Timestamp {
        let duration = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Time went backwards");

        Timestamp {
            seconds: duration.as_secs(),
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let private_key_string = env::var("PRIVATE_KEY")?;
    let private_key_bytes = hex::decode(private_key_string)?;
    let private_key = SigningKey::from_slice(&private_key_bytes)?;
    let signer = PrivateKeySigner::from_signing_key(private_key);
    let address = signer.address();

    let rpc_url = env::var("RPC_URL").unwrap_or("ws://127.0.0.1:8545".to_string());
    let ws_url = Url::parse(&rpc_url)?;

    let ws = WsConnect::new(ws_url);
    let wallet = EthereumWallet::new(signer);

    let pod_provider = provider::PodProviderBuilder::new()
        .with_recommended_fillers()
        .wallet(wallet.clone())
        .on_ws(ws)
        .await?;

    let committee = pod_provider.get_committee().await?;
    println!("committee: {:?}", committee);

    // sender sends payment
    let start_time = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)?
        .as_micros()
        .try_into()?;

    let recipient = Address::from_str("0xC7096D019F96faE581361aFB07311cd6D3a25596")?;

    let tx = PodTransactionRequest::default()
        .with_from(address)
        .with_to(recipient)
        .with_value(U256::from(1_000_000));
    println!("tx {:?}", tx);

    let pending_tx = pod_provider.send_transaction(tx).await?;
    println!("tx hash {:?}", pending_tx.tx_hash());
    let receipt = pending_tx.get_receipt().await?;
    println!("receipt: {:?}", receipt);

    // recipient listens for new receipts and verifies payment
    let receipts = pod_provider
        .get_confirmed_receipts(start_time, None)
        .await
        .unwrap();

    for receipt in receipts.items {
        if receipt.transaction().to == TxKind::Call(recipient)
            && matches!(receipt.verify(&committee), Ok(true))
        {
            println!("found verified receipt {:?}", receipt);
        }
    }

    // Using the internal clock implementation instead of pod_types::time::SystemClock
    let clock = InternalClock {};
    let now = clock.now().as_seconds();
    println!("waiting for time to be past perfect");
    pod_provider.wait_past_perfect_time(now).await?;
    println!("perfect time reached");

    let filter = Filter::new()
        .address(address!("0x4CF3F1637bfEf1534e56352B6ebAae243aF464c3"))
        .event_signature(Auction::BidSubmitted::SIGNATURE_HASH)
        .from_block(0);

    // read historical logs, verify them, then generate proof for light clients
    println!("fetching historical logs");
    let logs = pod_provider.get_verifiable_logs(&filter).await?;
    for log in logs {
        println!("log {:?}", log);
        if log.verify(&committee).unwrap() {
            println!("Found verified auction contract event: {log:?}");
            println!("Event merkle multi-proof: {:?}", log.generate_multi_proof())
        }
    }

    // same as historical logs, but subscribing to new events
    let sub = pod_provider.subscribe_verifiable_logs(&filter).await?;
    let mut stream = sub.into_stream();

    println!("waiting for new logs");
    while let Some(log) = stream.next().await {
        println!("got log {:?}", log);
        if log.verify(&committee).unwrap() {
            println!("Found verified auction contract event: {log:?}");
            println!("Event merkle multi-proof: {:?}", log.generate_multi_proof())
        }
    }

    Ok(())
}
