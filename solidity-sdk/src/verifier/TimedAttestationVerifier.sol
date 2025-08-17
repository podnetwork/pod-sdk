// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ExtendedECDSA.sol";

contract TimedAttestationVerifier {
    using ExtendedECDSA for bytes32;

    /// @notice Verifies a timed attestation and returns true if valid and not expired
    /// @param attestation Encoded as: abi.encode(signer, messageHash, signature, deadline)
    function verifyTimedAttestation(bytes calldata attestation) external view returns (bool) {
        (address signer, bytes32 messageHash, bytes memory signature, uint256 deadline) =
            abi.decode(attestation, (address, bytes32, bytes, uint256));

        require(block.timestamp <= deadline, "attestation expired");

        address recovered = messageHash.recover(signature);
        return recovered == signer;
    }
}
