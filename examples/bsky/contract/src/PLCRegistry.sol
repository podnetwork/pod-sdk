// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

address constant VERIFY_SIGNATURE = address(uint160(uint256(keccak256("POD_PLC_VERIFY_SIGNATURE"))));
address constant DAG_CBOR = address(uint160(uint256(keccak256("POD_PLC_DAG_CBOR"))));

function verifySignature(bytes memory key, bytes memory data, bytes memory signature) view returns (bool) {
    (bool success,) = VERIFY_SIGNATURE.staticcall(abi.encode(key, data, signature));
    return success;
}

function dagCbor(Op memory op) view returns (bytes memory) {
    (bool success, bytes memory encoded) = DAG_CBOR.staticcall(abi.encode(op));
    require(success, "failed DAG_CBOR precompile call");
    return encoded;
}

// TODO: include all fields necesarry to encode with DAG-CBOR for signature verification
// - type
// - verification_methods
// - also_know_as
// - services
// TODO: Remove encodedOp as it can be derived from other fields (?)
struct Op {
    bytes32 did;
    bytes cid;
    bytes prev;
    bytes[] rotationKeys;
    bytes encodedOp;
}

struct SignedOp {
    Op op;
    bytes signature;
}

contract PLCRegistry {
    address public owner;

    // CID to operation
    mapping(bytes => SignedOp) private operations;
    // DID to its latest operation CID
    mapping(bytes32 => bytes) public latestOps;

    event LatestOp(bytes32 indexed did, Op op);

    function isEqual(bytes memory a, bytes memory b) internal pure returns (bool) {
        return keccak256(a) == keccak256(b);
    }

    function validateOp(SignedOp calldata signedOp) internal view {
        Op memory op = signedOp.op;
        require(op.prev.length != 0, "Previous operation CID must be provided");
        Op memory lastOp = operations[op.prev].op;
        require(lastOp.did != bytes32(0), "Previous operation does not exist");
        require(lastOp.did == op.did, "Last operation did mismatch!");

        bytes memory encoded = dagCbor(op);

        // Check if its a fork
        bytes memory latestOpCID = latestOps[op.did];
        if (isEqual(latestOpCID, op.prev)) {
            // Not forking history, just check the signature
            for (uint256 i = 0; i < lastOp.rotationKeys.length; i++) {
                if (verifySignature(lastOp.rotationKeys[i], encoded, signedOp.signature)) {
                    return; // Valid signature found
                }
            }
            revert("signature invalid (not a fork)");
        }

        // Forking history, nullifying ops newer than po.prev
        bytes memory firstNullifiedCID = latestOpCID; // the first operation that is not part of the fork
        while (!isEqual(operations[firstNullifiedCID].op.prev, op.prev)) {
            firstNullifiedCID = operations[firstNullifiedCID].op.prev;
            require(firstNullifiedCID.length != 0, "No ancestor found!");
        }

        int256 indexOfDisputedSigner = -1;
        SignedOp memory firstNullified = operations[firstNullifiedCID];
        bytes memory firstNullifiedEncoded = dagCbor(firstNullified.op);
        for (uint256 i = 0; i < lastOp.rotationKeys.length; i++) {
            if (verifySignature(lastOp.rotationKeys[i], firstNullifiedEncoded, firstNullified.signature)) {
                indexOfDisputedSigner = int256(i);
                break;
            }
        }
        require(indexOfDisputedSigner >= 0, "disputed signer not found in rotation keys");

        // Check signature using "more powerful" rotation keys of the last operation
        bool sigOk = false;
        for (uint256 i = 0; i < uint256(indexOfDisputedSigner); i++) {
            sigOk = verifySignature(lastOp.rotationKeys[i], encoded, signedOp.signature);
            if (sigOk) {
                break;
            }
        }
        require(sigOk, "signature invalid (not allowed to fork)");

        // TODO: check if the time of the uncleOp is not more than 72 hours old.
    }

    function validateCreationOp(SignedOp calldata op) internal view {
        require(op.op.prev.length == 0, "Previous operation CID must be empty for creation operation");

        // TODO: calculate DID and check
        // DID = "did:plc:" + base32Encode(sha256(dagCbor(op))); // note: CBOR of SignedOp, not Op
        //
        // bytes24 did_bytes = bytes24(sha256(encoded));
        // // compare op.did[8:24] with did_bytes
        // bytes24 op_did_bytes = bytes24(bytes32(uint256(op.did) << 64));
        // require(did_bytes == op_did_bytes, "DID mismatch!");

        bytes memory encoded = dagCbor(op.op);
        for (uint256 i = 0; i < op.op.rotationKeys.length; i++) {
            if (verifySignature(op.op.rotationKeys[i], encoded, op.signature)) {
                return;
            }
        }
        revert("signature invalid");
    }

    function add(SignedOp calldata op) external {
        if (latestOps[op.op.did].length == 0) {
            validateCreationOp(op);
        } else {
            validateOp(op);
        }

        // Update the store
        operations[op.op.cid] = op;
        latestOps[op.op.did] = op.op.cid;

        emit LatestOp(op.op.did, op.op);
    }

    function getLastOperation(bytes32 did) external view returns (bytes memory encodedOp) {
        bytes memory cid = latestOps[did];
        SignedOp memory latestOp = operations[cid];
        return latestOp.op.encodedOp;
    }
}
