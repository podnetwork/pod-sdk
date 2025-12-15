// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library AttestedTx {
    // Pre-computed: keccak256(abi.encode(
    //     keccak256("EIP712Domain(string name,string version,uint256 chainId)"),
    //     keccak256(bytes("attest_tx")),
    //     keccak256(bytes("1")),
    //     0x50d
    // ))
    bytes32 private constant DOMAIN_SEPARATOR = 0x6f09feb1948d377c1eec05c649d5a37024b1ab05ace39b7a3becb9ed1ce1aba1;

    // EIP-712 digest = keccak256("\x19\x01" || domainSeparator || structHash)
    function digest(bytes32 txHash, uint64 committeeEpoch) public pure returns (bytes32) {
        bytes32 structHash =
            keccak256(abi.encode(keccak256("AttestedTx(bytes32 hash,uint64 committee_epoch)"), txHash, committeeEpoch));

        return keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
    }
}
