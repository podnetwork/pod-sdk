// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PodECDSA} from "pod-sdk/verifier/PodECDSA.sol";
import {MerkleTree} from "pod-sdk/verifier/MerkleTree.sol";
import {IPodRegistry} from "pod-sdk/verifier/PodRegistry.sol";
import {AbsBonding} from "./AbsBonding.sol";
import {requireTimeBefore, requireTimeAtLeast, Time} from "pod-sdk/Time.sol";

contract PodAuctionConsumer is AbsBonding {
    using Time for Time.Timestamp;

    uint64 public constant U = 10 minutes; // Waiting period for announcement or blaming
    bytes32 public constant LOG_TOPIC_0 = 0xfa9544cad94ab8507946215078af54be3ed0a1f19911d5dab2037baf8e064fb0;

    event Log(string message, Time.Timestamp value);

    struct Bid {
        address bidder;
        uint256 bid;
    }

    struct State {
        Bid winner;
        Bid blamed;
    }

    IPodRegistry public podRegistry;
    mapping(bytes32 => State) public state;

    event BidWritten(bytes32 indexed auctionId, address indexed bidder, uint256 bid);
    event BidBlamed(bytes32 indexed auctionId, address indexed blamedBidder, uint256 bid);

    constructor(address _podRegistry, uint256 _bondAmount) AbsBonding(_bondAmount) {
        podRegistry = IPodRegistry(_podRegistry);
    }

    modifier validLog(PodECDSA.Log calldata log) {
        require(log.topics.length == 4, "Invalid log");
        require(log.topics[0] == LOG_TOPIC_0, "Invalid log topic");
        _;
    }

    /**
     * @notice deadline in microseconds
     */
    function getUniqueAuctionId(uint256 auctionId, Time.Timestamp deadline) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(auctionId, deadline));
    }

    /**
     * @notice deadline in microseconds
     */
    function decodeBid(PodECDSA.Log calldata log)
        internal
        pure
        returns (uint256 auctionId, address bidder, Time.Timestamp deadline, uint256 bid)
    {
        require(log.topics.length == 4, "Invalid log");
        require(log.topics[0] == LOG_TOPIC_0, "Invalid log topic");
        auctionId = uint256(log.topics[1]);
        bidder = address(uint160(uint256(log.topics[2])));
        deadline = Time.fromMicros(uint64(uint256(log.topics[3])));
        bid = abi.decode(log.data, (uint256));
    }

    function write(PodECDSA.CertifiedLog calldata certifiedLog) external validLog(certifiedLog.log) onlyBonded {
        (uint256 auctionId, address bidder, Time.Timestamp deadline, uint256 bid) = decodeBid(certifiedLog.log);
        bytes32 uniqueAuctionId = getUniqueAuctionId(auctionId, deadline);
        State storage s = state[uniqueAuctionId];
        requireTimeAtLeast(deadline, "Writing period has not started");
        requireTimeBefore(deadline.addSeconds(U), "Writing period ended");
        require(s.winner.bid == 0, "Bid already exists");
        require(msg.sender == bidder, "Invalid caller");

        uint256 f = podRegistry.getFaultTolerance();
        bool verified =
            PodECDSA.verifyCertifiedLog(PodECDSA.PodConfig({quorum: 2 * f + 1, registry: podRegistry}), certifiedLog);
        require(verified, "Invalid proof or quorum not reached");

        s.winner.bidder = bidder;
        s.winner.bid = bid;

        emit BidWritten(uniqueAuctionId, bidder, bid);
    }

    /**
     * @notice deadline in microseconds
     */
    function read(uint256 auctionId, Time.Timestamp deadline) external view returns (State memory) {
        bytes32 uniqueAuctionId = getUniqueAuctionId(auctionId, deadline);
        requireTimeAtLeast(deadline.addSeconds(2 * U), "Dispute period NOT ended");
        return state[uniqueAuctionId];
    }

    function blameIllAnnounced(PodECDSA.CertifiedLog calldata certifiedLog)
        external
        validLog(certifiedLog.log)
        onlyBonded
    {
        (uint256 auctionId, address bidder, Time.Timestamp deadline, uint256 bid) = decodeBid(certifiedLog.log);
        bytes32 uniqueAuctionId = getUniqueAuctionId(auctionId, deadline);
        State storage s = state[uniqueAuctionId];
        require(s.winner.bid != 0, "Bid not written");
        emit Log("Contract log deadline", deadline);
        emit Log("Contract log deadline + 2U", deadline.addSeconds(2 * U));
        requireTimeBefore(deadline.addSeconds(2 * U), "Dispute period ended");

        uint256 f = podRegistry.getFaultTolerance();
        bool verified =
            PodECDSA.verifyCertifiedLog(PodECDSA.PodConfig({quorum: 2 * f + 1, registry: podRegistry}), certifiedLog);
        require(verified, "Invalid proof or quorum not reached");

        s.blamed.bid = s.winner.bid;
        s.blamed.bidder = s.winner.bidder;

        s.winner.bid = bid;
        s.winner.bidder = bidder;

        slash(s.blamed.bidder);
        emit BidBlamed(uniqueAuctionId, s.blamed.bidder, s.blamed.bid);
    }

    function blameNoShow(PodECDSA.CertifiedLog calldata certifiedLog) external validLog(certifiedLog.log) onlyBonded {
        (uint256 auctionId, address bidder, Time.Timestamp deadline, uint256 bid) = decodeBid(certifiedLog.log);
        bytes32 uniqueAuctionId = getUniqueAuctionId(auctionId, deadline);
        State storage s = state[uniqueAuctionId];

        require(s.winner.bid == 0, "Bid already exists");
        requireTimeAtLeast(deadline.addSeconds(U), "Still in waiting period");
        requireTimeBefore(deadline.addSeconds(2 * U), "Dispute period ended");
        require(s.blamed.bid < bid, "Invalid blamed bid");

        uint256 f = podRegistry.getFaultTolerance();
        bool verified =
            PodECDSA.verifyCertifiedLog(PodECDSA.PodConfig({quorum: f + 1, registry: podRegistry}), certifiedLog);
        require(verified, "Invalid proof or quorum not reached");

        s.blamed.bid = bid;
        s.blamed.bidder = bidder;

        slash(bidder);

        emit BidBlamed(uniqueAuctionId, bidder, bid);
    }
}
