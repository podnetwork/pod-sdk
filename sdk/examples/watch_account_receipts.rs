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

    let committee = pod_provider.get_committee().await.unwrap();

    // let address = Address::from_str("0xb8AA43999C2b3Cbb10FbE2092432f98D8F35Dcd7").unwrap();
    let address = Address::from_str("0xbabebabebabe0000000000000000000000000000").unwrap();

    let mut stream = pod_provider
        .subscribe_account_receipts(address, Timestamp::zero())
        .await
        .unwrap()
        .into_stream();

    println!("waiting for new account receipts");
    while let Some(log) = stream.next().await {
        println!("got log {:?}", log);
        if log.verify(&committee).unwrap() {
            println!("recipt verified successfully");
        } else {
            println!("recipt doesn't verify");
        }
    }
}
