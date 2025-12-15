// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ECDSA} from "pod-sdk/verifier/ECDSA.sol";
import {MerkleTree} from "pod-sdk/verifier/MerkleTree.sol";
import {AttestedTx} from "../../src/libraries/AttestedTx.sol";

abstract contract BridgeClaimProofHelper is Test {
    uint256[] internal validatorPrivateKeys;
    address internal otherBridgeContract;

    function sortLeaves(bytes32[] memory leaves) internal pure {
        uint256 n = leaves.length;
        for (uint256 i = 1; i < n; ++i) {
            bytes32 key = leaves[i];
            uint256 j = i;
            while (j > 0 && leaves[j - 1] > key) {
                leaves[j] = leaves[j - 1];
                unchecked {
                    j--;
                }
            }
            leaves[j] = key;
        }
    }

    // OpenZeppelin's commutativeKeccak256 - sorts the two values before hashing
    function commutativeKeccak256(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }

    // Build complete merkle tree from sorted leaves and return the root
    function buildMerkleTree(bytes32[] memory sortedLeaves) internal pure returns (bytes32) {
        uint256 n = sortedLeaves.length;
        if (n == 0) return bytes32(0);
        if (n == 1) return sortedLeaves[0];

        uint256 treeLen = 2 * n - 1;
        bytes32[] memory tree = new bytes32[](treeLen);

        // Place leaves at the end of the tree array (in reverse order)
        for (uint256 i = 0; i < n; i++) {
            tree[treeLen - 1 - i] = sortedLeaves[i];
        }

        // Build tree from bottom up
        for (uint256 i = treeLen - n; i > 0;) {
            unchecked {
                i--;
            }
            uint256 leftIdx = 2 * i + 1;
            uint256 rightIdx = 2 * i + 2;
            tree[i] = commutativeKeccak256(tree[leftIdx], tree[rightIdx]);
        }

        return tree[0];
    }

    // Find the index of a leaf in the sorted leaves array, then map to tree index
    function findLeafTreeIndex(bytes32[] memory sortedLeaves, bytes32 leaf) internal pure returns (uint256) {
        uint256 n = sortedLeaves.length;
        uint256 treeLen = 2 * n - 1;
        for (uint256 i = 0; i < n; i++) {
            if (sortedLeaves[i] == leaf) {
                return treeLen - 1 - i;
            }
        }
        revert("Leaf not found");
    }

    // Generate multi-proof for given leaves from a tree built from sortedLeaves
    function generateMultiProof(bytes32[] memory sortedLeaves, bytes32[] memory proofLeaves)
        internal
        pure
        returns (MerkleTree.MultiProof memory)
    {
        uint256 n = sortedLeaves.length;
        uint256 treeLen = 2 * n - 1;

        // Build the full tree
        bytes32[] memory tree = new bytes32[](treeLen);
        for (uint256 i = 0; i < n; i++) {
            tree[treeLen - 1 - i] = sortedLeaves[i];
        }
        for (uint256 i = treeLen - n; i > 0;) {
            unchecked {
                i--;
            }
            uint256 leftIdx = 2 * i + 1;
            uint256 rightIdx = 2 * i + 2;
            tree[i] = commutativeKeccak256(tree[leftIdx], tree[rightIdx]);
        }

        // Get tree indices for proof leaves (sorted in descending order)
        uint256[] memory indices = new uint256[](proofLeaves.length);
        for (uint256 i = 0; i < proofLeaves.length; i++) {
            indices[i] = findLeafTreeIndex(sortedLeaves, proofLeaves[i]);
        }
        // Sort indices in descending order
        for (uint256 i = 0; i < indices.length; i++) {
            for (uint256 j = i + 1; j < indices.length; j++) {
                if (indices[j] > indices[i]) {
                    (indices[i], indices[j]) = (indices[j], indices[i]);
                }
            }
        }

        // Generate multi-proof using the same algorithm as Rust implementation
        bytes32[] memory pathDynamic = new bytes32[](treeLen);
        bool[] memory flagsDynamic = new bool[](treeLen);
        uint256 pathLen = 0;
        uint256 flagsLen = 0;

        // Use a queue-like approach with fixed array
        uint256[] memory stack = new uint256[](treeLen);
        uint256 stackStart = 0;
        uint256 stackEnd = indices.length;
        for (uint256 i = 0; i < indices.length; i++) {
            stack[i] = indices[i];
        }

        while (stackStart < stackEnd) {
            uint256 j = stack[stackStart];
            stackStart++;

            if (j == 0) break;

            uint256 s = (j % 2 == 0) ? j - 1 : j + 1; // sibling
            uint256 p = (j - 1) / 2; // parent

            bool siblingInStack = false;
            if (stackStart < stackEnd && stack[stackStart] == s) {
                siblingInStack = true;
            }

            if (siblingInStack) {
                flagsDynamic[flagsLen++] = true;
                stackStart++; // pop sibling
            } else {
                flagsDynamic[flagsLen++] = false;
                pathDynamic[pathLen++] = tree[s];
            }

            stack[stackEnd++] = p;
        }

        // Copy to correctly sized arrays
        bytes32[] memory path = new bytes32[](pathLen);
        bool[] memory flags = new bool[](flagsLen);
        for (uint256 i = 0; i < pathLen; i++) {
            path[i] = pathDynamic[i];
        }
        for (uint256 i = 0; i < flagsLen; i++) {
            flags[i] = flagsDynamic[i];
        }

        return MerkleTree.MultiProof({path: path, flags: flags});
    }

    function createTokenClaimProof(address claimToken, uint256 amount, address to, uint256 numberOfRequiredSignatures)
        internal
        view
        returns (
            bytes32 txHash,
            uint64 committeeEpoch,
            bytes memory aggregatedSignatures,
            MerkleTree.MultiProof memory proof
        )
    {
        committeeEpoch = 0;

        bytes4 selector = bytes4(keccak256("deposit(address,uint256,address)"));
        address txFrom = address(0xDEAD);
        uint256 txValue = 0;
        uint64 txNonce = 0;

        bytes32[] memory allLeaves = new bytes32[](5);
        allLeaves[0] = MerkleTree.hashLeaf("from", keccak256(abi.encode(txFrom)));
        allLeaves[1] = MerkleTree.hashLeaf("to", keccak256(abi.encode(otherBridgeContract)));
        allLeaves[2] = MerkleTree.hashLeaf("value", keccak256(abi.encode(txValue)));
        allLeaves[3] =
            MerkleTree.hashLeaf("input", keccak256(abi.encodePacked(selector, abi.encode(claimToken, amount, to))));
        allLeaves[4] = MerkleTree.hashLeaf("nonce", keccak256(abi.encode(txNonce)));

        sortLeaves(allLeaves);
        txHash = buildMerkleTree(allLeaves);

        bytes32[] memory proofLeaves = new bytes32[](2);
        proofLeaves[0] = MerkleTree.hashLeaf("to", keccak256(abi.encode(otherBridgeContract)));
        proofLeaves[1] =
            MerkleTree.hashLeaf("input", keccak256(abi.encodePacked(selector, abi.encode(claimToken, amount, to))));
        sortLeaves(proofLeaves);

        proof = generateMultiProof(allLeaves, proofLeaves);

        bytes32 attestedHash = AttestedTx.digest(txHash, committeeEpoch);
        bytes32 signedHash = keccak256(abi.encode(attestedHash));

        bytes[] memory signatures = new bytes[](numberOfRequiredSignatures);
        for (uint256 i = 0; i < numberOfRequiredSignatures; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(validatorPrivateKeys[i], signedHash);
            signatures[i] = ECDSA._serialize_signature(v, r, s);
        }
        aggregatedSignatures = ECDSA.aggregate_signatures(signatures);
    }

    function createNativeClaimProof(uint256 amount, address to, uint256 numberOfRequiredSignatures)
        internal
        view
        returns (
            bytes32 txHash,
            uint64 committeeEpoch,
            bytes memory aggregatedSignatures,
            MerkleTree.MultiProof memory proof
        )
    {
        committeeEpoch = 0;

        bytes4 selector = bytes4(keccak256("depositNative(address)"));
        address txFrom = address(0xDEAD);
        uint64 txNonce = 0;

        bytes32[] memory allLeaves = new bytes32[](5);
        allLeaves[0] = MerkleTree.hashLeaf("from", keccak256(abi.encode(txFrom)));
        allLeaves[1] = MerkleTree.hashLeaf("to", keccak256(abi.encode(otherBridgeContract)));
        allLeaves[2] = MerkleTree.hashLeaf("value", keccak256(abi.encode(amount)));
        allLeaves[3] = MerkleTree.hashLeaf("input", keccak256(abi.encodePacked(selector, abi.encode(to))));
        allLeaves[4] = MerkleTree.hashLeaf("nonce", keccak256(abi.encode(txNonce)));

        sortLeaves(allLeaves);
        txHash = buildMerkleTree(allLeaves);

        bytes32[] memory proofLeaves = new bytes32[](3);
        proofLeaves[0] = MerkleTree.hashLeaf("to", keccak256(abi.encode(otherBridgeContract)));
        proofLeaves[1] = MerkleTree.hashLeaf("value", keccak256(abi.encode(amount)));
        proofLeaves[2] = MerkleTree.hashLeaf("input", keccak256(abi.encodePacked(selector, abi.encode(to))));
        sortLeaves(proofLeaves);

        proof = generateMultiProof(allLeaves, proofLeaves);

        bytes32 attestedHash = AttestedTx.digest(txHash, committeeEpoch);
        bytes32 signedHash = keccak256(abi.encode(attestedHash));

        bytes[] memory signatures = new bytes[](numberOfRequiredSignatures);
        for (uint256 i = 0; i < numberOfRequiredSignatures; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(validatorPrivateKeys[i], signedHash);
            signatures[i] = ECDSA._serialize_signature(v, r, s);
        }
        aggregatedSignatures = ECDSA.aggregate_signatures(signatures);
    }

    // Helper for token-to-native claims (same structure as createTokenClaimProof)
    function createTokenClaimProofForNative(
        address claimToken,
        uint256 amount,
        address to,
        uint256 numberOfRequiredSignatures
    )
        internal
        view
        returns (
            bytes32 txHash,
            uint64 committeeEpoch,
            bytes memory aggregatedSignatures,
            MerkleTree.MultiProof memory proof
        )
    {
        return createTokenClaimProof(claimToken, amount, to, numberOfRequiredSignatures);
    }
}
