use std::{ops::Add, str::FromStr, time::Duration};

use alloy::{
    primitives::ruint::aliases::U256,
    sol_types::{SolEvent, SolEventInterface},
};
use anyhow::{Context, Result, anyhow};
use clap::{Parser, Subcommand};
use futures::StreamExt;
use pod_sdk::{Address, Hash, SigningKey, provider::PodProviderBuilder};

use pod_types::{Timestamp, rpc::filter::LogFilterBuilder};

use voting_bindings::voting::Voting;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    /// Address of the Voting contract
    #[arg(long)]
    contract_address: Address,

    /// RPC URL for the Pod network
    #[arg(long, default_value = "ws://localhost:8545")]
    rpc_url: String,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Vote in existing poll
    Vote {
        /// Private key for signing the transaction
        #[arg(long)]
        private_key: Privatekey,
        /// ID of the  poll to vote in
        #[arg(long)]
        proposal_id: ProposalId,
        /// Choice to vote for
        #[arg(long)]
        choice: u8,
    },
    Create {
        /// Private key for signing the transaction
        #[arg(long)]
        private_key: Privatekey,

        /// Proposal deadline. Defaults to current time + 30s
        #[arg(short, long)]
        deadline: Option<u64>,

        /// Number of posssible choices
        #[arg(long)]
        threshold: usize,

        /// List of poll participants
        #[arg(short, long)]
        participants: Vec<Address>,

        /// Data to be voted on
        #[arg(long)]
        data: String,
    },
}

#[derive(Clone, Debug)]
struct ProposalId(Hash);

impl FromStr for ProposalId {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        let proposal_id = hex::decode(s.trim_start_matches("0x"))?;
        let proposal_id =
            U256::try_from_be_slice(&proposal_id).ok_or(anyhow!("invalid proposal id"))?;
        Ok(Self(proposal_id.into()))
    }
}

#[derive(Clone)]
struct Privatekey(SigningKey);

impl FromStr for Privatekey {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        let pk_bytes = hex::decode(s.trim_start_matches("0x"))?;
        let pk = pod_sdk::SigningKey::from_slice(&pk_bytes)?;
        Ok(Self(pk))
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Vote {
            private_key,
            proposal_id,
            choice,
        } => {
            vote(
                cli.rpc_url,
                cli.contract_address,
                private_key,
                proposal_id,
                choice,
            )
            .await?
        }
        Commands::Create {
            private_key,
            deadline,
            threshold,
            participants,
            data,
        } => {
            let deadline = deadline
                .map(|d| Timestamp::from_seconds(d))
                .unwrap_or_else(|| Timestamp::now().add(Duration::from_secs(10)));
            create_and_watch_proposal(
                cli.rpc_url,
                cli.contract_address,
                private_key.0,
                participants,
                threshold,
                deadline,
                data,
            )
            .await?;
        }
    }

    Ok(())
}

async fn vote(
    rpc_url: String,
    contract_address: Address,
    private_key: Privatekey,
    proposal_id: ProposalId,
    choice: u8,
) -> Result<()> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .with_private_key(private_key.0)
        .on_url(&rpc_url)
        .await?;
    let voting = Voting::new(contract_address, pod_provider);

    let pending_tx = voting.castVote(proposal_id.0, choice).send().await?;

    let receipt = pending_tx.get_receipt().await?;
    anyhow::ensure!(
        receipt.status(),
        "voting tx {} failed",
        receipt.transaction_hash
    );

    println!("Voting successful. Tx: {}", receipt.transaction_hash);

    Ok(())
}

async fn create_and_watch_proposal(
    rpc_url: String,
    contract_address: Address,
    private_key: SigningKey,
    participants: Vec<Address>,
    threshold: usize,
    deadline: Timestamp,
    data: String,
) -> Result<()> {
    let proposal_id = create_proposal(
        rpc_url.clone(),
        contract_address,
        private_key.clone(),
        participants,
        threshold,
        deadline,
        data,
    )
    .await?;

    println!("Proposal {} created", proposal_id.0);

    let rpc_url_cloned = rpc_url.clone();
    let pid2 = proposal_id.clone();
    let mut watch_handle = tokio::spawn(async move {
        if let Err(e) = watch(rpc_url_cloned, contract_address, pid2).await {
            eprintln!("watch failed: {e}");
        }
    });

    let r2 = rpc_url.clone();
    let p2 = private_key.clone();
    let mut pp_handle = tokio::spawn(async move {
        let pod_provider = PodProviderBuilder::with_recommended_settings()
            .with_private_key(p2)
            .on_url(&r2)
            .await
            .unwrap();

        if let Err(e) = pod_provider.wait_past_perfect_time(deadline).await {
            eprintln!("waiting for past perfect time failed: {e}");
        }
    });

    loop {
        tokio::select! {
            _ = &mut watch_handle => {},
            _ = &mut pp_handle => {
                break;
            },
        }
    }

    let votes = get_votes(rpc_url.clone(), contract_address, proposal_id.clone()).await?;

    if votes.len() >= threshold {
        println!("Deadline passed with {} votes, executing", votes.len());
        execute(rpc_url, contract_address, private_key, proposal_id).await?;
    } else {
        println!("Deadline passed without enough votes, proposal not executed");
    }

    Ok(())
}

