// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract PLCRegistry {
    address private verifier = 0x0000000000000000000000000000000000007000;

    struct Op {
        bytes32 did;
        bytes cid;
        bytes prev;
        bytes[] keys;
        bytes signer;
        bytes encodedOp;
    }

    // CID to operation
    mapping(bytes => Op) private operations;
    // DID to its latest operation CID
    mapping(bytes32 => bytes) public latestOps;

    event LatestOp(bytes32 did, Op op);

    function indexOf(bytes[] memory arr, bytes memory value) internal pure returns (uint256) {
        for (uint256 i = 0; i < arr.length; i++) {
            if (isEqual(arr[i], value)) {
                return i;
            }
        }
        revert("Value not found in array");
    }

    function isEqual(bytes memory a, bytes memory b) internal pure returns (bool) {
        return keccak256(a) == keccak256(b);
    }

    function elementExist(bytes[] memory arr, bytes memory value) internal pure returns (bool) {
        for (uint256 i = 0; i < arr.length; i++) {
            if (isEqual(arr[i], value)) {
                return true;
            }
        }
        return false;
    }

    function validateOp(Op calldata op, bytes calldata sig) internal {
        // TODO: validate the operation and check the sig
    }

    function add(Op calldata op, bytes calldata sig) external {
        validateOp(op, sig);

        if (bytes(op.prev).length != 0) {
            require(operations[op.prev].did == op.did, "Last operation did mismatch!");
            require(elementExist(operations[op.prev].keys, op.signer), "Signer not allowed!");
        }

        bytes memory latestOpCID = latestOps[op.did];
        // Check if its a fork
        if (!isEqual(latestOpCID, op.prev)) {
            bytes memory uncleOp = latestOpCID; // the first operation that is not part of the fork
            while (!isEqual(operations[uncleOp].prev, op.prev)) {
                uncleOp = operations[uncleOp].prev;
                require(bytes(uncleOp).length != 0, "No ancestor found!");
            }
            // TODO: check if the time of the uncleOp is not more than 72 hours old.
            bytes[] memory allowedKeys = operations[op.prev].keys;
            uint256 uncleSignerIndex = indexOf(allowedKeys, operations[uncleOp].signer);
            uint256 newSignerIndex = indexOf(allowedKeys, op.signer);
            require(newSignerIndex < uncleSignerIndex, "Signer not allowed to fork!");
        }

        // Update the store
        operations[op.cid] = op;
        latestOps[op.did] = op.cid;

        emit LatestOp(op.did, op);
    }

    function getLastOperation(bytes32 did) external view returns (bytes memory encodedOp) {
        bytes memory cid = latestOps[did];
        Op memory latestOp = operations[cid];
        return latestOp.encodedOp;
    }
}
