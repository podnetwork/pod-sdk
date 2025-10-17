// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library HexUtils {
    error Empty();
    error InvalidHexChar(uint8 ch, uint256 pos);
    error Overflow256();

    bytes16 private constant _HEX = "0123456789abcdef";

    /// @notice Parse raw big-endian bytes into uint256 (e.g. 0x01 0x56).
    /// @param b The bytes to parse.
    /// @return v The parsed uint256.
    function uintFromBigEndian(bytes memory b) internal pure returns (uint256 v) {
        uint256 len = b.length;
        if (len == 0) revert Empty();
        if (len > 32) revert Overflow256();
        for (uint256 i = 0; i < len; ++i) {
            v = (v << 8) | uint8(b[i]);
        }
    }

    /// @notice Minimal big-endian BINARY bytes: 1 -> 0x01, 0 -> 0x00.
    /// @param value The value to convert.
    /// @return out The converted bytes.
    function toBytesMinimal(uint256 value) internal pure returns (bytes memory out) {
        if (value == 0) return hex"00";
        uint256 v = value;
        uint256 len;
        while (v != 0) {
            len++;
            v >>= 8;
        }
        out = new bytes(len);
        v = value;
        for (uint256 i = len; i > 0;) {
            out[--i] = bytes1(uint8(v));
            v >>= 8;
        }
    }
}