async fn get_votes(
    rpc_url: String,
    contract_address: Address,
    proposal_id: ProposalId,
) -> Result<Vec<Voting::VoteCast>> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .on_url(&rpc_url)
        .await?;

    let filter = LogFilterBuilder::new()
        .address(contract_address)
        .event_signature(Voting::VoteCast::SIGNATURE_HASH)
        .topic1(proposal_id.0)
        .build();
    let logs = pod_provider.get_verifiable_logs(&filter).await?;

    let mut votes = Vec::with_capacity(logs.len());
    for log in logs {
        let vote = Voting::VoteCast::decode_log_data(log.data(), true)?;
        votes.push(vote);
    }

    Ok(votes)
}
async fn create_proposal(
    rpc_url: String,
    contract_address: Address,
    private_key: SigningKey,
    participants: Vec<Address>,
    threshold: usize,
    deadline: Timestamp,
    data: String,
) -> Result<ProposalId> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .with_private_key(private_key)
        .on_url(&rpc_url)
        .await?;
    let voting = Voting::new(contract_address, pod_provider.clone());

    let data_bytes = hex::decode(data)?;

    let pendix_tx = voting
        .createProposal(
            U256::from(deadline.as_seconds()),
            U256::from(threshold),
            participants.clone(),
            data_bytes.into(),
        )
        .send()
        .await?;

    let receipt = pendix_tx
        .get_receipt()
        .await
        .context("creating proposal failed")?;

    if !receipt.status() {
        return Err(anyhow!(
            "proposal creation tx failed: {}",
            receipt.transaction_hash
        ));
    }

    let event = receipt
        .as_ref()
        .logs()
        .first()
        .ok_or(anyhow!("missing ProposalCreated event"))?;

    let proposal_created = Voting::ProposalCreated::decode_log_data(event.data(), true)?;
    Ok(ProposalId(proposal_created.proposalId))
}

async fn watch(rpc_url: String, contract_address: Address, proposal_id: ProposalId) -> Result<()> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .on_url(rpc_url)
        .await?;

    let filter = LogFilterBuilder::new()
        .address(contract_address)
        .event_signature(Voting::VoteCast::SIGNATURE_HASH)
        .topic1(proposal_id.0)
        .build();

    let mut stream = pod_provider
        .subscribe_verifiable_logs(&filter)
        .await?
        .into_stream();

    let committee = pod_provider.get_committee().await?;

    while let Some(log) = stream.next().await {
        if log.verify(&committee).is_err() {
            eprintln!(" got invalid event!");
            continue;
        }
        let event = Voting::VotingEvents::decode_log(&log.inner.inner, true)
            .context("decoding event failed. deployed contract version might not match")?;
        match event.data {
            Voting::VotingEvents::VoteCast(vote) => {
                println!(
                    "Voter {} voted {}, tx: {}",
                    vote.voter,
                    vote.choice,
                    log.inner.transaction_hash.unwrap()
                );
            }
            _ => {}
        }
    }

    Ok(())
}

/// Execute proposal
/// Will fetch votes from the contract to select the winner automatically.
/// Note: it doesn't check if the proposal has a definitively resolved
/// (if any additional votes can still change the result) - the contract
/// does it.
async fn execute(
    rpc_url: String,
    contract_address: Address,
    private_key: SigningKey,
    proposal_id: ProposalId,
) -> Result<()> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .with_private_key(private_key)
        .on_url(&rpc_url)
        .await?;
    let voting = Voting::new(contract_address, pod_provider);

    // Execute poll
    let pending_tx = voting.execute(proposal_id.0).send().await?;

    let receipt = pending_tx.get_receipt().await?;

    if !receipt.status() {
        return Err(anyhow!(
            "failed to execute proposal: {}",
            receipt.transaction_hash
        ));
    }

    println!("Proposal executed, tx: {}", receipt.transaction_hash);

    Ok(())
}
