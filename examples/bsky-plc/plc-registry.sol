// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract PLCRegistry {
    struct Op {
        bytes32 did;
        bytes32 lastOp;
        bytes32[] keys;
        bytes32 signer;
        bytes encodedOp;
    }
    // CID to operation

    mapping(bytes32 => Op) private operations;
    // DID to its latest operation CID
    mapping(bytes32 => bytes32) public latestOps;

    event LatestOp(bytes32 did, bytes encodedOp);

    function verifyGetKeysLast(
        bytes calldata encodedOp,
        bytes32 did,
        bytes32 lastOp,
        bytes32[] memory keys // empty list implies new did op.
    )
        internal
        view
        returns (
            bytes32 cid,
            bytes32[] memory updatedKeys,
            bytes32 signer // must be one of the keys
        )
    {
        // TODO: add precompile to decode the op, check sig, and return the relevant values.
        return (cid, updatedKeys, signer);
    }

    function indexOf(bytes32[] memory arr, bytes32 value) internal pure returns (uint256) {
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == value) {
                return i;
            }
        }
        revert("Value not found in array");
    }

    function add(bytes calldata encodedOp, bytes32 did, bytes32 lastOp) external {
        require(did != bytes32(0), "DID cannot be empty!");

        bytes32[] memory keys = new bytes32[](0);
        if (lastOp != bytes32(0)) {
            require(operations[lastOp].did == did, "Last operation did mismatch!");
            keys = operations[lastOp].keys;
        }
        (bytes32 cid, bytes32[] memory updatedKeys, bytes32 signer) = verifyGetKeysLast(encodedOp, did, lastOp, keys);

        bytes32 latestOp = latestOps[did];
        // Check if its a fork
        if (latestOp != lastOp) {
            bytes32 uncleOp = latestOp; // the first operation that is not part of the fork
            while (operations[uncleOp].lastOp != lastOp) {
                uncleOp = operations[uncleOp].lastOp;
                require(uncleOp != bytes32(0), "No ancestor found!");
            }
            // TODO: check if the time of the uncleOp is not more than 72 hours old.
            bytes32[] memory allowedKeys = operations[lastOp].keys;
            uint256 uncleSignerIndex = indexOf(allowedKeys, operations[uncleOp].signer);
            uint256 newSignerIndex = indexOf(allowedKeys, signer);
            require(newSignerIndex < uncleSignerIndex, "Signer not allowed to fork!");
        }

        // Update the store
        operations[cid] = Op({did: did, lastOp: lastOp, keys: updatedKeys, encodedOp: encodedOp, signer: signer});
        latestOps[did] = cid;

        emit LatestOp(did, encodedOp);
    }
}
