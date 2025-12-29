// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library Attestation {
    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    bytes32 private constant DOMAIN_SEPARATOR = keccak256(
        abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId)"),
            keccak256(bytes("attest_tx")),
            keccak256(bytes("1")),
            0x50d
        )
    );
    bytes4 private constant ATTSTX_TYPEHASH = bytes4(keccak256("AttestedTx(bytes32 hash,uint64 committee_epoch)"));

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

    // EIP-712 digest = keccak256("\x19\x01" || domainSeparator || structHash)
    function computeTxDigest(bytes32 txHash, uint64 committeeEpoch) public pure returns (bytes32 result) {
        bytes4 selector = ATTSTX_TYPEHASH;
        bytes32 domainSeparator = DOMAIN_SEPARATOR;

        assembly {
            let ptr := mload(0x40)

            // structHash = keccak256(abi.encode(selector, txHash, committeeEpoch))
            mstore(ptr, selector)
            mstore(add(ptr, 0x20), txHash)
            mstore(add(ptr, 0x40), committeeEpoch)
            let structHash := keccak256(ptr, 0x60)

            // result = keccak256("\x19\x01" || DOMAIN_SEPARATOR || structHash)
            mstore(ptr, "\x19\x01")
            mstore(add(ptr, 0x02), domainSeparator)
            mstore(add(ptr, 0x22), structHash)
            result := keccak256(ptr, 0x42)
        }
    }
}
