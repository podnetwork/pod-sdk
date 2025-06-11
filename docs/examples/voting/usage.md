! content

## Interacting with the contract

A Rust-based client can interact with the Voting contract via the `pod-sdk`, which includes utilities for constructing
transactions, querying state, and subscribing to events.

! content end

! content empty

! content

---

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
        "receipt failed comittee validation"
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

---

### Voting

Voting is straightforward. We need to send a transaction with the selected choice, passing in the poll ID to vote in.

! content end

! content

! sticky

! codeblock title="Rust"

```rust
async fn vote(
    rpc_url: String,
    contract_address: Address,
    private_key: SigningKey,
    poll_id: PollId,
    choice: usize,
) -> Result<()> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .with_private_key(private_key)
        .on_url(&rpc_url)
        .await?;
    let voting = Voting::new(contract_address, pod_provider);

    let pending_tx = voting.vote(poll_id.0, U256::from(choice)).send().await?;

    let receipt = pending_tx.get_receipt().await?;
    anyhow::ensure!(receipt.status(), "voting failed");

    Ok(())
}
```

! codeblock end

! sticky end

! content end

! content

---

### Closing a poll

To close a poll, we need to find the winner. In order to to this, we first call `getVotes` method of the contract and we
look for a choice with the most votes.

```rust
 let votes = voting
     .getVotes(poll_id.0)
     .call()
     .await
     .context("querying existing votes")?;

 let mut votes_to_choices = BTreeMap::<usize, Vec<usize>>::new();
 for (choice, votes) in votes
     .votes
     .iter()
     .enumerate()
     .map(|(i, v)| (i + 1, usize::try_from(v).unwrap()))
 {
     votes_to_choices.entry(votes).or_default().push(choice);
 }
 let (votes, choices) = votes_to_choices.pop_last().ok_or(anyhow!("no votes yet"))?;
 ensure!(
     choices.len() == 1,
     "choices {choices:?} ex aequo: can't select winner"
 );
 let winner = choices[0];
```

Once the winner is known, we can call `setWinningChoice`, which closes the poll.

! content end

! content

! sticky

! codeblock title="Rust"

```rust
async fn close_poll(
    rpc_url: String,
    contract_address: Address,
    private_key: SigningKey,
    poll_id: PollId,
) -> Result<()> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .with_private_key(private_key)
        .on_url(&rpc_url)
        .await?;
    let voting = Voting::new(contract_address, pod_provider);

    // 1. Check if winner is clear
    let votes = voting
        .getVotes(poll_id.0)
        .call()
        .await
        .context("querying existing votes")?;

    let mut votes_to_choices = BTreeMap::<usize, Vec<usize>>::new();
    for (choice, votes) in votes
        .votes
        .iter()
        .enumerate()
        .map(|(i, v)| (i + 1, usize::try_from(v).unwrap()))
    {
        votes_to_choices.entry(votes).or_default().push(choice);
    }
    let (votes, choices) = votes_to_choices.pop_last().ok_or(anyhow!("no votes yet"))?;
    ensure!(
        choices.len() == 1,
        "choices {choices:?} ex aequo: can't select winner"
    );
    let winner = choices[0];
    println!("selected {winner} with {votes} votes");

    // 2. Close poll with selected winner
    let pending_tx = voting
        .setWinningChoice(poll_id.0, U256::from(winner))
        .send()
        .await?;

    let receipt = pending_tx.get_receipt().await?;
    anyhow::ensure!(receipt.status(), "failed to select winner");

    Ok(())
}
```

! codeblock end

! sticky end

! content end

! content

---

### Watching events

In order to watch contract events, we first create a `PodProvider` (there is no need to pass a private key) and
subscribe to logs with `provider.subscribe_verifiable_logs()`, passing in a filter filtering by the contract address
only.

Next, we consume logs in a loop:

- verifying them against the committee,
- decoding them using:

```rust
Voting::VotingEvents::decode_log(&log.inner.inner, true);
```

which returns an enum with variants respective to event types that the contract emits.

! content end

! content

! sticky

! codeblock title="Rust"

```rust
async fn watch(rpc_url: String, contract_address: Address) -> Result<()> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .on_url(rpc_url)
        .await?;

    let filter = Filter::new().address(contract_address);

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
        let event = Voting::VotingEvents::decode_log(&log.inner.inner, true)
            .context("decoding event failed. deployed contract version might not match")?;
        match event.data {
            Voting::VotingEvents::Voted(voted) => {
                println!(
                    "poll {}: voter {} voted for {}",
                    voted.pollId, voted.voter, voted.choice
                );
            }
            Voting::VotingEvents::Winner(winner) => {
                println!("poll {}: winner selected: {}", winner.pollId, winner.choice);
            }
            Voting::VotingEvents::PollCreated(poll_created) => {
                let deadline: u64 = poll_created.deadline.try_into()?;
                let deadline = Timestamp::from_seconds(deadline);
                println!(
                    "poll {}: created with deadline: {}",
                    poll_created.pollId,
                    humantime::format_rfc3339(deadline.into())
                );
            }
        }
    }

    Ok(())
}
```

! codeblock end

! sticky end

! content end
