// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {requireTimeBefore, requireTimeAfter, Time} from "pod-sdk/Time.sol";
import {requireQuorum} from "pod-sdk/Quorum.sol";

contract Voting {
    using Time for Time.Timestamp;

    enum VoterState {
        Unregistered,
        Registered,
        Voted
    }

    struct Poll {
        Time.Timestamp deadline;
        uint256 maxChoice;
        address owner;
        mapping(address => VoterState) voters;
        mapping(uint256 => uint256) voteCount;
        uint256 totalVotes;
        uint256 totalVoters; // Total number of registered voters
        uint256 winningChoice; // 0 means not set
    }

    // Maps poll ID to poll data
    mapping(bytes32 => Poll) private polls;

    event PollCreated(bytes32 indexed pollId, Time.Timestamp deadline);
    event Voted(bytes32 indexed pollId, address indexed voter, uint256 indexed choice);
    event Winner(bytes32 indexed pollId, uint256 indexed choice);

    /// @notice Calculate poll ID
    /// @param deadline The poll deadline
    /// @param maxChoice The maximum choice in a poll
    /// @param owner The crator of the poll
    /// @param voters The poll participants
    /// @return pollId The unique poll ID derived from the input parameters
    function getPollId(Time.Timestamp deadline, uint256 maxChoice, address owner, address[] calldata voters)
        public
        pure
        returns (bytes32 pollId)
    {
        // calculates an id (hash) based on the poll information and owner
        return keccak256(abi.encode(deadline, maxChoice, owner, keccak256(abi.encodePacked(voters))));
    }

    /// @notice Create a new poll
    /// @param deadline The poll deadline
    /// @param maxChoice The maximum choice in a poll
    /// @param voters The poll participants
    /// @return pollId The unique poll ID
    function createPoll(Time.Timestamp deadline, uint256 maxChoice, address[] calldata voters)
        public
        returns (bytes32 pollId)
    {
        // Validation
        requireTimeBefore(deadline, "Deadline must be in the future");
        require(maxChoice > 0, "MaxChoice must be greater than zero");
        require(voters.length > 0, "There must be at least one voter");

        bytes32 id = getPollId(deadline, maxChoice, msg.sender, voters);

        // Create new poll
        Poll storage newPoll = polls[id];
        require(newPoll.totalVoters == 0, "poll already exists");

        newPoll.deadline = deadline;
        newPoll.maxChoice = maxChoice;
        newPoll.owner = msg.sender;
        newPoll.totalVoters = voters.length;

        // Register all voters
        for (uint256 i = 0; i < voters.length; i++) {
            newPoll.voters[voters[i]] = VoterState.Registered;
        }

        emit PollCreated(id, deadline);
        return id;
    }

    /// @notice Vote in a poll
    /// @param pollId The poll ID to vote in
    /// @param choice The choice to vote for. Must be between 1 and maxChoice
    function vote(bytes32 pollId, uint256 choice) public {
        // adds vote only if: deadline hasnt passed, voter is registered
        Poll storage poll = polls[pollId];
        requireTimeBefore(poll.deadline, "Poll deadline has passed or poll does not exist");
        require(choice > 0 && choice <= poll.maxChoice, "Choice must be between 1 and maxChoice");

        // Check if voter can vote
        require(poll.voters[msg.sender] == VoterState.Registered, "sender can't vote");

        // Mark that this voter has voted
        poll.voters[msg.sender] = VoterState.Voted;

        // Count the vote
        poll.voteCount[choice]++;
        poll.totalVotes++;

        emit Voted(pollId, msg.sender, choice);
    }

    /// @notice Close a poll, selecting the winning choice.
    /// Anyone can call, but choice must be definitely the winning one.
    /// A choice is definitely winning, when even if all remaining votes
    /// are given to second highest voted, this choice would still win.
    /// @param pollId The poll ID to close
    /// @param choice the selected winning choice
    function setWinningChoice(bytes32 pollId, uint256 choice) public {
        Poll storage poll = polls[pollId];
        requireTimeAfter(poll.deadline, "Poll deadline has not passed yet");
        require(choice > 0 && choice <= poll.maxChoice, "Choice must be between 1 and maxChoice");

        uint256 voteCount = poll.voteCount[choice];

        // Calculate remaining voters
        uint256 remainingVoters = poll.totalVoters - poll.totalVotes;

        // Find second highest vote count
        uint256 secondHighestVotes = 0;
        for (uint256 i = 1; i <= poll.maxChoice; i++) {
            if (i == choice) continue; // Skip the choice we're checking

            if (poll.voteCount[i] > secondHighestVotes) {
                secondHighestVotes = poll.voteCount[i];
            }
        }

        // Verify this choice has enough votes that it cannot be overtaken
        requireQuorum(
            voteCount - secondHighestVotes > remainingVoters,
            "This choice could still be overtaken if remaining voters vote"
        );

        // Update the winning choice
        poll.winningChoice = choice;

        // Emit the Winner event
        emit Winner(pollId, choice);
    }

    /// @notice Get poll data
    /// @param pollId The poll ID to retrieve
    /// @return participants The total number of participants of the poll
    /// @return votes A list containing number of votes per each choice.
    /// The choice "1" is the first element in the list.
    function getVotes(bytes32 pollId) public view returns (uint256 participants, uint256[] memory votes) {
        Poll storage poll = polls[pollId];
        require(poll.maxChoice > 0, "poll doesn't exist");

        uint256[] memory votesPerChoice = new uint256[](poll.maxChoice);
        for (uint256 i = 0; i < poll.maxChoice; i++) {
            votesPerChoice[i] = poll.voteCount[i + 1];
        }

        return (poll.totalVoters, votesPerChoice);
    }
}
