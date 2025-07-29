---
title: Voting
layout: single

url: /examples/voting

toc:
  notary-contract: Voting Contract
  interacting-with-the-contract: Interacting with the contract
---

# Introduction

The voting smart contract shows an example of voting for proposals.

The interface is similar to OpenZeppelin's [Governor](https://docs.openzeppelin.com/contracts/5.x/api/governance#Governor) contract, but simplified for demonstration. It can easily be extended to cover the whole interface.

To get started, clone `podnetwork/pod-sdk` github repository and go to `examples/voting` directory:

! codeblock
```bash
$ git clone github.com/podnetwork/pod-sdk && cd examples/voting
```
! codeblock end

## Smart contract

The smart contract uses two types from pod's fast types library:

! codeblock
```solidity
FastTypes.SharedCounter private voteCount;
FastTypes.OwnedCounter private hasVoted;
```
! codeblock end

The `voteCount` is the total votes (yes or no) for each proposal, and is increased by any voter. Even though this variable is shared between different senders, the order of transactions do not matter because it can only be incremented.

The `hasVoted` variable stores whether a voter has voted for a proposal or not. Each user can only alter this value for himself (the value is "owned").

! codeblock title="Solidity"

```solidity
import {requireTimeBefore, requireTimeAfter} from "pod-sdk/Time.sol";
import {FastTypes} from "pod-sdk/FastTypes.sol";

contract Voting {
    using FastTypes for FastTypes.SharedCounter;
    using FastTypes for FastTypes.OwnedCounter;

    /// ...

    mapping(bytes32 => Proposal) private proposals;
    FastTypes.SharedCounter private voteCount;
    FastTypes.OwnedCounter private hasVoted;

    /// @notice Create a new proposal
    /// @param deadline The proposal deadline in seconds
    /// @param voters The proposal participants
    /// @return proposalId The unique proposal ID
    function createProposal(uint256 deadline, uint256 threshold, address[] calldata voters, bytes calldata data)
        public
        returns (bytes32 proposalId)
    {
        // Validation
        requireTimeBefore(deadline, "Deadline must be in the future");
        require(threshold > 0, "Threshold should not be 0");
        require(voters.length > 0, "There must be at least one voter");
        bytes32 id = getProposalId(deadline, msg.sender, voters);

        // ...

        emit ProposalCreated(id, deadline, data);
        return id;
    }

    /// @notice Vote in a proposal
    /// @param proposalId The proposal ID to vote in
    /// @param choice The choice of the voter.
    function castVote(bytes32 proposalId, uint8 choice) public {
        // adds vote only if: deadline hasnt passed, voter is registered
        Proposal storage proposal = proposals[proposalId];
        requireTimeBefore(proposal.deadline, "Proposal deadline has passed or proposal does not exist");

        // Check if voter can vote
        require(proposal.voters[msg.sender] == VoterState.Registered, "sender not a voter");

        // Check if already voted
        require(hasVoted.get(proposalId, msg.sender) == 0, "already voted");

        // Mark that this voter has voted
        hasVoted.increment(proposalId, msg.sender, 1);

        // Count the vote
        voteCount.increment(keccak256(abi.encode(proposalId, choice)), 1);

        emit VoteCast(proposalId, msg.sender, choice);
    }

    /// @notice Execute proposal if succeeded
    /// @param proposalId The proposal ID to execute if succeeded
    function execute(bytes32 proposalId) public {
        Proposal storage proposal = proposals[proposalId];
        requireTimeAfter(proposal.deadline, "Proposal deadline has not passed yet");
        require(!proposal.executed, "Proposal already executed");

        bytes32 key = keccak256(abi.encode(proposalId, 1));
        voteCount.requireGte(key, proposal.threshold, "Not enough votes");

        // Mark proposal so that it cannot be executed again
        proposal.executed = true;

        _execute(proposalId);

        emit ProposalExecuted(proposalId);
    }

    // ...
}
```
! codeblock end

You can find the full smart contract on our github repository [here](https://github.com/podnetwork/pod-sdk/blob/9951f50926c771a62c75cb1fb21b5300c125861b/examples/voting/contract/src/Voting.sol#L1).

You can deploy the smart contract in the same way as in other EVM networks, for example with foundry forge command. We include a deployment script in [Voting.s.sol](https://github.com/podnetwork/pod-sdk/blob/9951f50926c771a62c75cb1fb21b5300c125861b/examples/voting/contract/script/Voting.s.sol), to use it:

! codeblock
```bash
forge script script/Voting.s.sol:VotingScript  \ 
      --rpc-url https://rpc.v1.dev.pod.network \
      --private-key $PRIVATE_KEY               \
      --broadcast
```
! codeblock end

# Interfacing with the contract

## Creating a proposal

To create a proposal call `createProposal` on the smart contract passing a deadline, the threshold for the proposal to be considered passed.

! codeblock
```rust
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
    // ...
}
```
! codeblock end

You can use the voting client implementation to create a proposal on the smart contract we have deployed:

! codeblock start
```bash
cargo run -- \
      --contract-address 0xf8643C0A56B836C8Ba12Fb09a3243f54aBDFdf6F \
      create \
      --private-key $PRIVATE_KEY \
      --threshold 1 \
      --data 1234 \
      --deadline $(($(date +%s) + 30)) \
      --participants $VOTER1_PUB_KEY,$VOTER2_PUB_KEY 
```
! codeblock end

The client will create the proposal, and wait for votes until the deadline (30 seconds from command execution).

## Voting

Voting is done by submitting a `castVote` smart contract call.

! codeblock
```rust
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
    anyhow::ensure!(receipt.status(), "voting tx {} failed", receipt.transaction_hash);

    println!("Voting successful. Tx: {}", receipt.transaction_hash);

    Ok(())
}
```
! codeblock end

You can try this out by using the voting client:

! codeblock start
```bash
cargo run -- \
     --contract-address 0xf8643C0A56B836C8Ba12Fb09a3243f54aBDFdf6F \
     vote \
     --private-key $VOTER_PRIVATE_KEY \
     --proposal-id $PROPOSAL_ID \
     --choice 1
```

! codeblock end

Remember to replace the PROPOSAL_ID with the second topic of the log on proposal creation.

## Listing votes

To list all the votes, use `get_verifiable_logs` from pod-sdk.

! codeblock
```rust
async fn get_votes(rpc_url: String, contract_address: Address, proposal_id: ProposalId) -> Result<Vec<Voting::VoteCast>> {
    let pod_provider = PodProviderBuilder::with_recommended_settings()
        .on_url(&rpc_url)
        .await?;

    let filter = LogFilterBuilder::new().address(contract_address).event_signature(Voting::VoteCast::SIGNATURE_HASH).topic1(proposal_id.0).build();
    let logs = pod_provider.get_verifiable_logs(&filter).await?;

    let mut votes = Vec::with_capacity(logs.len());
    for log in logs {
        let vote = Voting::VoteCast::decode_log_data(log.data(), true)?;
        votes.push(vote);
    }

    Ok(votes)
}
```
! codeblock end
