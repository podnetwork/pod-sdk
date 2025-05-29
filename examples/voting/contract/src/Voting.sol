pragma solidity ^0.8.28;

import {requireTimeBefore, requireTimeAfter} from "pod-sdk/pod/Time.sol";

contract Voting {
    enum VoterState {
        Unregistered,
        Registered,
        Voted
    }

    struct Poll {
        uint256 deadline;
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

    event PollCreated(bytes32 indexed pollId, uint256 deadline);
    event Voted(bytes32 indexed pollId, address indexed voter, uint256 indexed choice);
    event Winner(bytes32 indexed pollId, uint256 indexed choice);

    function getPollId(uint256 deadline, uint256 maxChoice, address owner, address[] calldata voters)
        public
        pure
        returns (bytes32)
    {
        // calculates an id (hash) based on the poll information and owner
        return keccak256(abi.encode(deadline, maxChoice, owner, keccak256(abi.encodePacked(voters))));
    }

    function createPoll(uint256 deadline, uint256 maxChoice, address[] calldata voters)
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

    // anyone can call, but choice must be definitely the winning one
    // a choice is definitely winning, if:
    //   even if all remaining votes are given to second highest voted, this choice would still win
    function setWinningChoice(bytes32 pollId, uint256 choice) public {
        Poll storage poll = polls[pollId];
        requireTimeAfter(poll.deadline, "Poll deadline has not passed yet");
        require(poll.totalVotes > 0, "No votes have been cast");
        require(choice > 0 && choice <= poll.maxChoice, "Choice must be between 1 and maxChoice");
        require(poll.winningChoice == 0, "Winner has already been set");

        uint256 voteCount = poll.voteCount[choice];
        require(voteCount > 0, "This choice has received no votes");

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
        require(
            voteCount - secondHighestVotes > remainingVoters,
            "This choice could still be overtaken if remaining voters vote"
        );

        // Update the winning choice
        poll.winningChoice = choice;

        // Emit the Winner event
        emit Winner(pollId, choice);
    }

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
