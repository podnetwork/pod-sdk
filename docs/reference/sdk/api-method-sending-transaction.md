! content id="sending-transactions"

### Sending Transactions

In order to submit a fund transfer transaction to the network, please follow the script.

! content end

! content

! sticky

! codeblock title="Example"

```rust
#[tokio::main]
async fn main() -> Result<()> {
    let ws_url = Url::parse("ws://127.0.0.1:8545")?;
    let ws = WsConnect::new(ws_url);

    let private_key_bytes =
        <[u8; 32]>::from_hex("abc...")?; /// Your Private key
    let field_bytes = FieldBytes::from_slice(&private_key_bytes);
    let signing_key = SigningKey::from_bytes(field_bytes)?;
    let signer = PrivateKeySigner::from(signing_key);
    let wallet = EthereumWallet::new(signer);

    let pod_provider = provider::PodProviderBuilder::new()
        .wallet(wallet)
        .on_ws(ws)
        .await?;

    let tx = TxLegacy {
        chain_id: Some(1293),
        nonce: 0,
        gas_price: 20_000_000_000,
        gas_limit: 21_000,
        to: TxKind::Call(Address::from_str("0x742d35Cc6634C0532925a3b844Bc454e4438f44e").unwrap()),
        value: U256::from(1000000000000000000u64),
        input: Bytes::default(),
    };
    
    let pending_tx = pod_provider.send_transaction(tx.into()).await?;
    let receipt = pending_tx.get_receipt().await?;
    
    println!("receipt: {:?}", receipt);
}
```

! codeblock end

! sticky end

! content end
