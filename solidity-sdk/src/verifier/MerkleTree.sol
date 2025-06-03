// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

library MerkleTree {
    struct Proof {
        bytes32[] path;
    }

    struct MultiProof {
        bytes32[] path;
        bool[] flags;
    }

    function hashLeaf(bytes memory prefix, bytes32 leaf) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(prefix, leaf));
    }

    function verify(bytes32 root, bytes32 leaf, Proof memory proof) public pure returns (bool) {
        return MerkleProof.verify(proof.path, root, leaf);
    }

    function verifyMulti(bytes32 root, bytes32[] memory leaves, MultiProof memory proof) public pure returns (bool) {
        return MerkleProof.multiProofVerify(proof.path, proof.flags, root, leaves);
    }
}
