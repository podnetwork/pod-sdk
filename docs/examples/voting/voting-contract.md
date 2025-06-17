---
layout: simple
---

! content id="notary-contract"

## Voting Contract

### Core concepts

#### Voter state

```solidity
enum VoterState { Unregistered, Registered, Voted }
```

- **Unregistered**: Not authorized to vote.
- **Registered**: Authorized but has not yet voted.
- **Voted**: Already cast a vote and cannot vote again.

#### Poll structure

```solidity
struct Poll {
    uint256 deadline;
    uint256 maxChoice;
    address owner;
    mapping(address => VoterState) voters;
    mapping(uint256 => uint256) voteCount;
    uint256 totalVotes;
    uint256 totalVoters;
    uint256 winningChoice;
}
```

A Poll includes:

- A deadline, choice count, and owner.
- A voter registry and vote tally.
- The selected winner, which can only be set post-deadline.

#### Poll ID

Polls are uniquely identified by their IDs, which are derived from the input arguments used to create them. ID is used in all
contract functions to refer to a particular poll.

```solidity
bytes32 pollId = keccak256(abi.encode(
    deadline,
    maxChoice,
    owner,
    keccak256(abi.encodePacked(voters))
));

```

### Smart contract interface

#### State

The contract has **no** publicly accessible state. Instead, it exposes a method to query the state of a poll.

#### Events

- `PollCreated(bytes32 pollId, uint256 deadline)`
- `Voted(bytes32 pollId, address voter, uint256 choice)`
- `Winner(bytes32 pollId, uint256 choice)`

These events allow external systems (e.g. client applications) to subscribe and respond to on-chain activity in
real-time. For example, an application can obtain the ID of the poll created by the transaction by reading the
`PollCreated` event in its receipt.

#### Functions

##### createPoll

```solidity
function createPoll(uint256 deadline, uint256 maxChoice, address[] calldata voters) public returns (bytes32)
```

Used to create a new poll.

- Validations:
  - The poll ID is unique.
  - The deadline is in the future.
  - There is at least one voter and one choice.
- Emits `PollCreated`, which contains the poll ID.

##### vote

```solidity
function vote(bytes32 pollId, uint256 choice) public
```

- Validations:
  - The poll must exist and be open (with the deadline not yet passed).
  - The sender must be a registered voter who hasn't yet voted.
  - The choice must be valid (1 through maxChoice).

- Updates voter state and tallies the vote.
- Emits `Voted(pollId, voter, choice)`.

##### setWinningChoice

```solidity
function setWinningChoice(bytes32 pollId, uint256 choice) public
```

- Validations:
  - The deadline must have passed.
  - The winning choice hasn’t already been set.
  - The choice is the definitive winner.
- Emits `Winner(pollId, choice)`.

Note that it is not required that all participants have already cast their votes. This is intentional to prevent a dishonest voter
from blocking the poll. The contract assesses if the selected choice is definitely the winner, no matter if more votes
come in for another candidate.

##### getVotes

```solidity
function getVotes(bytes32 pollId) public view returns (uint participants, uint[] memory votes)
```

It's a helper function that applications can call to gain insight into the poll state and calculate the winner.

! content end

! content

! sticky

! codeblock title="Solidity"

```solidity
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
        uint256 totalVoters;  // Total number of registered voters
        uint256 winningChoice; // 0 means not set
    }

    // Maps poll ID to poll data
    mapping(bytes32 => Poll) private polls;

    event PollCreated(bytes32 indexed pollId, uint256 deadline);
    event Voted(bytes32 indexed pollId, address indexed voter, uint256 indexed choice);
    event Winner(bytes32 indexed pollId, uint256 indexed choice);

    function getPollId(
        uint256 deadline,
        uint256 maxChoice,
        address owner,
        address[] calldata voters
    ) public pure returns (bytes32) {
        // calculates an id (hash) based on the poll information and owner
        return keccak256(abi.encode(
            deadline,
            maxChoice,
            owner,
            keccak256(abi.encodePacked(voters))
        ));
    }

    function createPoll(
        uint256 deadline,
        uint256 maxChoice,
        address[] calldata voters
    ) public returns (bytes32 pollId){
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
        // adds vote only if: deadline hasn't passed, voter is registered
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
        require(voteCount - secondHighestVotes > remainingVoters,
                "This choice could still be overtaken if remaining voters vote");

        // Update the winning choice
        poll.winningChoice = choice;

        // Emit the Winner event
        emit Winner(pollId, choice);
    }

    function getVotes(bytes32 pollId) public view returns (uint participants, uint[] memory votes) {
        Poll storage poll = polls[pollId];
        require(poll.maxChoice > 0, "poll doesn't exist");

        uint[] memory votesPerChoice = new uint256[](poll.maxChoice);
        for (uint i = 0; i < poll.maxChoice; i++) {
            votesPerChoice[i] = poll.voteCount[i+1];
        }

        return (poll.totalVoters, votesPerChoice);
    }
}
```

! codeblock end

! sticky end

! content end
