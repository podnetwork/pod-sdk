// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/verifier/TimedAttestationVerifier.sol";

contract TimedAttestationVerifierTest is Test {
    TimedAttestationVerifier verifier;
    address signer;
    uint256 privateKey;

    function setUp() public {
        verifier = new TimedAttestationVerifier();
        privateKey = 0xA11CE;
        signer = vm.addr(privateKey);
    }

    function testValidAndNotExpired() public view {
        bytes32 message = keccak256("timed msg");
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, message);
        bytes memory signature = abi.encodePacked(r, s, v);

        uint256 deadline = block.timestamp + 100;
        bytes memory attestation = abi.encode(signer, message, signature, deadline);

        bool result = verifier.verifyTimedAttestation(attestation);
        assertTrue(result);
    }

    function testExpiredAttestation() public {
        bytes32 message = keccak256("timed msg");
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, message);
        bytes memory signature = abi.encodePacked(r, s, v);

        uint256 deadline = block.timestamp;
        vm.warp(block.timestamp + 1); // simulate time passed

        bytes memory attestation = abi.encode(signer, message, signature, deadline);

        vm.expectRevert("attestation expired");
        verifier.verifyTimedAttestation(attestation);
    }
}
