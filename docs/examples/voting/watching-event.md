---
layout: simple
---

! content

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