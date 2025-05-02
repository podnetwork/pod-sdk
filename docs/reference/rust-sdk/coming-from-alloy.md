! content id="coming-from-alloy"

## Coming from alloy

pod Rust SDK is built on top of alloy. Therefore, alloy could be used to interact with the pod
network, however, this is not recommended, as the pod SDK provides additional essential
functionality such as `wait_past_perfect_time`, which integrate pod-specific features. Additionally,
using alloy directly may lead to unexpected behavior when waiting for transaction confirmations or
fetching blocks.

! content end

! content

! sticky

! codeblock title="Send transaction with alloy (example from alloy docs)"

```rust
#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Initialize a signer with a private key
    let signer: PrivateKeySigner =
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80".parse()?;

    // Instantiate a provider with the signer
    let provider = ProviderBuilder::new()
        .wallet(signer)
        .connect("https://reth-ethereum.ithaca.xyz/rpc")
        .await?;

    // Prepare a transaction request to send 100 ETH to Alice
    let alice = address!("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
    let value = Unit::ETHER.wei().saturating_mul(U256::from(100));
    let tx = TransactionRequest::default()
        .with_to(alice)
        .with_value(value);

    // Send the transaction and wait for the broadcast
    let pending_tx = provider.send_transaction(tx).await?;
    println!("Pending transaction... {}", pending_tx.tx_hash());

    // Wait for the transaction to be included and get the receipt
    let receipt = pending_tx.get_receipt().await?;
    println!(
        "Transaction included in block {}",
        receipt.block_number.expect("Failed to get block number")
    );

    Ok(())
}
```

! codeblock end

! codeblock title="Send transaction with pod-sdk"

```rust
#[tokio::main]
async fn main() -> Result<()> {
    // Initialize a wallet
    let private_key_bytes = <[u8; 32]>::from_hex("abc...")?;
    let field_bytes = FieldBytes::from_slice(&private_key_bytes);
    let signing_key = SigningKey::from_bytes(field_bytes)?;
    let signer = PrivateKeySigner::from(signing_key);
    let wallet = EthereumWallet::new(signer);

    // Instantiate a provider
    let ws_url = Url::parse("ws://rpc.dev.pod.network:8545")?;
    let ws = WsConnect::new(ws_url);
    let pod_provider = provider::PodProviderBuilder::new()
        .wallet(wallet)
        .on_ws(ws)
        .await?;

    // Send transaction
    let tx = TxLegacy {
        chain_id: Some(1293),
        nonce: 0,
        gas_price: 20_000_000_000,
        gas_limit: 21_000,
        to: TxKind::Call(Address::from_str("0x70997970C51812dc3A010C7d01b50e0d17dc79C8").unwrap()),
        value: U256::from(1000000000000000000u64),
        input: Bytes::default(),
    };
    let pending_tx = pod_provider.send_transaction(tx.into()).await?;

    // Get receipt
    let receipt = pending_tx.get_receipt().await?;
    println!("receipt: {:?}", receipt);

    Ok(())
}
```

! codeblock end

! sticky end

! content end
