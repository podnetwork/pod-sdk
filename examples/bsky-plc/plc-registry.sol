// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IDIDVerifier {
    function verify(bytes memory encoded, string memory prev, bytes32[] memory keys) external pure returns (bool valid, bytes32 signer, string memory cid, bytes32[] memory updated_keys);
}

contract PLCRegistry {
    address private verifier = 0x0000000000000000000000000000000000007000;

    struct Op {
        bytes32 did;
        string prev;
        bytes32[] keys;
        bytes32 signer;
        bytes encodedOp;
    }

    // CID to operation
    mapping(string => Op) private operations;
    // DID to its latest operation CID
    mapping(bytes32 => string) public latestOps;

    event LatestOp(bytes32 did, bytes encodedOp);

    function verifyGetKeysLast(
        bytes calldata encodedOp,
        bytes32 did,
        string memory prev,
        bytes32[] memory keys // empty list implies new did op.
    )
        internal
        view
        returns (
            string memory ,
            bytes32[] memory ,
            bytes32 // must be one of the keys
        )
    {
        (bool valid, bytes32 signer, string memory cid, bytes32[] memory updatedKeys) = IDIDVerifier(verifier).verify(encodedOp, prev, keys);
        require(valid, "The operation isn't valid");
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

    function isEqual(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }

    function add(bytes calldata encodedOp, bytes32 did, string calldata prev) external {
        require(did != bytes32(0), "DID cannot be empty!");

        bytes32[] memory keys = new bytes32[](0);
        if (bytes(prev).length != 0) {
            require(operations[prev].did == did, "Last operation did mismatch!");
            keys = operations[prev].keys;
        }
        (string memory cid, bytes32[] memory updatedKeys, bytes32 signer) = verifyGetKeysLast(encodedOp, did, prev, keys);

        string memory latestOpCID = latestOps[did];
        // Check if its a fork
        if (!isEqual(latestOpCID, prev)) {
            string memory uncleOp = latestOpCID; // the first operation that is not part of the fork
            while (!isEqual(operations[uncleOp].prev, prev)) {
                uncleOp = operations[uncleOp].prev;
                require(bytes(uncleOp).length != 0, "No ancestor found!");
            }
            // TODO: check if the time of the uncleOp is not more than 72 hours old.
            bytes32[] memory allowedKeys = operations[prev].keys;
            uint256 uncleSignerIndex = indexOf(allowedKeys, operations[uncleOp].signer);
            uint256 newSignerIndex = indexOf(allowedKeys, signer);
            require(newSignerIndex < uncleSignerIndex, "Signer not allowed to fork!");
        }

        // Update the store
        operations[cid] = Op({did: did, prev: prev, keys: updatedKeys, encodedOp: encodedOp, signer: signer});
        latestOps[did] = cid;

        emit LatestOp(did, encodedOp);
    }

    function getLastOperation(bytes32 did) external returns (bytes memory encodedOp) {
        require(did != bytes32(0), "DID cannot be empty!");

        string memory cid = latestOps[did];

        Op memory latestOp = operations[cid];
        return latestOp.encodedOp;
    }
}
