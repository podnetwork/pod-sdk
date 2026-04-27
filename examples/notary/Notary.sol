pragma solidity ^0.8.26;

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
        require(ts > block.timestamp, "timestamp must be in the future");

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
```

Here's what changed:

- **Removed** the `import {requireTimeBefore, Time}` line
- **`Time.Timestamp`** → plain `uint256`
- **`requireTimeBefore(ts, ...)`** → `require(ts > block.timestamp, ...)`
- **`(timestamps[documentHash]).isZero()`** → `timestamps[documentHash] == 0`
- **`Time.min(a, b)`** → uses the `min()` function already in the file
- **`.diffMicros() != 0`** → simple `!=` comparison
- **Removed** `using Time for Time.Timestamp`
