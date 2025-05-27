pragma solidity ^0.8.26;

import {requireTimeBefore} from "../../../contracts/src/lib/Time.sol";

function min(uint256 a, uint256 b) pure returns (uint256) {
    return a <= b ? a : b;
}

contract Notary {
    mapping(bytes32 => uint256) public timestamps;

    event DocumentTimestamped(bytes32 indexed documentHash, address indexed submitter, uint256 timestamp);

    /// @notice Submit a document hash to be timestamped
    /// @param documentHash The keccak256 hash of the document
    /// @param ts The timestamp of the document. Must be in the future.
    function timestamp(bytes32 documentHash, uint256 ts) external {
        requireTimeBefore(ts, "timestamp must be in the future");

        if (timestamps[documentHash] == 0) {
            timestamps[documentHash] = ts;
            emit DocumentTimestamped(documentHash, msg.sender, ts);
            return;
        }

        uint256 minTimestamp = min(ts, timestamps[documentHash]);
        if (minTimestamp != timestamps[documentHash]) {
            timestamps[documentHash] = minTimestamp;
            emit DocumentTimestamped(documentHash, msg.sender, minTimestamp);
        }
    }
}

