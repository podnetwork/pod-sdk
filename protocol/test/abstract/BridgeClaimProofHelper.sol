// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ProofLib} from "../../src/lib/ProofLib.sol";

abstract contract BridgeClaimProofHelper is Test {
    uint256[] internal validatorPrivateKeys;
    address internal otherBridgeContract;

    function serializeSignature(uint8 v, bytes32 r, bytes32 s) internal pure returns (bytes memory) {
        return abi.encodePacked(r, s, v);
    }

    function aggregateSignatures(bytes[] memory signatures) internal pure returns (bytes memory aggregate) {
        uint256 signatureCount = signatures.length;
        aggregate = new bytes(signatureCount * 65);
        for (uint256 i = 0; i < signatureCount; i++) {
            bytes memory signature = signatures[i];
            require(signature.length == 65, "invalid signature length");
            for (uint256 j = 0; j < 65; j++) {
                aggregate[i * 65 + j] = signature[j];
            }
        }
    }

    function createTokenClaimProof(
        address claimToken,
        uint256 amount,
        address to,
        uint256 numberOfRequiredSignatures,
        bytes32 domainSeparator
    ) internal view returns (bytes32 txHash, bytes memory proof, bytes memory auxTxSuffix) {
        bytes4 selector = bytes4(keccak256("deposit(address,uint256,address)"));

        // Match the exact encoding used by Bridge.depositTxHash():
        // dataHash = keccak256(selector || token || amount || to) where each is 32-byte aligned
        // selector at offset 0 (4 bytes), token at offset 4 (32 bytes), amount at offset 36, to at offset 68
        // Total: 100 bytes
        bytes32 dataHash =
            keccak256(abi.encodePacked(selector, uint256(uint160(claimToken)), amount, uint256(uint160(to))));

        // auxTxSuffix is empty for simplified version
        auxTxSuffix = "";

        // txHash = keccak256(domainSeparator || bridgeContract || dataHash || auxTxSuffix)
        // Each is 32-byte aligned, total 96 bytes when auxTxSuffix is empty
        txHash = keccak256(abi.encodePacked(domainSeparator, bytes32(uint256(uint160(otherBridgeContract))), dataHash));

        // Sort validators by address for signature ordering requirement
        uint256[] memory sortedKeys = new uint256[](numberOfRequiredSignatures);
        address[] memory sortedAddrs = new address[](numberOfRequiredSignatures);

        for (uint256 i = 0; i < numberOfRequiredSignatures; i++) {
            sortedKeys[i] = validatorPrivateKeys[i];
            sortedAddrs[i] = vm.addr(validatorPrivateKeys[i]);
        }

        // Simple bubble sort by address
        for (uint256 i = 0; i < numberOfRequiredSignatures; i++) {
            for (uint256 j = i + 1; j < numberOfRequiredSignatures; j++) {
                if (sortedAddrs[i] > sortedAddrs[j]) {
                    (sortedAddrs[i], sortedAddrs[j]) = (sortedAddrs[j], sortedAddrs[i]);
                    (sortedKeys[i], sortedKeys[j]) = (sortedKeys[j], sortedKeys[i]);
                }
            }
        }

        bytes[] memory signatures = new bytes[](numberOfRequiredSignatures);
        for (uint256 i = 0; i < numberOfRequiredSignatures; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(sortedKeys[i], txHash);
            signatures[i] = serializeSignature(v, r, s);
        }

        // Prepend proof type byte (0 = Certificate) to aggregated signatures
        proof = abi.encodePacked(uint8(ProofLib.ProofType.Certificate), aggregateSignatures(signatures));
    }
}
