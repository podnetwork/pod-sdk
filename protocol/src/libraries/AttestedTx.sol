// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

library AttestedTx {
    using ECDSA for bytes32;

    struct AttestedTx {
        bytes32 hash;
        uint64 committee_epoch;
    }

    // ---- Domain (must match Rust) ----
    string private constant NAME = "attest_tx";
    string private constant VERSION = "1";
    uint256 private constant CHAIN_ID = 0x50d; // 1293 decimal

    bytes32 private constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId)");

    function _domainSeparatorV4() internal pure returns (bytes32) {
        return keccak256(abi.encode(DOMAIN_TYPEHASH, keccak256(bytes(NAME)), keccak256(bytes(VERSION)), CHAIN_ID));
    }

    // ---- Struct hash ----
    bytes32 private constant ATTESTED_TX_TYPEHASH = keccak256("AttestedTx(bytes32 hash,uint64 committee_epoch)");

    function _hashAttestedTx(AttestedTx memory a) internal pure returns (bytes32) {
        return keccak256(abi.encode(ATTESTED_TX_TYPEHASH, a.hash, a.committee_epoch));
    }

    // EIP-712 digest = keccak256("\x19\x01" || domainSeparator || structHash)
    function digest(AttestedTx memory a) public pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", _domainSeparatorV4(), _hashAttestedTx(a)));
    }
}
