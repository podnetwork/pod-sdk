// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import {requireQuorum} from "pod-sdk/pod/Quorum.sol";

address constant VERIFY_SIGNATURE = address(uint160(uint256(keccak256("POD_PLC_VERIFY_SIGNATURE"))));
address constant DAG_CBOR = address(uint160(uint256(keccak256("POD_PLC_DAG_CBOR"))));

enum OperationType {
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

struct OpWithMetadata {
    Op op;
    bytes32 did;
    bytes signature;
}

contract PLCRegistry {
    bool internal isTestMode;

    // CID to operation
    mapping(bytes => OpWithMetadata) private operations;
    // DID to its latest operation CID
    mapping(bytes32 => bytes) public latestOps;
    // CID to index of rotation key that signed the operation.
    // For creation operations, this is the index in this operation's rotationKeys.
    // For update operations, this is the index in the last operation's rotationKeys.
    mapping(bytes => uint256) public signerIndices;

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

    function validateOp(bytes32 did, Op calldata op, bytes calldata signature) internal view returns (bool, uint256) {
        OpWithMetadata memory lastOp = operations[op.prev];
        require(lastOp.did == did, "op.prev operation is for different DID");

        bytes memory encoded = dagCbor(op);

        // Check if its a fork
        bytes memory latestOpCID = latestOps[did];
        if (isEqual(latestOpCID, op.prev)) {
            // Not forking history, just check the signature
            for (uint256 i = 0; i < lastOp.op.rotationKeys.length; i++) {
                if (verifySignature(lastOp.op.rotationKeys[i], encoded, signature)) {
                    return (true, i); // Valid signature found
                }
            }
            revert("signature invalid (not a fork)");
        }

        // Forking history, nullifying ops newer than po.prev
        // TODO: Make sure that forking works correctly in all scenarios, even
        // in case of more than 2 keys and different `prev`. E.g, consider the below
        // scenario with 3 signers A, B and C where A > B > C.
        // In this scenario, The `UPDATE B` should be the final state regardless
        // of the order of execution of operations `UPDATE A` and `UPDATE B`.
        // Reason: B > C and `UPDATE B` nullifies `UPDATE C` along with its chain.
        // It doesn't matter that A > B - only the first nullified op is checked.
        // ┌──────┐  ┌────────┐              ┌────────┐
        // │      │◄─┤UPDATE C│◄─────────────┼UPDATE A│
        // └──────┘◄┐└────────┘              └────────┘
        //          │            ┌────────┐
        //          └────────────┤UPDATE B│
        //                       └────────┘
        // ┌──────┐  ┌────────┐  ┌────────┐
        // │      │◄─┤UPDATE C│◄─┼UPDATE A│
        // └──────┘◄┐└────────┘  └────────┘
        //          │                        ┌────────┐
        //          └────────────────────────┤UPDATE B│
        //                                   └────────┘
        bytes memory firstNullifiedCID = latestOpCID; // the first operation that is not part of the fork
        while (!isEqual(operations[firstNullifiedCID].op.prev, op.prev)) {
            firstNullifiedCID = operations[firstNullifiedCID].op.prev;
            require(firstNullifiedCID.length != 0, "No ancestor found!");
        }

        uint256 indexOfDisputedSigner = signerIndices[firstNullifiedCID];

        // Check signature using "more powerful" rotation keys of the last operation
        int256 signerIndex = -1;
        for (uint256 i = 0; i < indexOfDisputedSigner; i++) {
            if (verifySignature(lastOp.op.rotationKeys[i], encoded, signature)) {
                signerIndex = int256(i);
                break;
            }
        }
        // NOTE: We require quorum here because in pod, update operations using the same `prev` might come
        // in different order (transactions signed by different PLCs).
        // We pass the TX if majority agreed it's fine but we don't update the state to prevent
        // diverging the state.
        // Consider the following two possible scenarios of execution. 
        // A and B represent two different rotation keys, where A is stronger than B.
        // The update operations are sent from different PLCs and hence - not sequenced
        // (they can be executed in any order).
        //   ┌──────┐   ┌────────┐
        //   │CREATE│◄──┤UPDATE A│
        //   └──────┘◄┐ └────────┘   ┌────────┐
        //            └──────────────┤UPDATE B│
        //                           └────────┘
        //   ┌──────┐   ┌────────┐
        //   │CREATE│◄──┤UPDATE B│
        //   └──────┘◄┐ └────────┘   ┌────────┐
        //            └──────────────┤UPDATE A│
        //                           └────────┘
        // We want both to pass, but the final state must be `UPDATE A` because it has stronger rotation key.
        requireQuorum(signerIndex != -1, "signature verification failed: signer not authorized to fork history");
        return (signerIndex != -1, uint256(signerIndex)); // Valid signature found

        // TODO: check if the time of the uncleOp is not more than 72 hours old.
    }

    function validateCreationOp(bytes32 did, Op calldata op, bytes calldata signature) internal view returns (bool) {
        // We only require quorum here because it is possible that mutliple TXs create the same DID at the same time.
        // In this case, we verify the correctness of the operation, but we DON'T update the state.
        // Example of valid order of execution scenarios (TXs can be signed by different keys and therefore not sequenced):
        // 1. [TX 1 creates DID] -> [TX 2 creates DID]
        // 2. [TX 1 creates DID] -> [TX 2 updates DID] -> [TX 3 creates DID] // ! Important not to update the state in TX 3
        requireQuorum(latestOps[did].length == 0, "An operation for this DID already exists");

        // TODO: calculate DID and check
        // DID = "did:plc:" + base32Encode(sha256(dagCbor(op))); // note: CBOR of SignedOp, not Op
        //
        // bytes24 did_bytes = bytes24(sha256(encoded));
        // // compare op.did[8:24] with did_bytes
        // bytes24 op_did_bytes = bytes24(bytes32(uint256(op.did) << 64));
        // require(did_bytes == op_did_bytes, "DID mismatch!");

        bytes memory encoded = dagCbor(op);
        for (uint256 i = 0; i < op.rotationKeys.length; i++) {
            if (verifySignature(op.rotationKeys[i], encoded, signature)) {
                return latestOps[did].length == 0; // return true if no operation exists for this DID
            }
        }
        revert("signature invalid");
    }

    // TODO: calculate CID internally
    // CID = cid_v1(0x71, sha256(dagCbor(op)));
    function add(bytes32 did, bytes calldata cid, Op calldata op, bytes calldata signature) external {
        require(did != bytes32(0), "DID must not be empty");

        (bool updateLast, uint256 signerIndex) = (false, 0);
        if (op.prev.length == 0) {
            updateLast = validateCreationOp(did, op, signature);
        } else {
            (updateLast, signerIndex) = validateOp(did, op, signature);
        }

        // Update the store
        if (updateLast) {
            latestOps[did] = cid;
        }

        signerIndices[cid] = signerIndex;
        operations[cid] = OpWithMetadata({op: op, did: did, signature: signature});
    }

    function getLastOperation(bytes32 did) external view returns (Op memory operation, bytes memory signature) {
        bytes memory cid = latestOps[did];
        OpWithMetadata memory op = operations[cid];
        return (op.op, op.signature);
    }
}
