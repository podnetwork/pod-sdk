// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library Attestation {
    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

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
    }
}
