! content id="usage"

## Interacting with the contract

A Rust-based client can interact with the Notary contract via the `pod-sdk`, which includes utilities for constructing
transactions, querying state, and subscribing to events.

### Generating bindings

Bindings can be auto-generated using the
[`alloy-sol-types::sol!`](https://docs.rs/alloy-sol-macro/1.1.2/alloy_sol_macro/macro.sol.html) macro. It needs to be
passed path to the smart contract file.

! content end

! content

! sticky

! codeblock title="Rust"

```rust
alloy::sol!(
    #[sol(rpc)]
    "Notary.sol"
);

```

! codeblock end

! sticky end

! content end

! content

---

### Timestamping a document

Here's how a document can be timestamped.

First, we need to create a `PodProvider` and an instance of the `Notary` contract client.

```rust
let pod_provider = PodProviderBuilder::with_recommended_settings()
    .with_private_key(pk)
    .on_url(&rpc_url)
    .await?;
let notary = Notary::new(contract_address, pod_provider.clone());
```

Then, the document is hashed using `keccak256` and sent in a transaction calling the `timestamp()` function.

```rust
let document_hash = keccak256(doc);

let pendix_tx = notary
    .timestamp(document_hash, U256::from(timestamp.as_micros()))
    .send()
    .await?;

let receipt = pendix_tx.get_receipt().await?;
anyhow::ensure!(receipt.status(), "timestamping failed");
```

Finally, we wait for the _past perfect time_ after the `timestamp` to make sure its value settled and will _never_
change (ensure **finality**).

```rust
pod_provider
    .wait_past_perfect_time(timestamp)
    .await
    .context("waiting for timestamp settlement")?;

let got_ts = get_timestamp(rpc_url, contract_address, document_hash)
    .await
    .context("getting timestamp")?;

if let Some(got_ts) = got_ts {
    ensure!(
        got_ts == timestamp.into(),
        "document has an earlier timestamp {} already",
        humantime::format_rfc3339(got_ts)
    );
    Ok((document_hash, got_ts))
} else {
    Err(anyhow!("failed to set timestamp"))
}
```

! content end

! content

! sticky

! codeblock title="Rust"

```rust
async fn timestamp(
    rpc_url: String,
    contract_address: Address,
    private_key: String,
    document: String,
    timestamp: Timestamp,
) -> Result<(Hash, SystemTime)> {
    let pk_bytes = hex::decode(private_key)?;
    let pk = pod_sdk::SigningKey::from_slice(&pk_bytes)?;

    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .with_private_key(pk)
        .on_url(&rpc_url)
        .await?;
    let notary = Notary::new(contract_address, pod_provider.clone());

    let document_hash = keccak256(doc);

    let pendix_tx = notary
        .timestamp(document_hash, U256::from(timestamp.as_micros()))
        .send()
        .await?;

    let receipt = pendix_tx.get_receipt().await?;
    anyhow::ensure!(receipt.status(), "timestamping failed");

    // Wait past perfect time to make sure document timestamp
    // is settled forever.
    pod_provider
        .wait_past_perfect_time(timestamp)
        .await
        .context("waiting for timestamp settlement")?;

    let got_ts = get_timestamp(rpc_url, contract_address, document_hash)
        .await
        .context("getting timestamp")?;

    if let Some(got_ts) = got_ts {
        ensure!(
            got_ts == timestamp.into(),
            "document has an earlier timestamp {} already",
            humantime::format_rfc3339(got_ts)
        );
        Ok((document_hash, got_ts))
    } else {
        Err(anyhow!("failed to set timestamp"))
    }
}

```

! codeblock end

! sticky end

! content end

---

! content

### Retrieving a document timestamp

In order to get a timestamp we need to create a `PodProvider` again, but this time it doesn't need a private key. The
reason is because we will not be executing a transaction, but only calling a contract method, which can happen on a
`node` only (it never reaches a `validator`).

```rust
let timestamp = notary.timestamps(hash).call().await?._0;
if timestamp.is_zero() {
    return Ok(None);
}

```

A `timestamp` equal to zero means that the document is **not** timestamped

! content end

! content

! sticky

! codeblock title="Rust"

```rust
async fn get_timestamp(
    rpc_url: String,
    contract_address: Address,
    hash: Hash,
) -> Result<Option<SystemTime>> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .on_url(rpc_url)
        .await?;

    let notary = Notary::new(contract_address, pod_provider);

    let timestamp = notary.timestamps(hash).call().await?._0;
    if timestamp.is_zero() {
        return Ok(None);
    }

    Ok(Some(decode_timestamp(timestamp)?))
}
```

! codeblock end

! sticky end

! content end

---

! content

### Watching `DocumentTimestamped` event

The `watch()` function demonstrates how to subscribe to `DocumentTimestamped` events.

First, it creates a filter for the `DocumentTimestamped` event.

```rust
let mut filter = Filter::new()
    .address(contract_address)
    .event_signature(Notary::DocumentTimestamped::SIGNATURE_HASH);
```

It then optionally filters by a specific submitter address.

```rust
if let Some(submitter) = submitter {
    filter = filter.topic2(submitter.into_word());
}
```

It subscribes to events with `subscribe_verifiable_logs()` to receive logs with validator attestations.

```rust
let mut stream = pod_provider
    .subscribe_verifiable_logs(&filter)
    .await?
    .into_stream();
```

The received logs are decoded and **verified** each event against the **committee** retrieved from the node.

```rust
let committee = pod_provider.get_committee().await?;

while let Some(log) = stream.next().await {
    if !log.verify(&committee)? {
        eprintln!(" got invalid event!");
        continue;
    }
    let event = Notary::DocumentTimestamped::decode_log(&log.inner.inner, true)
        .context("decoding event failed. deployed contract version might not match")?;
}
```

It finally prints the resulting timestamp, document hash, and submitter address.

! content end

! content

! sticky

! codeblock title="Rust"

```rust
async fn watch(
    rpc_url: String,
    contract_address: Address,
    submitter: Option<Address>,
) -> Result<()> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .on_url(rpc_url)
        .await?;

    let mut filter = Filter::new()
        .address(contract_address)
        .event_signature(Notary::DocumentTimestamped::SIGNATURE_HASH);
    if let Some(submitter) = submitter {
        filter = filter.topic2(submitter.into_word());
    }

    let mut stream = pod_provider
        .subscribe_verifiable_logs(&filter)
        .await?
        .into_stream();

    let committee = pod_provider.get_committee().await?;

    while let Some(log) = stream.next().await {
        if !log.verify(&committee)? {
            eprintln!(" got invalid event!");
            continue;
        }
        let event = Notary::DocumentTimestamped::decode_log(&log.inner.inner, true)
            .context("decoding event failed. deployed contract version might not match")?;

        let timestamp = humantime::format_rfc3339(decode_timestamp(event.timestamp)?);
        println!(
            "Address {} timestamped  document hash {} @ {}",
            event.submitter, event.documentHash, timestamp
        );
    }

    Ok(())
}
```

! codeblock end

! sticky end

! content end

