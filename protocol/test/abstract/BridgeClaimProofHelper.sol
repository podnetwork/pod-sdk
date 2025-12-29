// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Attestation} from "../../src/lib/Attestation.sol";

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


    function createTokenClaimProof(address claimToken, uint256 amount, address to, uint256 numberOfRequiredSignatures)
        internal
        view
        returns (
            bytes32 txHash,
            uint64 committeeEpoch,
            bytes memory aggregatedSignatures,
            bytes memory proof
        )
    {
        committeeEpoch = 0;

        bytes4 selector = bytes4(keccak256("deposit(address,uint256,address)"));
        address txFrom = address(0xDEAD);
        uint256 txValue = 0;
        uint64 txNonce = 0;

        bytes32 data = keccak256(abi.encodeWithSelector(
            selector,
            claimToken, 
            amount, 
            to
        ));

        txHash = keccak256(abi.encode(
            otherBridgeContract,
            data,
            txValue,
            txFrom,
            txNonce
        ));
        proof = abi.encode(
            txValue,
            txFrom,
            txNonce
        );

        bytes32 signedHash = Attestation.computeTxDigest(txHash, committeeEpoch);

        bytes[] memory signatures = new bytes[](numberOfRequiredSignatures);
        for (uint256 i = 0; i < numberOfRequiredSignatures; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(validatorPrivateKeys[i], signedHash);
            signatures[i] = serializeSignature(v, r, s);
        }
        aggregatedSignatures = aggregateSignatures(signatures);
    }
}
