! content id="coming-from-alloy"

## Coming from alloy

pod Rust SDK is built on top of alloy. Therefore, alloy could be used to interact with the pod
network, however, this is not recommended, as the pod SDK provides additional essential
functionality such as `wait_past_perfect_time`, which integrate pod-specific features. Additionally,
using alloy directly may lead to unexpected behavior when waiting for transaction confirmations or
fetching blocks.

The main different between using pod-sdk and alloy is that pod has its own ProviderBuilder, called
`PodProviderBuilder`. The rest of the API remains the same, as it's illustrated in the example.

! content end

! content

! sticky

! codeblock title="Send transaction with pod-sdk"

```rust
#[tokio::main]
async fn main() -> Result<()> {
    // Initialize a wallet - alloy compatible
    let private_key_bytes = <[u8; 32]>::from_hex("abc...")?;
    let field_bytes = FieldBytes::from_slice(&private_key_bytes);
    let signing_key = SigningKey::from_bytes(field_bytes)?;
    let signer = PrivateKeySigner::from(signing_key);
    let wallet = EthereumWallet::new(signer);

    let ws_url = Url::parse("ws://rpc.v1.dev.pod.network:8545")?;
    let ws = WsConnect::new(ws_url);
    // Instantiate a provider
    // Use pod-specific Provider instead of use alloy::providers::ProviderBuilder
    let pod_provider = provider::PodProviderBuilder::new()
        .wallet(wallet)
        .on_ws(ws)
        .await?;

    // Send transaction
    // Use alloy structs
    let tx = TxLegacy {
        chain_id: Some(1293),
        nonce: 0,
        gas_price: 20_000_000_000,
        gas_limit: 21_000,
        to: TxKind::Call(Address::from_str("0x70997970C51812dc3A010C7d01b50e0d17dc79C8").unwrap()),
        value: U256::from(1000000000000000000u64),
        input: Bytes::default(),
    };
    // Use send_transaction - alloy compatible
    let pending_tx = pod_provider.send_transaction(tx.into()).await?;

    // Get receipt - alloy compatible
    let receipt = pending_tx.get_receipt().await?;
    println!("receipt: {:?}", receipt);

    Ok(())
}
```

! codeblock end

! sticky end

! content end
