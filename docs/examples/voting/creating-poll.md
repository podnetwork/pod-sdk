---
layout: simple
---

! content

### Creating a poll

Creating a poll is a two-step process.

First, we create and send a transaction to create the poll, passing in:

- deadline
- maximum choice (participants will vote for choices in 1 -> max_choice)
- list of participants (people that can vote in the poll)

```rust
let pendix_tx = voting
    .createPoll(
        U256::from(deadline.as_seconds()),
        U256::from(max_choice),
        participants.clone(),
    )
    .send()
    .await?;

let receipt = pendix_tx.get_receipt().await?;
```

Next, we need to retrieve the poll ID from the transaction receipt:

```rust
let event = receipt
    .as_ref()
    .logs()
    .first()
    .ok_or(anyhow!("missing PollCreated event"))?;

let poll_created = Voting::PollCreated::decode_log_data(event.data(), true)?;
Ok(poll_created.pollId)
```

! content end

! content

! sticky

! codeblock title="Rust"

```rust
async fn create_poll(
    rpc_url: String,
    contract_address: Address,
    private_key: SigningKey,
    participants: Vec<Address>,
    max_choice: usize,
    deadline: SystemTime,
) -> Result<Hash> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .with_private_key(private_key)
        .on_url(&rpc_url)
        .await?;
    let voting = Voting::new(contract_address, pod_provider.clone());

    let deadline = Timestamp::from(deadline);
    let pendix_tx = voting
        .createPoll(
            U256::from(deadline.as_seconds()),
            U256::from(max_choice),
            participants.clone(),
        )
        .send()
        .await?;

    let receipt = pendix_tx.get_receipt().await?;
    anyhow::ensure!(receipt.status(), "creating vote failed");

    let committee = pod_provider.get_committee().await?;
    ensure!(
        receipt.verify(&committee)?,
        "receipt failed committee validation"
    );

    // extract poll ID
    let event = receipt
        .as_ref()
        .logs()
        .first()
        .ok_or(anyhow!("missing PollCreated event"))?;

    let poll_created = Voting::PollCreated::decode_log_data(event.data(), true)?;
    Ok(poll_created.pollId)
}
```

! codeblock end

! sticky end

! content end

! content
