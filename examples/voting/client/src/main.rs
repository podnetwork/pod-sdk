use std::{
    collections::BTreeMap,
    str::FromStr,
    time::{Duration, SystemTime},
};

use alloy::{
    primitives::ruint::aliases::U256,
    sol_types::{SolEvent, SolEventInterface},
};
use anyhow::{Context, Result, anyhow, ensure};
use clap::{Parser, Subcommand};
use futures::StreamExt;
use pod_sdk::{Address, Hash, SigningKey, provider::PodProviderBuilder};

use pod_types::{Timestamp, rpc::filter::LogFilterBuilder};

use voting_bindings::voting::Voting;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    /// Address of the Voting contract
    #[arg(long, default_value = "0x12296f2D128530a834460DF6c36a2895B793F26d")]
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
        poll_id: PollId,
        /// Choice to vote for
        #[arg(long)]
        choice: usize,
    },
    CreatePoll {
        /// Private key for signing the transaction
        #[arg(long)]
        private_key: Privatekey,

        /// Poll deadline. Defaults to current time + 30s
        #[arg(short, long)]
        deadline: Option<humantime::Timestamp>,

        /// Number of posssible choices
        #[arg(long)]
        max_choice: usize,

        /// List of poll participants
        #[arg(short, long)]
        participants: Vec<Address>,
    },
    ClosePoll {
        /// Private key for signing the transaction
        #[arg(long)]
        private_key: Privatekey,

        #[arg(long)]
        poll_id: PollId,
    },
    /// Watch poll events
    Watch {},
}

#[derive(Clone)]
struct PollId(Hash);

impl FromStr for PollId {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        let poll_id = hex::decode(s.trim_start_matches("0x"))?;
        let poll_id = U256::try_from_be_slice(&poll_id).ok_or(anyhow!("invalid poll id"))?;
        Ok(Self(poll_id.into()))
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
        Commands::ClosePoll {
            poll_id,
            private_key,
        } => close_poll(cli.rpc_url, cli.contract_address, private_key.0, poll_id).await?,
        Commands::Vote {
            private_key,
            poll_id,
            choice,
        } => {
            vote(
                cli.rpc_url,
                cli.contract_address,
                private_key,
                poll_id,
                choice,
            )
            .await?
        }
        Commands::CreatePoll {
            private_key,
            deadline,
            max_choice,
            participants,
        } => {
            let deadline = deadline
                .map(|ht| ht.into())
                .unwrap_or_else(|| SystemTime::now() + Duration::from_secs(30));
            let poll_id = create_poll(
                cli.rpc_url,
                cli.contract_address,
                private_key.0,
                participants,
                max_choice,
                deadline,
            )
            .await?;
            println!("Poll {} created", poll_id);
        }
        Commands::Watch {} => watch(cli.rpc_url, cli.contract_address).await?,
    }

    Ok(())
}

/// Close selected poll.
/// Will fetch votes from the contract to select the winner automatically.
/// Note: it doesn't check if the poll has a definitively resolved
/// (if any additional votes can still change the result) - the contract
/// does it.
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
    let choice = choices[0];
    println!("selected {choice} with {votes} votes");

    // 2. Close poll with selected winner
    let pending_tx = voting
        .setWinningChoice(poll_id.0, U256::from(choice))
        .send()
        .await?;

    let receipt = pending_tx.get_receipt().await?;
    anyhow::ensure!(receipt.status(), "failed to select winner");

    Ok(())
}

async fn vote(
    rpc_url: String,
    contract_address: Address,
    private_key: Privatekey,
    poll_id: PollId,
    choice: usize,
) -> Result<()> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .with_private_key(private_key.0)
        .on_url(&rpc_url)
        .await?;
    let voting = Voting::new(contract_address, pod_provider);

    let pending_tx = voting.vote(poll_id.0, U256::from(choice)).send().await?;

    let receipt = pending_tx.get_receipt().await?;
    anyhow::ensure!(receipt.status(), "voting failed");

    Ok(())
}

async fn watch(rpc_url: String, contract_address: Address) -> Result<()> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .on_url(rpc_url)
        .await?;

    let filter = LogFilterBuilder::new().address(contract_address).build();

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
        let event = Voting::VotingEvents::decode_log(&log.inner.inner)
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

    let event = receipt
        .as_ref()
        .logs()
        .first()
        .ok_or(anyhow!("missing PollCreated event"))?;

    let poll_created = Voting::PollCreated::decode_log_data(event.data())?;
    Ok(poll_created.pollId)
}
