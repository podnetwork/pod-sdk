// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console, Vm} from "forge-std/Test.sol";
import {
    PLCRegistry,
    Op,
    VERIFY_SIGNATURE,
    DAG_CBOR,
    VerificationMethod,
    Service,
    OperationType
} from "../src/PLCRegistry.sol";

contract MockVerifySignature {
    fallback() external {
        // Note: that's not how signature verification works in reality, but
        // it doesn't matter as long as test follows the same logic.
        // The contract doesn't care what kind of signature is used,
        (bytes memory key, bytes memory data, bytes memory signature) = abi.decode(msg.data, (bytes, bytes, bytes));
        (uint8 v, bytes32 r, bytes32 s) = abi.decode(signature, (uint8, bytes32, bytes32));
        bytes32 hash = keccak256(data);
        bool valid = ecrecover(hash, v, r, s) == abi.decode(key, (address));

        require(valid, "signature invalid");
    }
}

contract MockDagCbor {
    fallback() external {
        Op memory op = abi.decode(msg.data, (Op));
        bytes memory ret = dagCbor(op);
        assembly {
            return(add(ret, 32), mload(ret))
        }
    }
}

function dagCbor(Op memory op) pure returns (bytes memory) {
    // Simulate a DAG-CBOR encoding of the Op struct.
    return abi.encode(op);
}

function cid(Op memory op) pure returns (bytes memory) {
    // Simulate a CID generation from the DAG-CBOR encoding.
    return abi.encodePacked(keccak256(dagCbor(op)));
}

function equalBytes(bytes memory a, bytes memory b) pure returns (bool) {
    return keccak256(a) == keccak256(b);
}

function equalOperations(Op memory a, Op memory b) pure returns (bool) {
    return equalBytes(dagCbor(a), dagCbor(b));
}

contract PLCRegistryUnderTest is PLCRegistry {
    constructor() {
        isTestMode = true;
    }
}

