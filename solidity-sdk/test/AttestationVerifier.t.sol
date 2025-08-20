// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/verifier/AttestationVerifier.sol";
import "../src/verifier/ECDSA.sol";

contract AttestationVerifierTest is Test {
    AttestationVerifier verifier;
    address signer;
    uint256 privateKey;

    function setUp() public {
        verifier = new AttestationVerifier();
        privateKey = 0xA11CE;
        signer = vm.addr(privateKey);
    }

    function testValidAttestation() public view {
        bytes32 message = keccak256("Hello Pod");
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, message);
        bytes memory signature = abi.encodePacked(r, s, v);

        bytes memory attestation = abi.encode(signer, message, signature);
        bool result = verifier.verifyAttestation(attestation);

        assertTrue(result, "Attestation should be valid");
    }

    function testInvalidSignature() public view {
        bytes32 message = keccak256("Hello Pod");
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey + 1, message); 
        bytes memory signature = abi.encodePacked(r, s, v);

        bytes memory attestation = abi.encode(signer, message, signature);
        bool result = verifier.verifyAttestation(attestation);

        assertFalse(result, "Should fail");
    }
}
