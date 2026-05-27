pragma solidity ^0.8.25;

contract Voting {
    struct VotingInfo {
        uint256 threshold;
        uint256 deadline;
        uint256 nonce;
        address owner;
    }

    mapping(address => bool) private _voters;
    // votingId => voter => hasVoted
    mapping(bytes32 => mapping(address => bool)) private _hasVoted;
    // choiceId => vote count
    mapping(bytes32 => uint256) private _voteCounts;

    event Winner(bytes32 indexed votingId, uint256 indexed choice);
    event Voted(bytes32 indexed votingId, address indexed voter, uint256 indexed choice);

    function votingId(VotingInfo calldata v) public pure returns (bytes32) {
        return keccak256(abi.encode(v));
    }

    function register(VotingInfo calldata v) public {
        require(msg.sender == v.owner);
        _voters[msg.sender] = true;
    }

    function vote(VotingInfo calldata v, uint256 choice) public {
        require(block.timestamp <= v.deadline, "Cannot vote after deadline");

        bytes32 vId = votingId(v);

        require(_voters[msg.sender], "Cannot vote if not registered");
        require(!_hasVoted[vId][msg.sender], "Already voted");

        _hasVoted[vId][msg.sender] = true;

        bytes32 choiceId = keccak256(abi.encode(vId, choice));
        _voteCounts[choiceId] += 1;

        emit Voted(vId, msg.sender, choice);
    }

    function setWinner(VotingInfo calldata v, uint256 choice) public {
        require(block.timestamp > v.deadline, "Cannot decide winner before deadline");

        bytes32 vId = votingId(v);
        bytes32 choiceId = keccak256(abi.encode(vId, choice));

        require(_voteCounts[choiceId] >= v.threshold, "Cannot set winner with less votes than threshold");

        emit Winner(vId, choice);
    }
}
```

Here's what changed:

- **Removed** both imports (`FastTypes` and `Time`)
- **`Time.Timestamp`** → `uint256`
- **`FastTypes.AddressSet`** → `mapping(address => bool)`
- **`FastTypes.OwnedCounter`** → `mapping(bytes32 => mapping(address => bool))`
- **`FastTypes.SharedCounter`** → `mapping(bytes32 => uint256)`
- **`requireTimeBefore(v.deadline, ...)`** → `require(block.timestamp <= v.deadline, ...)`
- **`requireTimeAfter(v.deadline, ...)`** → `require(block.timestamp > v.deadline, ...)`
- **`_voters.requireExists(...)`** → `require(_voters[msg.sender], ...)`
- **`_hasVoted.get/set`** → standard mapping read/write
- **`_voteCounts.increment`** → `+= 1`
- **`_voteCounts.requireGte`** → `require(_voteCounts[choiceId] >= ...)`
- **Removed** all `using ... for ...` statements