contract PLCRegistryTest is Test {
    PLCRegistryUnderTest public registry;

    function setUp() public {
        MockVerifySignature mock = new MockVerifySignature();
        vm.etch(VERIFY_SIGNATURE, address(mock).code);

        MockDagCbor mock_cbor = new MockDagCbor();
        vm.etch(DAG_CBOR, address(mock_cbor).code);

        registry = new PLCRegistryUnderTest();
    }

    function signOp(Vm.Wallet memory wallet, Op memory op) private returns (bytes memory sig) {
        bytes32 hash = keccak256(dagCbor(op));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wallet, hash);
        return abi.encode(v, r, s);
    }

    function newCreationOp(uint256 rotationKeyCount) private pure returns (Op memory) {
        return Op({
            type_: OperationType.Operation,
            prev: "",
            rotationKeys: new bytes[](rotationKeyCount),
            verificationMethods: new VerificationMethod[](0),
            alsoKnownAs: new bytes[](0),
            services: new Service[](0)
        });
    }

    function newUpdateOp(bytes memory prev, uint256 rotationKeyCount) private pure returns (Op memory) {
        Op memory op = newCreationOp(rotationKeyCount);
        op.prev = prev;
        return op;
    }

    function checkLastOp(bytes32 did, Op memory expected) private view {
        require(equalBytes(registry.latestOps(did), cid(expected)));
        (Op memory last, ) = registry.getLastOperation(did);
        require(equalOperations(last, expected));
    }

    function test_createPLC() public {
        Vm.Wallet memory alice = vm.createWallet("alice");
        Vm.Wallet memory bob = vm.createWallet("bob");

        Op memory op = newCreationOp(2);
        op.rotationKeys[0] = abi.encode(alice.addr);
        op.rotationKeys[1] = abi.encode(bob.addr);
        bytes32 did = "did:plc:abcdefghijklmnopqrstuvwz";

        registry.add(did, cid(op), op, signOp(bob, op));

        require(registry.signerIndices(cid(op)) == 0, "creation operation signer isn't persisted");
        checkLastOp(did, op);
    }

    // In pod, transactions signed by different keys aren't sequenced and can
    // be executed in any order. Hence, we want to ensure that a creation operation
    // is idempotent, and can be submitted many times.
    // Scenario: [Create DID] -> [Create DID]
    function test_createPLC_is_idempotent() public {
        Vm.Wallet memory alice = vm.createWallet("alice");
        Vm.Wallet memory bob = vm.createWallet("bob");

        Op memory op = newCreationOp(2);
        op.rotationKeys[0] = abi.encode(alice.addr);
        op.rotationKeys[1] = abi.encode(bob.addr);

        bytes32 did = "did:plc:abcdefghijklmnopqrstuvwz";
        registry.add(did, cid(op), op, signOp(alice, op));
        registry.add(did, cid(op), op, signOp(bob, op));

        require(registry.signerIndices(cid(op)) == 0, "creation operation signer isn't persisted");
        checkLastOp(did, op);
    }

    // Scenario: [Create DID] -> [Update DID] -> [Create DID]
    function test_createPLC_is_idempotent_even_after_update() public {
        Vm.Wallet memory alice = vm.createWallet("alice");
        Vm.Wallet memory bob = vm.createWallet("bob");

        // Step 1: create new
        Op memory op = newCreationOp(2);
        op.rotationKeys[0] = abi.encode(alice.addr);
        op.rotationKeys[1] = abi.encode(bob.addr);

        bytes32 did = "did:plc:abcdefghijklmnopqrstuvwz";
        registry.add(did, cid(op), op, signOp(alice, op));

        // Step 2: update
        // Persist only Alice's key
        Op memory updateOp = newUpdateOp(cid(op), 1);
        updateOp.rotationKeys[0] = abi.encode(alice.addr);

        registry.add(did, cid(updateOp), updateOp, signOp(alice, updateOp));

        require(registry.signerIndices(cid(updateOp)) == 0, "signer index should be for Alice's key");
        checkLastOp(did, updateOp);

        // Step 3: create again
        registry.add(did, cid(op), op, signOp(alice, op));

        require(registry.signerIndices(cid(updateOp)) == 0, "signer index should be for Alice's key");
        checkLastOp(did, updateOp);
    }

    function test_createPLC_rejected_invalid_signature() public {
        Vm.Wallet memory wallet = vm.createWallet("alice");

        Op memory op = newCreationOp(1);
        op.rotationKeys[0] = abi.encode(vm.addr(111));

        bytes32 did = "did:plc:abcdefghijklmnopqrstuvwz";

        vm.expectRevert("signature invalid");
        registry.add(did, cid(op), op, signOp(wallet, op));
    }

    function test_createPLC_second_key_signed() public {
        Vm.Wallet memory alice = vm.createWallet("alice");
        Vm.Wallet memory bob = vm.createWallet("bob");

        Op memory op = newCreationOp(2);
        op.rotationKeys[0] = abi.encode(alice.addr);
        op.rotationKeys[1] = abi.encode(bob.addr);

        bytes32 did = "did:plc:abcdefghijklmnopqrstuvwz";
        registry.add(did, cid(op), op, signOp(bob, op));

        require(registry.signerIndices(cid(op)) == 0, "creation operation signer isn't persisted");
        checkLastOp(did, op);
    }

    function test_updateOperation() public {
        Vm.Wallet memory alice = vm.createWallet("alice");
        Vm.Wallet memory bob = vm.createWallet("bob");

        // Step 1: create new
        Op memory op = newCreationOp(2);

        op.rotationKeys[0] = abi.encode(alice.addr);
        op.rotationKeys[1] = abi.encode(bob.addr);

        bytes32 did = "did:plc:abcdefghijklmnopqrstuvwz";
        registry.add(did, cid(op), op, signOp(alice, op));

        require(registry.signerIndices(cid(op)) == 0, "signer index should be for Alice's key");
        checkLastOp(did, op);

        // Step 2: update
        // Persist only Alice's key
        Op memory updateOp = newUpdateOp(cid(op), 1);
        updateOp.rotationKeys[0] = abi.encode(alice.addr);

        registry.add(did, cid(updateOp), updateOp, signOp(alice, updateOp));

        require(registry.signerIndices(cid(updateOp)) == 0, "signer index should be for Alice's key");
        checkLastOp(did, updateOp);

        // Step 3: try update with invalid signature
        Op memory updateOpInvalid = newUpdateOp(cid(updateOp), 1);

        vm.expectRevert("signature invalid (not a fork)");
        registry.add(did, cid(updateOpInvalid), updateOpInvalid, signOp(vm.createWallet("blackhat"), updateOpInvalid));
        checkLastOp(did, updateOp);
    }



    function test_forking() public {
        Vm.Wallet memory alice = vm.createWallet("alice");
        Vm.Wallet memory bob = vm.createWallet("bob");

        // Step 1: create new
        Op memory op = newCreationOp(2);

        op.rotationKeys[0] = abi.encode(alice.addr);
        op.rotationKeys[1] = abi.encode(bob.addr);

        bytes32 did = "did:plc:abcdefghijklmnopqrstuvwz";
        registry.add(did, cid(op), op, signOp(alice, op));

        require(registry.signerIndices(cid(op)) == 0, "signer index should be for Alice's key");
        checkLastOp(did, op);

        // Step 2: update
        // Persist only Bob's key
        Op memory updateOp = newUpdateOp(cid(op), 1);
        updateOp.rotationKeys[0] = abi.encode(bob.addr);
        registry.add(did, cid(updateOp), updateOp, signOp(bob, updateOp));

        require(registry.signerIndices(cid(updateOp)) == 1, "signer index should be for Bob's key");
        checkLastOp(did, updateOp);

        // Step 3: Alice got mad: she forks removing step 2 update, and banning Bob
        Op memory forkOp = newUpdateOp(cid(op), 1);
        forkOp.rotationKeys[0] = abi.encode(alice.addr);

        registry.add(did, cid(forkOp), forkOp, signOp(alice, forkOp));

        require(registry.signerIndices(cid(forkOp)) == 0, "signer index should be for Alice's key");
        checkLastOp(did, forkOp);

        // Step 4: Bob realizes his step 2 attempt failed, and tries undo Alice's fork
        // by re-applying his update operation from step 2.
        // The call succeeds (as idempotent) but it doesn't update the state.
        registry.add(did, cid(updateOp), updateOp, signOp(bob, updateOp));
        checkLastOp(did, forkOp);
    }
}
