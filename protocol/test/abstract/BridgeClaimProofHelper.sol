// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Attestation} from "../../src/lib/Attestation.sol";

abstract contract BridgeClaimProofHelper is Test {
    uint256[] internal validatorPrivateKeys;
    address internal otherBridgeContract;

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

        bytes32 data = keccak256(abi.encodePacked(
            selector,
            abi.encode(claimToken, amount, to)
        ));
        txHash = keccak256(abi.encodePacked(
            keccak256(abi.encode(otherBridgeContract)),
            data,
            keccak256(abi.encode(txValue)),
            keccak256(abi.encode(txFrom)),
            keccak256(abi.encode(txNonce))
        ));
        proof = abi.encodePacked(
            keccak256(abi.encode(txValue)),
            keccak256(abi.encode(txFrom)),
            keccak256(abi.encode(txNonce))
        );

        bytes32 signedHash = Attestation.computeTxDigest(txHash, committeeEpoch);

        bytes[] memory signatures = new bytes[](numberOfRequiredSignatures);
        for (uint256 i = 0; i < numberOfRequiredSignatures; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(validatorPrivateKeys[i], signedHash);
            signatures[i] = Attestation._serializeSignature(v, r, s);
        }
        aggregatedSignatures = Attestation.aggregateSignatures(signatures);
    }
}
