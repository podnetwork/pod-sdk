pragma solidity ^0.8.26;

import {requireTimeBefore, Time} from "pod-sdk/Time.sol";

function min(uint256 a, uint256 b) pure returns (uint256) {
    return a <= b ? a : b;
}

contract Notary {
    using Time for Time.Timestamp;
    mapping(bytes32 => Time.Timestamp) public timestamps;

    event DocumentTimestamped(bytes32 indexed documentHash, address indexed submitter, Time.Timestamp timestamp);

    /// @notice Submit a document hash to be timestamped
    /// @param documentHash The keccak256 hash of the document
    /// @param ts The timestamp of the document. Must be in the future.
    function timestamp(bytes32 documentHash, Time.Timestamp ts) external {
        requireTimeBefore(ts, "timestamp must be in the future");

        if ((timestamps[documentHash]).isZero()) {
            timestamps[documentHash] = ts;
            emit DocumentTimestamped(documentHash, msg.sender, ts);
            return;
        }

        Time.Timestamp minTimestamp = Time.min(ts, timestamps[documentHash]);
        if (minTimestamp.diffMicros(timestamps[documentHash]) != 0) {
            timestamps[documentHash] = minTimestamp;
            emit DocumentTimestamped(documentHash, msg.sender, minTimestamp);
        }
    }
}

