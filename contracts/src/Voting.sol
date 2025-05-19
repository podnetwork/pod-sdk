pragma solidity ^0.8.25;

import {FastTypes} from "./lib/FastTypes.sol";
import {requireTimeBefore,requireTimeAfter} from "./lib/Deadline.sol";

contract Voting {
    using FastTypes for FastTypes.Set;
    using FastTypes for FastTypes.Owned;
    using FastTypes for FastTypes.Counter;
    using FastTypes for FastTypes.Constant;

    struct VotingInfo {
        uint256 threshold;
        uint256 deadline;
        uint256 nonce;
        address owner;
    }

    event Winner(bytes32 indexed votingId, uint256 indexed choice);
    event Voted(bytes32 indexed votingId, address indexed voter, uint256 indexed choice);

    function votingId(VotingInfo calldata v) public pure returns (bytes32) {
        return keccak256(abi.encode(v));
    }

    function register(VotingInfo calldata v) public {
        require(msg.sender == v.owner);

        FastTypes.Set memory voters = FastTypes.Set(votingId(v));
        voters.insert(bytes32(uint256(uint160(msg.sender))));
    }

    function vote(VotingInfo calldata v, uint256 choice) public {
        requireTimeBefore(v.deadline, "Cannot vote after deadline");

        bytes32 vId = votingId(v);
        FastTypes.Set memory voters = FastTypes.Set(vId);
        voters.requireExist(bytes32(uint256(uint160(msg.sender))));

        FastTypes.Owned memory hasVoted = FastTypes.Owned(vId, msg.sender);
        require(hasVoted.get() == bytes32(0));
        hasVoted.set(bytes32(uint256(1)));

        FastTypes.Counter memory voteCount = FastTypes.Counter(keccak256(abi.encode(vId, choice)));
        voteCount.increment(1);

        emit Voted(vId, msg.sender, choice);
    }

    function setWinner(VotingInfo calldata v, uint256 choice) public {
        requireTimeAfter(v.deadline, "Cannot set winner before deadline");

        bytes32 vId = votingId(v);
        FastTypes.Counter memory voteCount = FastTypes.Counter(keccak256(abi.encode(vId, choice)));
        voteCount.requireGte(v.threshold);

        FastTypes.Constant memory winner = FastTypes.Constant(vId);
        winner.set(bytes32(choice));
        emit Winner(vId, choice);
    }
}
