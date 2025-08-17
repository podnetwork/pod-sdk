// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ExtendedECDSA - Adds recover(bytes) support to Pod ECDSA library
library ExtendedECDSA {
    function recover(bytes32 hash, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "ECDSA: invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }

        require(uint256(s) <= 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff, "ECDSA: invalid s value");
        require(v == 27 || v == 28, "ECDSA: invalid v value");

        return ecrecover(hash, v, r, s);
    }
}
