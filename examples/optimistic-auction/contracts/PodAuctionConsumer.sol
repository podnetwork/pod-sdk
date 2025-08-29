// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PodECDSA} from "pod-sdk/verifier/PodECDSA.sol";
import {IPodRegistry} from "pod-protocol/interfaces/IPodRegistry.sol";
import {AbsBonding} from "./AbsBonding.sol";

contract PodAuctionConsumer is AbsBonding {
    uint256 public constant DISPUTE_PERIOD = 10 minutes;
    uint256 public constant TWO_TIMES_DISPUTE_PERIOD = 2 * DISPUTE_PERIOD;
    bytes32 public constant LOG_TOPIC_0 = 0xfa9544cad94ab8507946215078af54be3ed0a1f19911d5dab2037baf8e064fb0;

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

    function _convertToSeconds(uint256 timestamp) internal pure returns (uint256) {
        return timestamp / 1e6;
    }

    /**
     * @notice deadline in seconds
     */
    function getUniqueAuctionId(uint256 auctionId, uint256 deadlineInSeconds)
        internal
        pure
        returns (bytes32 hashedVal)
    {
        assembly {
            mstore(0x00, auctionId)
            mstore(0x20, deadlineInSeconds)
            hashedVal := keccak256(0x00, 0x40)
        }
    }

    /**
     * @notice deadline in microseconds
     */
    function decodeBid(PodECDSA.Log calldata log)
        internal
        pure
        returns (uint256 auctionId, address bidder, uint256 deadline, uint256 bid)
    {
        require(log.topics.length == 4, "Invalid log");
        require(log.topics[0] == LOG_TOPIC_0, "Invalid log topic");
        auctionId = uint256(log.topics[1]);
        bidder = address(uint160(uint256(log.topics[2])));
        deadline = _convertToSeconds(uint256(log.topics[3]));
        bid = abi.decode(log.data, (uint256));
    }

    function write(PodECDSA.CertifiedLog calldata certifiedLog) external validLog(certifiedLog.log) onlyBonded {
        (uint256 auctionId, address bidder, uint256 deadlineInSeconds, uint256 bid) = decodeBid(certifiedLog.log);
        bytes32 uniqueAuctionId = getUniqueAuctionId(auctionId, deadlineInSeconds);
        State storage s = state[uniqueAuctionId];
        require(block.timestamp >= deadlineInSeconds, "Writing period has not started");
        require(block.timestamp < deadlineInSeconds + DISPUTE_PERIOD, "Writing period ended");
        require(s.winner.bid == 0, "Bid already exists");
        require(msg.sender == bidder, "Invalid caller");

        bool verified = PodECDSA.verifyCertifiedLog(
            PodECDSA.PodConfig({thresholdNumerator: 2, thresholdDenominator: 3, registry: podRegistry}), certifiedLog
        );
        require(verified, "Invalid proof or quorum not reached");

        s.winner.bidder = bidder;
        s.winner.bid = bid;

        emit BidWritten(uniqueAuctionId, bidder, bid);
    }

    /**
     * @notice deadline in microseconds
     */
    function read(uint256 auctionId, uint256 deadline) external view returns (State memory) {
        uint256 deadlineInSeconds = _convertToSeconds(deadline);
        bytes32 uniqueAuctionId = getUniqueAuctionId(auctionId, deadlineInSeconds);
        require(block.timestamp >= deadlineInSeconds + TWO_TIMES_DISPUTE_PERIOD, "Dispute period NOT ended");
        return state[uniqueAuctionId];
    }

    function blameIllAnnounced(PodECDSA.CertifiedLog calldata certifiedLog)
        external
        validLog(certifiedLog.log)
        onlyBonded
    {
        (uint256 auctionId, address bidder, uint256 deadlineInSeconds, uint256 bid) = decodeBid(certifiedLog.log);
        bytes32 uniqueAuctionId = getUniqueAuctionId(auctionId, deadlineInSeconds);
        State storage s = state[uniqueAuctionId];
        require(s.winner.bid != 0, "Bid not written");
        require(block.timestamp < deadlineInSeconds + TWO_TIMES_DISPUTE_PERIOD, "Dispute period ended");

        bool verified = PodECDSA.verifyCertifiedLog(
            PodECDSA.PodConfig({thresholdNumerator: 2, thresholdDenominator: 3, registry: podRegistry}), certifiedLog
        );
        require(verified, "Invalid proof or quorum not reached");

        s.blamed.bid = s.winner.bid;
        s.blamed.bidder = s.winner.bidder;

        s.winner.bid = bid;
        s.winner.bidder = bidder;

        slash(s.blamed.bidder);
        emit BidBlamed(uniqueAuctionId, s.blamed.bidder, s.blamed.bid);
    }

    function blameNoShow(PodECDSA.CertifiedLog calldata certifiedLog) external validLog(certifiedLog.log) onlyBonded {
        (uint256 auctionId, address bidder, uint256 deadlineInSeconds, uint256 bid) = decodeBid(certifiedLog.log);
        bytes32 uniqueAuctionId = getUniqueAuctionId(auctionId, deadlineInSeconds);
        State storage s = state[uniqueAuctionId];

        require(s.winner.bid == 0, "Bid already exists");
        require(block.timestamp >= deadlineInSeconds + DISPUTE_PERIOD, "Still in waiting period");
        require(block.timestamp < deadlineInSeconds + TWO_TIMES_DISPUTE_PERIOD, "Dispute period ended");
        require(s.blamed.bid < bid, "Invalid blamed bid");

        bool verified = PodECDSA.verifyCertifiedLog(
            PodECDSA.PodConfig({thresholdNumerator: 1, thresholdDenominator: 3, registry: podRegistry}), certifiedLog
        );
        require(verified, "Invalid proof or quorum not reached");

        s.blamed.bid = bid;
        s.blamed.bidder = bidder;

        slash(bidder);

        emit BidBlamed(uniqueAuctionId, bidder, bid);
    }
}
