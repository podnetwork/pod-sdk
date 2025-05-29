// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MerkleTree} from "../src/verifier/MerkleTree.sol";

contract MerkleTreeTest is Test {
    function test_verify() public pure {
        uint32 value = 2;
        bytes32 root = 0xc84705d044e65e75a06170d04a5c500a3c5e67a25d78f51e1fe5b335c6d2c061;
        bytes32 leaf = MerkleTree.hashLeaf("1", keccak256(abi.encode(value)));
        bytes32[] memory path = new bytes32[](2);
        path[0] = 0x6eef1bdbbf9ef5ea6f7d9d4bcfd68814b63d8a67282870fd06f8b71881c28ca5;
        path[1] = 0xb171fd7ff2f24f62f3990eff676ab69ab9bd4857c00dfa3e01eec0d3ef64871b;
        MerkleTree.Proof memory proof = MerkleTree.Proof(path);
        assertTrue(MerkleTree.verify(root, leaf, proof));
    }

    function test_verifyMulti() public pure {
        bytes32 root = 0xc84705d044e65e75a06170d04a5c500a3c5e67a25d78f51e1fe5b335c6d2c061;
        uint32[3] memory values = [uint32(1), uint32(2), uint32(3)];
        bytes32[] memory leaves = new bytes32[](2);
        leaves[0] = MerkleTree.hashLeaf("1", keccak256(abi.encode(values[1])));
        assertEq(leaves[0], 0x779545f8e2d60d00da58de68813712896298e8e7cb10694d53aa239253a78bca);
        leaves[1] = MerkleTree.hashLeaf("2", keccak256(abi.encode(values[2])));
        assertEq(leaves[1], 0x6eef1bdbbf9ef5ea6f7d9d4bcfd68814b63d8a67282870fd06f8b71881c28ca5);
        bytes32[] memory path = new bytes32[](1);
        path[0] = 0xb171fd7ff2f24f62f3990eff676ab69ab9bd4857c00dfa3e01eec0d3ef64871b;
        bool[] memory flags = new bool[](2);
        flags[0] = true;
        flags[1] = false;
        MerkleTree.MultiProof memory proof = MerkleTree.MultiProof(path, flags);
        assertTrue(MerkleTree.verifyMulti(root, leaves, proof));
    }
}
