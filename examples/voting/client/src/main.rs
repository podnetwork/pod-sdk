use std::{
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
use pod_sdk::{Address, Hash, SigningKey, alloy_rpc_types::Filter, provider::PodProviderBuilder};

use pod_types::Timestamp;

use voting_bindings::voting::Voting;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    /// Address of the Notary contract
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

        #[arg(long)]
        max_choice: usize,

        #[arg(long)]
        participants: Vec<Address>,
    },
    PickWinner {
        /// Private key for signing the transaction
        #[arg(long)]
        private_key: Privatekey,

        #[arg(long)]
        choice: usize,

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
        Commands::PickWinner {
            choice,
            poll_id,
            private_key,
        } => {
            pick_winner(
                cli.rpc_url,
                cli.contract_address,
                private_key,
                poll_id,
                choice,
            )
            .await?
        }
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
                private_key,
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

async fn pick_winner(
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

    let pending_tx = voting
        .setWinningChoice(poll_id.0, U256::from(choice))
        .send()
        .await?;

    let receipt = pending_tx.get_receipt().await?;
    anyhow::ensure!(receipt.status(), "voting failed");

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
                println!("poll {}: created", poll_created.pollId)
            }
        }
    }

    Ok(())
}

async fn create_poll(
    rpc_url: String,
    contract_address: Address,
    private_key: Privatekey,
    participants: Vec<Address>,
    max_choice: usize,
    deadline: SystemTime,
) -> Result<Hash> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .with_private_key(private_key.0)
        .on_url(&rpc_url)
        .await?;
    let voting = Voting::new(contract_address, pod_provider.clone());

    let deadline = Timestamp::from(deadline);
    let pendix_tx = voting
        .createPoll(
            U256::from(deadline.as_micros()),
            U256::from(max_choice),
            participants,
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

    let poll_created = Voting::PollCreated::decode_log_data(event.data(), true)?;
    Ok(poll_created.pollId)
}
