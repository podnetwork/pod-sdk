use std::str::FromStr;

use futures::StreamExt;
use pod_sdk::{Address, U256, alloy_rpc_types::Filter, provider::PodProviderBuilder};

#[tokio::main]
async fn main() {
    env_logger::init();
    let pod_provider = PodProviderBuilder::new()
        .on_url("ws://localhost:8545")
        .await
        .unwrap();

    let committee = pod_provider.get_committee().await.unwrap();

    let address = Address::from_str("0x12296f2d128530a834460df6c36a2895b793f26d").unwrap();

    let event_signature =
        hex::decode("98b6b180756c849b5bfbbd2bbd091f3fe64b0935ac195418c0b619b9b661c78d").unwrap();
    let event_signature = U256::from_be_slice(&event_signature);
    let filter = Filter::new()
        .from_block(0)
        .event_signature(event_signature)
        .address(address);
    let mut stream = pod_provider
        .subscribe_verifiable_logs(&filter)
        .await
        .unwrap()
        .into_stream();

    println!("waiting for new logs");
    while let Some(log) = stream.next().await {
        println!("got log {:?}", log);
        if log.verify(&committee).unwrap() {
            println!("Found verified auction contract event: {log:?}");
            println!("Event merkle multi-proof: {:?}", log.generate_multi_proof())
        }
    }
}
