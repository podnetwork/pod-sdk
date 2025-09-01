// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ExtendedECDSA.sol";

contract AttestationVerifier {
    using ExtendedECDSA for bytes32;

    /// @notice Verifies the attestation and returns true if valid
    /// @param attestation Encoded as: abi.encode(signer, message, signature)
    function verifyAttestation(bytes calldata attestation) external pure returns (bool) {
        (address expectedSigner, bytes32 messageHash, bytes memory signature) =
            abi.decode(attestation, (address, bytes32, bytes));

        // Recover signer from message and signature
        address recovered = messageHash.recover(signature);

        return recovered == expectedSigner;
    }
}
