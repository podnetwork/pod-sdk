pragma solidity ^0.8.26;

import {requireTimeBefore} from "../../../contracts/src/lib/Time.sol";

contract Notary {
    mapping(bytes32 => uint256) public timestamps;

    event DocumentTimestamped(bytes32 indexed documentHash, address indexed submitter, uint256 timestamp);

    /// @notice Submit a document hash to be timestamped
    /// @param documentHash The keccak256 hash of the document
    /// @param timestamp The timestamp of the document. Must be in the future.
    function timestamp(bytes32 documentHash, uint256 timestamp) external {
        require(timestamps[documentHash] == 0, "Document already timestamped");
        requireTimeBefore(timestamp, "timestamp must be in the future");

        timestamps[documentHash] = timestamp;

        emit DocumentTimestamped(documentHash, msg.sender, timestamp);
    }
}

