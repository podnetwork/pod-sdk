// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

address constant VERIFY_SIGNATURE = address(uint160(uint256(keccak256("POD_PLC_VERIFY_SIGNATURE"))));
address constant DAG_CBOR = address(uint160(uint256(keccak256("POD_PLC_DAG_CBOR"))));

enum OperationType {
    Uninitialized,
    Operation,
    Tombstone
}

struct VerificationMethod {
    bytes name;
    bytes key;
}

struct Service {
    bytes name;
    bytes type_;
    bytes endpoint;
}

struct Op {
    OperationType type_;
    bytes[] rotationKeys;
    VerificationMethod[] verificationMethods;
    bytes[] alsoKnownAs;
    Service[] services;
    bytes prev;
}

struct SignedOp {
    Op op;
    bytes signature;
    // metadata
    bytes32 did;
    bytes cid;
}

contract PLCRegistry {
    bool internal isTestMode;

    address public owner;

    // CID to operation
    mapping(bytes => SignedOp) private operations;
    // DID to its latest operation CID
    mapping(bytes32 => bytes) public latestOps;

    event LatestOp(bytes32 indexed did, SignedOp op);

    function verifySignature(bytes memory key, bytes memory data, bytes memory signature)
        internal
        view
        returns (bool)
    {
        // NOTE: Precompiles aren't yet supported in production
        if (isTestMode) {
            (bool success,) = VERIFY_SIGNATURE.staticcall(abi.encode(key, data, signature));
            return success;
        }
        return true;
    }

    function dagCbor(Op memory op) internal view returns (bytes memory) {
        // NOTE: Precompiles aren't yet supported in production
        if (isTestMode) {
            (bool success, bytes memory encoded) = DAG_CBOR.staticcall(abi.encode(op));
            require(success, "failed DAG_CBOR precompile call");
            return encoded;
        }
        return "dummy_dag_cbor";
    }

    function isEqual(bytes memory a, bytes memory b) internal pure returns (bool) {
        return keccak256(a) == keccak256(b);
    }

    function validateOp(SignedOp calldata signedOp) internal view {
        Op memory op = signedOp.op;
        require(op.prev.length != 0, "Previous operation CID must be provided");
        SignedOp memory lastOp = operations[op.prev];
        require(lastOp.did != bytes32(0), "Previous operation does not exist");
        require(lastOp.did == signedOp.did, "Last operation did mismatch!");

        bytes memory encoded = dagCbor(op);

        // Check if its a fork
        bytes memory latestOpCID = latestOps[signedOp.did];
        if (isEqual(latestOpCID, op.prev)) {
            // Not forking history, just check the signature
            for (uint256 i = 0; i < lastOp.op.rotationKeys.length; i++) {
                if (verifySignature(lastOp.op.rotationKeys[i], encoded, signedOp.signature)) {
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
        for (uint256 i = 0; i < lastOp.op.rotationKeys.length; i++) {
            if (verifySignature(lastOp.op.rotationKeys[i], firstNullifiedEncoded, firstNullified.signature)) {
                indexOfDisputedSigner = int256(i);
                break;
            }
        }
        require(indexOfDisputedSigner >= 0, "disputed signer not found in rotation keys");

        // Check signature using "more powerful" rotation keys of the last operation
        bool sigOk = false;
        for (uint256 i = 0; i < uint256(indexOfDisputedSigner); i++) {
            sigOk = verifySignature(lastOp.op.rotationKeys[i], encoded, signedOp.signature);
            if (sigOk) {
                break;
            }
        }
        require(sigOk, "signature verification failed: signer not authorized to fork history");

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
        if (latestOps[op.did].length == 0) {
            validateCreationOp(op);
        } else {
            validateOp(op);
        }

        // Update the store
        operations[op.cid] = op;
        latestOps[op.did] = op.cid;

        emit LatestOp(op.did, op);
    }

    function getLastOperation(bytes32 did) external view returns (SignedOp memory operation) {
        bytes memory cid = latestOps[did];
        SignedOp memory latestOp = operations[cid];
        return latestOp;
    }
}
