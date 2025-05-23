pragma solidity ^0.8.25;

import {FastTypes} from "./lib/FastTypes.sol";
import {requireTimeBefore, requireTimeAfter} from "./lib/Deadline.sol";

contract Voting {
    using FastTypes for FastTypes.AddressSet;
    using FastTypes for FastTypes.OwnedCounter;
    using FastTypes for FastTypes.SharedCounter;

    struct VotingInfo {
        uint256 threshold;
        uint256 deadline;
        uint256 nonce;
        address owner;
    }

    FastTypes.AddressSet _voters;
    FastTypes.OwnedCounter _hasVoted;
    FastTypes.SharedCounter _voteCounts;

    event Winner(bytes32 indexed votingId, uint256 indexed choice);
    event Voted(bytes32 indexed votingId, address indexed voter, uint256 indexed choice);

    function votingId(VotingInfo calldata v) public pure returns (bytes32) {
        return keccak256(abi.encode(v));
    }

    function register(VotingInfo calldata v) public {
        require(msg.sender == v.owner);

        _voters.add(msg.sender);
    }

    function vote(VotingInfo calldata v, uint256 choice) public {
        requireTimeBefore(v.deadline, "Cannot vote after deadline");

        bytes32 vId = votingId(v);
        _voters.requireExists(msg.sender, "Cannot vote if not registered");

        require(_hasVoted.get(vId, msg.sender) == 0);
        _hasVoted.set(vId, msg.sender, 1);

        bytes32 choiceId = keccak256(abi.encode(vId, choice));
        _voteCounts.increment(choiceId, 1);

        emit Voted(vId, msg.sender, choice);
    }

    function setWinner(VotingInfo calldata v, uint256 choice) public {
        requireTimeAfter(v.deadline, "Cannot decide winner before deadline");

        bytes32 vId = votingId(v);
        bytes32 choiceId = keccak256(abi.encode(vId, choice));
        _voteCounts.requireGte(choiceId, v.threshold, "Cannot set winner with less votes than threshold");

        emit Winner(vId, choice);
    }
}
