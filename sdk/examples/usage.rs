use std::{str::FromStr, time::SystemTime};

use anyhow::Result;

use futures::StreamExt;
use pod_sdk::{
    Address, TxKind, U256, alloy_rpc_types::Filter, alloy_sol_types::SolEvent,
    provider::PodProviderBuilder,
};

use pod_contracts::auction::Auction;

#[tokio::main]
async fn main() -> Result<()> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .from_env()
        .await?;

    let committee = pod_provider.get_committee().await?;
    println!("committee: {:?}", committee);

    // sender sends payment
    let start_time = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)?
        .as_micros()
        .try_into()?;

    let recipient = Address::from_str("0xC7096D019F96faE581361aFB07311cd6D3a25596").unwrap();

    let receipt = pod_provider
        .transfer(recipient, U256::from(1_000_000))
        .await
        .unwrap();
    println!("receipt: {:?}", receipt);

    // recipient listens for new receipts and verifies payment
    let receipts = pod_provider.get_receipts(None, start_time, None).await?;

    for receipt in receipts.items {
        if receipt.transaction().to == TxKind::Call(recipient)
            && matches!(receipt.verify(&committee), Ok(true))
        {
            println!("found verified receipt {:?}", receipt);
        }
    }

    // recipient listens for new receipts and verifies payment
    let recipient_receipts = pod_provider
        .get_receipts(Some(recipient), start_time, None)
        .await?;

    for recipient_receipt in recipient_receipts.items {
        if recipient_receipt.transaction().to == TxKind::Call(recipient)
            && matches!(recipient_receipt.verify(&committee), Ok(true))
        {
            println!("found verified receipt {:?}", recipient_receipt);
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
