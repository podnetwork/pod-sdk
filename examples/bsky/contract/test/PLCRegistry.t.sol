// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console, Vm} from "forge-std/Test.sol";
import {PLCRegistry, Op, SignedOp, VERIFY_SIGNATURE, DAG_CBOR} from "../src/PLCRegistry.sol";

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

contract VotingTest is Test {
    PLCRegistry public registry;

    function setUp() public {
        MockVerifySignature mock = new MockVerifySignature();
        vm.etch(VERIFY_SIGNATURE, address(mock).code);
        console.log("MockVerifySignature address:", VERIFY_SIGNATURE);

        MockDagCbor mock_cbor = new MockDagCbor();
        vm.etch(DAG_CBOR, address(mock_cbor).code);
        console.log("MockDagCbor address:", DAG_CBOR);

        registry = new PLCRegistry();
    }

    function signOp(Vm.Wallet memory wallet, Op memory op) private returns (SignedOp memory) {
        bytes32 hash = keccak256(dagCbor(op));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wallet, hash);
        return SignedOp({op: op, signature: abi.encode(v, r, s)});
    }

    function test_createPLC() public {
        Vm.Wallet memory wallet = vm.createWallet("alice");

        Op memory op = Op({
            did: bytes32("did:plc:abcdefghijklmnopqrstuvwz"),
            cid: "cid",
            prev: "",
            rotationKeys: new bytes[](1),
            encodedOp: "encodedOp"
        });
        op.rotationKeys[0] = abi.encode(wallet.addr);

        vm.expectEmit(false, true, true, false);
        emit PLCRegistry.LatestOp(op.did, op);

        SignedOp memory signedOp = signOp(wallet, op);
        registry.add(signedOp);

        require(equalBytes(registry.latestOps(op.did), op.cid));
        require(equalBytes(registry.getLastOperation(op.did), op.encodedOp));
    }

    function test_createPLC_rejected_invalid_signature() public {
        Vm.Wallet memory wallet = vm.createWallet("alice");

        Op memory op = Op({
            did: bytes32("did:plc:abcdefghijklmnopqrstuvwz"),
            cid: "cid",
            prev: "",
            rotationKeys: new bytes[](1),
            encodedOp: "encodedOp"
        });
        op.rotationKeys[0] = abi.encode(vm.addr(111));

        vm.expectRevert("signature invalid");
        SignedOp memory signedOp = signOp(wallet, op);
        registry.add(signedOp);
    }

    function test_createPLC_second_key_signed() public {
        Vm.Wallet memory alice = vm.createWallet("alice");
        Vm.Wallet memory bob = vm.createWallet("bob");

        Op memory op = Op({
            did: bytes32("did:plc:abcdefghijklmnopqrstuvwz"),
            cid: "cid",
            prev: "",
            rotationKeys: new bytes[](2),
            encodedOp: "encodedOp"
        });
        op.rotationKeys[0] = abi.encode(alice.addr);
        op.rotationKeys[1] = abi.encode(bob.addr);

        vm.expectEmit(false, true, true, false);
        emit PLCRegistry.LatestOp(op.did, op);

        SignedOp memory signedOp = signOp(bob, op);
        registry.add(signedOp);

        require(equalBytes(registry.latestOps(op.did), op.cid));
        require(equalBytes(registry.getLastOperation(op.did), op.encodedOp));
    }

    function test_updateOperation() public {
        Vm.Wallet memory alice = vm.createWallet("alice");
        Vm.Wallet memory bob = vm.createWallet("bob");

        // Step 1: create new
        Op memory op = Op({
            did: bytes32("did:plc:abcdefghijklmnopqrstuvwz"),
            cid: "cid",
            prev: "",
            rotationKeys: new bytes[](2),
            encodedOp: "encodedOp"
        });
        op.rotationKeys[0] = abi.encode(alice.addr);
        op.rotationKeys[1] = abi.encode(bob.addr);

        vm.expectEmit(false, true, true, false);
        emit PLCRegistry.LatestOp(op.did, op);

        SignedOp memory signedOp = signOp(bob, op);
        registry.add(signedOp);

        require(equalBytes(registry.latestOps(op.did), op.cid));
        require(equalBytes(registry.getLastOperation(op.did), op.encodedOp));

        // Step 2: update
        // Persist only Alice's key
        Op memory updateOp =
            Op({did: op.did, cid: "cid2", prev: op.cid, rotationKeys: new bytes[](1), encodedOp: "encodedOp2"});
        updateOp.rotationKeys[0] = abi.encode(alice.addr);

        vm.expectEmit(false, true, true, false);
        emit PLCRegistry.LatestOp(updateOp.did, updateOp);

        SignedOp memory signedUpdateOp = signOp(alice, updateOp);
        registry.add(signedUpdateOp);

        require(equalBytes(registry.latestOps(updateOp.did), updateOp.cid));
        require(equalBytes(registry.getLastOperation(updateOp.did), updateOp.encodedOp));
    }

    function test_forking() public {
        Vm.Wallet memory alice = vm.createWallet("alice");
        Vm.Wallet memory bob = vm.createWallet("bob");

        // Step 1: create new
        Op memory op = Op({
            did: bytes32("did:plc:abcdefghijklmnopqrstuvwz"),
            cid: "cid",
            prev: "",
            rotationKeys: new bytes[](2),
            encodedOp: "encodedOp"
        });
        op.rotationKeys[0] = abi.encode(alice.addr);
        op.rotationKeys[1] = abi.encode(bob.addr);

        vm.expectEmit(false, true, true, false);
        emit PLCRegistry.LatestOp(op.did, op);

        SignedOp memory signedOp = signOp(bob, op);
        registry.add(signedOp);

        require(equalBytes(registry.latestOps(op.did), op.cid));
        require(equalBytes(registry.getLastOperation(op.did), op.encodedOp));

        // Step 2: update
        // Persist only Bob's key
        Op memory updateOp =
            Op({did: op.did, cid: "cid2", prev: op.cid, rotationKeys: new bytes[](1), encodedOp: "encodedOp2"});
        updateOp.rotationKeys[0] = abi.encode(bob.addr);

        vm.expectEmit(false, true, true, false);
        emit PLCRegistry.LatestOp(updateOp.did, updateOp);

        SignedOp memory signedUpdateOp = signOp(bob, updateOp);
        registry.add(signedUpdateOp);

        require(equalBytes(registry.latestOps(updateOp.did), updateOp.cid));
        require(equalBytes(registry.getLastOperation(updateOp.did), updateOp.encodedOp));


        // Step 3: Alice got mad: she forks removing step 2 update, and banning Bob
        Op memory forkOp = Op({
            did: op.did,
            cid: "cid3",
            prev: op.cid,
            rotationKeys: new bytes[](1),
            encodedOp: "encodedOp3"
        });
        forkOp.rotationKeys[0] = abi.encode(alice.addr);

        vm.expectEmit(false, true, true, false);
        emit PLCRegistry.LatestOp(forkOp.did, forkOp);

        SignedOp memory signedForkOp = signOp(alice, forkOp);
        registry.add(signedForkOp);

        require(equalBytes(registry.latestOps(forkOp.did), forkOp.cid));
        require(equalBytes(registry.getLastOperation(forkOp.did), forkOp.encodedOp));

        // Step 4: Bob realizes his step 2 attempt failed, and tries undo Alice's fork.
        // It fails as Alice has a more powerful key.
        Op memory undoForkOp = Op({
            did: op.did,
            cid: "cid4",
            prev: op.cid,
            rotationKeys: new bytes[](1),
            encodedOp: "encodedOp4"
        });
        vm.expectRevert("signature invalid (not allowed to fork)");
        registry.add(signOp(alice, undoForkOp));
    }
}
