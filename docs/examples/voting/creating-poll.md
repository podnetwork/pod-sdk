---
layout: single
---

! content

### Creating a proposal

Creating a proposal is a two-step process.

First, we create and send a transaction to create the proposal, passing in:

- deadline
- list of participants (people that can vote in the proposal)

```rust
let pendix_tx = voting
    .createProposal(
        U256::from(deadline.as_seconds()),
        participants.clone(),
    )
    .send()
    .await?;

let receipt = pendix_tx.get_receipt().await?;
```

Next, we need to retrieve the proposal ID from the transaction receipt:

```rust
let event = receipt
    .as_ref()
    .logs()
    .first()
    .ok_or(anyhow!("missing ProposalCreated event"))?;

let proposal_created = Voting::ProposalCreated::decode_log_data(event.data(), true)?;
Ok(proposal_created.proposalId)
```

! content end

! content

Complete example for creating a proposal with `pod_sdk`:

! codeblock title="Rust"

```rust
async fn create_proposal(
    rpc_url: String,
    contract_address: Address,
    private_key: SigningKey,
    participants: Vec<Address>,
    deadline: SystemTime,
) -> Result<Hash> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .with_private_key(private_key)
        .on_url(&rpc_url)
        .await?;
    let voting = Voting::new(contract_address, pod_provider.clone());

    let deadline = Timestamp::from(deadline);
    let pendix_tx = voting
        .createProposal(
            U256::from(deadline.as_seconds()),
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

    // extract proposal ID
    let event = receipt
        .as_ref()
        .logs()
        .first()
        .ok_or(anyhow!("missing ProposalCreated event"))?;

    let proposal_created = Voting::ProposalCreated::decode_log_data(event.data(), true)?;
    Ok(proposal_created.proposalId)
}
```

! codeblock end

! content end

! content
