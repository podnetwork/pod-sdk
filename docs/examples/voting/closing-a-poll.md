---
layout: simple
---

! content

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

! content end

! content
