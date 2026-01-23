// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title ProofLib
 * @notice Library for signature and merkle proof verification in quorum-based systems.
 */
library ProofLib {
    /**
     * @dev Proof type enum.
     * @param Certificate Validator certificate signatures.
     * @param Merkle Merkle inclusion proof.
     */
    enum ProofType {
        Certificate,
        Merkle
    }

    error InvalidSignatureOrder();
    error SignerNotActiveValidator();
    error InvalidProofType();

    function recoverSignerAt(bytes32 digest, bytes calldata aggregateSignature, uint256 index)
        internal
        pure
        returns (address signer)
    {
        uint256 offset;
        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            offset := add(aggregateSignature.offset, mul(index, 65))
            r := calldataload(offset)
            s := calldataload(add(offset, 32))
            v := byte(0, calldataload(add(offset, 64)))
        }

        signer = ecrecover(digest, v, r, s);
        require(signer != address(0), "Invalid signature");
    }

    /**
     * @notice Compute the weight of signatures for a transaction hash.
     * @param txHash The transaction hash to verify.
     * @param aggregateSignature The aggregated signatures.
     * @param activeValidators Mapping of active validators.
     * @return weight The number of valid signatures.
     */
    function computeTxWeight(
        bytes32 txHash,
        bytes calldata aggregateSignature,
        mapping(address => bool) storage activeValidators
    ) internal view returns (uint256 weight) {
        uint256 count = aggregateSignature.length / 65;
        address lastSigner = address(0);

        for (uint256 i = 0; i < count; ++i) {
            address signer = recoverSignerAt(txHash, aggregateSignature, i);
            if (signer <= lastSigner) {
                revert InvalidSignatureOrder();
            }
            if (!activeValidators[signer]) {
                revert SignerNotActiveValidator();
            }
            lastSigner = signer;
        }

        return count;
    }

    /**
     * @notice Verify a merkle inclusion proof for a transaction hash.
     * @param txHash The transaction hash (leaf) to verify.
     * @param merkleProof The merkle proof bytes.
     * @param merkleRoot The merkle root to verify against.
     * @return valid True if the proof is valid.
     */
    function verifyMerkleProof(bytes32 txHash, bytes calldata merkleProof, bytes32 merkleRoot)
        internal
        pure
        returns (bool valid)
    {
        bytes32[] memory proof = abi.decode(merkleProof, (bytes32[]));
        return MerkleProof.verify(proof, merkleRoot, txHash);
    }
}
