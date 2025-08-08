// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {requireTimeBefore, requireTimeAfter, Time} from "pod-sdk/Time.sol";
import {FastTypes} from "pod-sdk/FastTypes.sol";

contract Voting {
    using Time for Time.Timestamp;
    using FastTypes for FastTypes.SharedCounter;
    using FastTypes for FastTypes.OwnedCounter;

    enum VoterState {
        Unregistered,
        Registered,
        Voted
    }

    struct Proposal {
        Time.Timestamp deadline;
        uint256 threshold;
        address proposer;
        mapping(address => VoterState) voters;
        uint256 totalVotes;
        uint256 totalVoters; // Total number of registered voters
        bool executed;
        bytes data;
    }

    // Maps proposal ID to proposal data
    mapping(bytes32 => Proposal) private proposals;
    FastTypes.SharedCounter private voteCount;
    FastTypes.OwnedCounter private hasVoted;

    event ProposalCreated(bytes32 indexed proposalId, Time.Timestamp indexed deadline, bytes data);
    event VoteCast(bytes32 indexed proposalId, address indexed voter, uint8 choice);
    event ProposalExecuted(bytes32 indexed proposalId);

    /// @notice Calculate proposal ID
    /// @param deadline The proposal deadline in microseconds
    /// @param proposer The creator of the proposal
    /// @param voters The voters
    /// @return proposalId The unique proposal ID derived from the input parameters
    function getProposalId(Time.Timestamp deadline, address proposer, address[] calldata voters)
        public
        pure
        returns (bytes32 proposalId)
    {
        // calculates an id (hash) based on the proposal information and proposer
        return keccak256(abi.encode(deadline, proposer, keccak256(abi.encodePacked(voters))));
    }

    /// @notice Create a new proposal
    /// @param deadline The proposal deadline in microseconds
    /// @param voters The proposal participants
    /// @return proposalId The unique proposal ID
    function createProposal(Time.Timestamp deadline, uint256 threshold, address[] calldata voters, bytes calldata data)
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

        emit ProposalCreated(id, deadline, data);
        return id;
    }

    /// @notice Vote in a proposal
    /// @param proposalId The proposal ID to vote in
    /// @param choice The choice of the voter.
    function castVote(bytes32 proposalId, uint8 choice) public {
        // adds vote only if: deadline hasn't passed, voter is registered
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
