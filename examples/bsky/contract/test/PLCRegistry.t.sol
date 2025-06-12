// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console, Vm} from "forge-std/Test.sol";
import {
    PLCRegistry,
    Op,
    SignedOp,
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

function equalBytes(bytes memory a, bytes memory b) pure returns (bool) {
    return keccak256(a) == keccak256(b);
}

function equalOperations(SignedOp memory a, SignedOp memory b) pure returns (bool) {
    return equalBytes(a.cid, b.cid) && equalBytes(dagCbor(a.op), dagCbor(b.op)) && a.did == b.did
        && equalBytes(a.signature, b.signature);
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

    function createSignedOp(Vm.Wallet memory wallet, Op memory op) private returns (SignedOp memory sig) {
        return SignedOp({
            op: op,
            did: bytes32("did:plc:abcdefghijklmnopqrstuvwz"),
            cid: dagCbor(op),
            signature: signOp(wallet, op)
        });
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

    function test_createPLC() public {
        Vm.Wallet memory wallet = vm.createWallet("alice");

        Op memory op = newCreationOp(1);
        op.rotationKeys[0] = abi.encode(wallet.addr);

        SignedOp memory signedOp = createSignedOp(wallet, op);

        vm.expectEmit(false, true, true, false);
        emit PLCRegistry.LatestOp(signedOp.did, signedOp);

        registry.add(signedOp);

        require(equalBytes(registry.latestOps(signedOp.did), signedOp.cid));
        require(equalOperations(registry.getLastOperation(signedOp.did), signedOp));
    }

    function test_createPLC_rejected_invalid_signature() public {
        Vm.Wallet memory wallet = vm.createWallet("alice");

        Op memory op = newCreationOp(1);
        op.rotationKeys[0] = abi.encode(vm.addr(111));

        vm.expectRevert("signature invalid");

        SignedOp memory signedOp = createSignedOp(wallet, op);
        registry.add(signedOp);
    }

    function test_createPLC_second_key_signed() public {
        Vm.Wallet memory alice = vm.createWallet("alice");
        Vm.Wallet memory bob = vm.createWallet("bob");

        Op memory op = newCreationOp(2);
        op.rotationKeys[0] = abi.encode(alice.addr);
        op.rotationKeys[1] = abi.encode(bob.addr);

        SignedOp memory signedOp = createSignedOp(bob, op);

        vm.expectEmit(false, true, true, false);
        emit PLCRegistry.LatestOp(signedOp.did, signedOp);
        registry.add(signedOp);

        require(equalBytes(registry.latestOps(signedOp.did), signedOp.cid));
        require(equalOperations(registry.getLastOperation(signedOp.did), signedOp));
    }

    function test_updateOperation() public {
        Vm.Wallet memory alice = vm.createWallet("alice");
        Vm.Wallet memory bob = vm.createWallet("bob");

        // Step 1: create new
        Op memory op = newCreationOp(2);

        op.rotationKeys[0] = abi.encode(alice.addr);
        op.rotationKeys[1] = abi.encode(bob.addr);

        SignedOp memory signedOp = createSignedOp(bob, op);

        vm.expectEmit(false, true, true, false);
        emit PLCRegistry.LatestOp(signedOp.did, signedOp);
        registry.add(signedOp);

        require(equalBytes(registry.latestOps(signedOp.did), signedOp.cid));
        require(equalOperations(registry.getLastOperation(signedOp.did), signedOp));

        // Step 2: update
        // Persist only Alice's key
        Op memory updateOp = newUpdateOp(signedOp.cid, 1);
        updateOp.rotationKeys[0] = abi.encode(alice.addr);
        SignedOp memory signedUpdateOp = createSignedOp(alice, updateOp);

        vm.expectEmit(false, true, true, false);
        emit PLCRegistry.LatestOp(signedOp.did, signedUpdateOp);

        registry.add(signedUpdateOp);

        require(equalBytes(registry.latestOps(signedOp.did), signedUpdateOp.cid));
        require(equalOperations(registry.getLastOperation(signedOp.did), signedUpdateOp));
    }

    function test_forking() public {
        Vm.Wallet memory alice = vm.createWallet("alice");
        Vm.Wallet memory bob = vm.createWallet("bob");

        // Step 1: create new
        Op memory op = newCreationOp(2);

        op.rotationKeys[0] = abi.encode(alice.addr);
        op.rotationKeys[1] = abi.encode(bob.addr);

        SignedOp memory signedOp = createSignedOp(bob, op);

        vm.expectEmit(false, true, true, false);
        emit PLCRegistry.LatestOp(signedOp.did, signedOp);

        registry.add(signedOp);

        require(equalBytes(registry.latestOps(signedOp.did), signedOp.cid));

        // Step 2: update
        // Persist only Bob's key
        Op memory updateOp = newUpdateOp(signedOp.cid, 1);
        updateOp.rotationKeys[0] = abi.encode(bob.addr);
        SignedOp memory signedUpdateOp = createSignedOp(bob, updateOp);

        vm.expectEmit(false, true, true, false);
        emit PLCRegistry.LatestOp(signedUpdateOp.did, signedUpdateOp);

        registry.add(signedUpdateOp);

        require(equalBytes(registry.latestOps(signedOp.did), signedUpdateOp.cid));
        require(equalOperations(registry.getLastOperation(signedOp.did), signedUpdateOp));

        // Step 3: Alice got mad: she forks removing step 2 update, and banning Bob
        Op memory forkOp = newUpdateOp(signedOp.cid, 1);
        forkOp.rotationKeys[0] = abi.encode(alice.addr);
        SignedOp memory signedForkOp = createSignedOp(alice, updateOp);

        vm.expectEmit(false, true, true, false);
        emit PLCRegistry.LatestOp(signedForkOp.did, signedForkOp);

        registry.add(signedForkOp);

        require(equalBytes(registry.latestOps(signedOp.did), signedForkOp.cid));
        require(equalOperations(registry.getLastOperation(signedOp.did), signedForkOp));

        // Step 4: Bob realizes his step 2 attempt failed, and tries undo Alice's fork.
        // It fails as Alice has a more powerful key.
        Op memory undoForkOp = newUpdateOp(signedOp.cid, 1);
        vm.expectRevert("signature verification failed: signer not authorized to fork history");
        registry.add(createSignedOp(bob, undoForkOp));
    }
}
