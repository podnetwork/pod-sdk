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

## Smart contract

The smart contract uses two types from pod's fast types library:

! codeblock
```solidity
FastTypes.SharedCounter private voteCount;
FastTypes.OwnedCounter private hasVoted;
```
! codeblock end

The voteCount is the total votes (yes or no) for each proposal, and is increased by any voter.

The hasVoted variable stores whether a voter has voted for a proposal or not.

! codeblock title="Solidity"

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {requireTimeBefore, requireTimeAfter} from "pod-sdk/Time.sol";
import {FastTypes} from "pod-sdk/FastTypes.sol";

contract Voting {
    using FastTypes for FastTypes.SharedCounter;
    using FastTypes for FastTypes.OwnedCounter;

    enum VoterState {
        Unregistered,
        Registered,
        Voted
    }

    struct Proposal {
        uint256 deadline;
	uint256 threshold;
        address proposer;
        mapping(address => VoterState) voters;
        uint256 totalVotes;
        uint256 totalVoters; // Total number of registered voters
        bool executed;
    }

    // Maps proposal ID to proposal data
    mapping(bytes32 => Proposal) private proposals;
    FastTypes.SharedCounter private voteCount;
    FastTypes.OwnedCounter private hasVoted;

    event ProposalCreated(bytes32 indexed proposalId, uint256 deadline);
    event VoteCast(bytes32 indexed proposalId, address indexed voter, uint8 choice);
    event ProposalExecuted(bytes32 indexed proposalId);

    /// @notice Calculate proposal ID
    /// @param deadline The proposal deadline in seconds
    /// @param proposer The creator of the proposal
    /// @param voters The voters
    /// @return proposalId The unique proposal ID derived from the input parameters
    function getProposalId(uint256 deadline, address proposer, address[] calldata voters)
        public
        pure
        returns (bytes32 proposalId)
    {
        // calculates an id (hash) based on the proposal information and proposer
        return keccak256(abi.encode(deadline, proposer, keccak256(abi.encodePacked(voters))));
    }

    /// @notice Create a new proposal
    /// @param deadline The proposal deadline in seconds
    /// @param voters The proposal participants
    /// @return proposalId The unique proposal ID
    function createProposal(uint256 deadline, uint256 threshold, address[] calldata voters)
        public
        returns (bytes32 proposalId)
    {
        // Validation
        requireTimeBefore(deadline, "Deadline must be in the future");
	require(threshold > 0, "Threshold should not be 0");
        require(voters.length > 0, "There must be at least one voter");

        bytes32 id = getProposalId(deadline, msg.sender, voters);

        // Create new proposal
        Proposal storage newProposal = proposals[id];
        require(newProposal.totalVoters == 0, "proposal already exists");

        newProposal.deadline = deadline;
        newProposal.proposer = msg.sender;
        newProposal.totalVoters = voters.length;

        // Register all voters
        for (uint256 i = 0; i < voters.length; i++) {
            newProposal.voters[voters[i]] = VoterState.Registered;
        }

        emit ProposalCreated(id, deadline);
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

    function _execute(bytes32 proposalId) internal {
        // hook to run execution logic
    }
}
```

! codeblock end

# Interfacing with the contract

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