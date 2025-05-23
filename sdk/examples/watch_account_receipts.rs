use std::str::FromStr;

use futures::StreamExt;
use pod_sdk::{Address, provider::PodProviderBuilder};
use pod_types::Timestamp;

#[tokio::main]
async fn main() {
    env_logger::init();
    let pod_provider = PodProviderBuilder::new()
        .on_url("ws://localhost:8545")
        .await
        .unwrap();

    let account = Address::from_str("0xbabebabebabe0000000000000000000000000000").unwrap();
    let mut receipts_per_account_stream = pod_provider
        .subscribe_receipts(Some(account), Timestamp::zero())
        .await
        .unwrap()
        .into_stream();

    let mut receipts_stream = pod_provider
        .subscribe_receipts(None, Timestamp::zero())
        .await
        .unwrap()
        .into_stream();

    println!("waiting for new account and confirmation receipts");
    loop {
        tokio::select! {
            receipt = receipts_per_account_stream.next() => {
                println!("got receipt for account '{account}' {receipt:?}");
            }
            receipt = receipts_stream.next() => {
                println!("got receipt {receipt:?}");
            }
        }
    }
}
