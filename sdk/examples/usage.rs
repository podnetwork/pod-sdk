use std::{env, str::FromStr, time::SystemTime};

use anyhow::Result;

use futures::StreamExt;
use pod_sdk::{
    Address, EthereumWallet, PrivateKeySigner, Provider, SigningKey, TransactionBuilder, TxKind,
    U256, alloy_rpc_types::Filter, alloy_sol_types::SolEvent, network::PodTransactionRequest,
    provider::PodProviderBuilder,
};

use pod_contracts::auction::Auction;

#[tokio::main]
async fn main() -> Result<()> {
    let private_key_string = env::var("PRIVATE_KEY")?;
    let private_key_bytes = hex::decode(private_key_string)?;
    let private_key = SigningKey::from_slice(&private_key_bytes)?;
    let signer = PrivateKeySigner::from_signing_key(private_key);
    let address = signer.address();

    let rpc_url = env::var("RPC_URL").unwrap_or("ws://127.0.0.1:8545".to_string());
    let wallet = EthereumWallet::new(signer);

    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .wallet(wallet)
        .on_url(&rpc_url)
        .await?;

    let committee = pod_provider.get_committee().await?;
    println!("committee: {:?}", committee);

    // sender sends payment
    let start_time = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)?
        .as_micros()
        .try_into()?;

    let recipient = Address::from_str("0xC7096D019F96faE581361aFB07311cd6D3a25596").unwrap();

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
        .await?;

    for receipt in receipts.items {
        if receipt.transaction().to == TxKind::Call(recipient)
            && matches!(receipt.verify(&committee), Ok(true))
        {
            println!("found verified receipt {:?}", receipt);
        }
    }

    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)?
        .as_secs();

    println!("waiting for time to be past perfect");
    pod_provider.wait_past_perfect_time(now).await?;
    println!("perfect time reached");

    let filter = Filter::new()
        .address(Address::from_str("0x4CF3F1637bfEf1534e56352B6ebAae243aF464c3").unwrap())
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
