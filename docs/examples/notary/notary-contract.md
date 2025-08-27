! content id="notary-contract"

## Notary Contract

### Features

- **Immutable Timestamping**: Once a document is timestamped, the earliest submitted valid timestamp is retained.

- **Multiple Submissions**: Re-submissions of the same document hash are permitted and can only reduce (never increase)
  the timestamp.

- **Conflict Resolution via Minimum Timestamp**: Competing transactions for the same document hash are resolved by
  storing the smallest valid timestamp.

### Smart contract interface

#### State

```solidity
mapping(bytes32 => uint256) public timestamps;
```

- Maps a document's keccak256 hash to the smallest timestamp submitted.
- Public visibility allows external verification of timestamps.

#### Events

```solidity
event DocumentTimestamped(bytes32 indexed documentHash, address indexed submitter, Time.Timestamp timestamp);
```

- Emitted whenever a document hash is timestamped or updated with an earlier timestamp.

#### Functions

```solidity
function timestamp(bytes32 documentHash, Time.Timestamp ts) external;
```

##### Parameters

- `documentHash`: Keccak256 hash of the document content.
- `ts`: Proposed timestamp, which must be in the future at validation time.

##### Behavior

- Requires `ts` to be in the future (`requireTimeBefore(ts, ...)`).
- If the document has not been timestamped before, sets `timestamps[documentHash] = ts`.
- If the document is already timestamped, updates it to the minimum of the existing and the new timestamp.
- Emits `DocumentTimestamped` event.

! content end

! content

! sticky

! codeblock title="Solidity"

```solidity
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
```

! codeblock end

! sticky end

! content end
