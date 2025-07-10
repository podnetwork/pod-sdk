---
layout: single
---

! content

### Voting

Voting is straightforward. We need to send a transaction with the selected choice, passing in the proposal ID to vote in.

! content end

! content

! codeblock title="Rust"

```rust
async fn vote(
    rpc_url: String,
    contract_address: Address,
    private_key: SigningKey,
    proposal_id: ProposalId,
    choice: usize,
) -> Result<()> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .with_private_key(private_key)
        .on_url(&rpc_url)
        .await?;
    let voting = Voting::new(contract_address, pod_provider);

    let pending_tx = voting.vote(proposal_id.0, U256::from(choice)).send().await?;

    let receipt = pending_tx.get_receipt().await?;
    anyhow::ensure!(receipt.status(), "voting failed");

    Ok(())
}
```

! codeblock end

! content end

! content
