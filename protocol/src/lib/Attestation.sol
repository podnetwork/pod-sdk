// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library Attestation {
    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    // Pre-computed: keccak256(abi.encode(
    //     keccak256("EIP712Domain(string name,string version,uint256 chainId)"),
    //     keccak256(bytes("attest_tx")),
    //     keccak256(bytes("1")),
    //     0x50d
    // ))
    bytes32 private constant DOMAIN_SEPARATOR = 0x6f09feb1948d377c1eec05c649d5a37024b1ab05ace39b7a3becb9ed1ce1aba1;

    function _serializeSignature(uint8 v, bytes32 r, bytes32 s) internal pure returns (bytes memory signature) {
        signature = new bytes(65);
        assembly {
            mstore(add(signature, 32), r)
            mstore(add(signature, 64), s)
            mstore8(add(signature, 96), v)
        }
    }

    function serializeSignature(Signature memory signature) internal pure returns (bytes memory) {
        return _serializeSignature(signature.v, signature.r, signature.s);
    }

    function serializeSignatures(Signature[] memory signatures) internal pure returns (bytes[] memory serialized) {
        serialized = new bytes[](signatures.length);
        for (uint256 i = 0; i < signatures.length; i++) {
            serialized[i] = _serializeSignature(signatures[i].v, signatures[i].r, signatures[i].s);
        }
    }

    function _deserializeSignature(bytes memory signature) internal pure returns (uint8 v, bytes32 r, bytes32 s) {
        require(signature.length == 65, "invalid signature length");
        assembly {
            let ptr := add(signature, 32)
            r := mload(ptr)
            s := mload(add(ptr, 32))
            v := byte(0, mload(add(ptr, 64)))
        }
    }

    function deserializeSignature(bytes memory signature) internal pure returns (Signature memory) {
        (uint8 v, bytes32 r, bytes32 s) = _deserializeSignature(signature);
        return Signature(v, r, s);
    }

    // Takes encoded ECDSA signatures and returns them concatenated.
    // Each signature should be 65 bytes long.
    function aggregateSignatures(bytes[] memory signatures) internal pure returns (bytes memory aggregate) {
        uint256 signatureCount = signatures.length;
        aggregate = new bytes(signatureCount * 65);
        assembly {
            let signaturesPtr := add(signatures, 32)
            let aggregatePtr := add(aggregate, 32)

            for { let i := 0 } lt(i, signatureCount) { i := add(i, 1) } {
                let signature := mload(add(signaturesPtr, mul(i, 32)))

                if iszero(eq(mload(signature), 65)) {
                    mstore(0, 32) // offset for error
                    mstore(32, 23) // length of error string
                    mstore(64, "invalid signature length") // error string
                    revert(0, 64) // revert with error reason
                }

                mstore(aggregatePtr, mload(add(signature, 32)))
                mstore(add(aggregatePtr, 32), mload(add(signature, 64)))
                mstore8(add(aggregatePtr, 64), byte(0, mload(add(signature, 96))))

                aggregatePtr := add(aggregatePtr, 65)
            }
        }
    }
    
    function recoverSigner(bytes32 digest, Signature memory signature) internal pure returns (address) {
        return ecrecover(digest, signature.v, signature.r, signature.s);
    }

    function recoverSigners(bytes32 digest, bytes memory aggregateSignature) internal pure returns (address[] memory) {
        require(aggregateSignature.length % 65 == 0, "invalid aggregate length");

        uint256 signatureCount = aggregateSignature.length / 65;
        address[] memory signers = new address[](signatureCount);

        uint256 offset;
        assembly {
            offset := add(aggregateSignature, 32)
        }

        for (uint256 i = 0; i < signatureCount; i++) {
            bytes32 r;
            bytes32 s;
            uint8 v;

            assembly {
                r := mload(offset)
                s := mload(add(offset, 32))
                v := byte(0, mload(add(offset, 64)))
            }

            signers[i] = ecrecover(digest, v, r, s); 
            offset += 65;
        }

        return signers;
    }

    function verify(address signer, bytes32 digest, Signature memory signature) internal pure returns (bool) {
        return recoverSigner(digest, signature) == signer;
    }

    function verify(address[] memory signers, bytes32 digest, bytes memory aggregateSignature)
        internal
        pure
        returns (bool)
    {
        address[] memory recoveredSigners = recoverSigners(digest, aggregateSignature);
        if (recoveredSigners.length != signers.length) {
            return false;
        }

        for (uint256 i = 0; i < signers.length; i++) {
            if (recoveredSigners[i] != signers[i]) {
                return false;
            }
        }

        return true;
    }

    
    // EIP-712 digest = keccak256("\x19\x01" || domainSeparator || structHash)
    function computeTxDigest(bytes32 txHash, uint64 committeeEpoch) public pure returns (bytes32 result) {
        bytes32 selector = keccak256("AttestedTx(bytes32 hash,uint64 committee_epoch)");

        assembly {
            let ptr := mload(0x40)

            // structHash = keccak256(abi.encode(selector, txHash, committeeEpoch))
            mstore(ptr, selector)
            mstore(add(ptr, 0x20), txHash)
            mstore(add(ptr, 0x40), committeeEpoch)
            let structHash := keccak256(ptr, 0x60)

            // result = keccak256("\x19\x01" || DOMAIN_SEPARATOR || structHash)
            mstore(ptr, "\x19\x01")
            mstore(add(ptr, 0x02), DOMAIN_SEPARATOR)
            mstore(add(ptr, 0x22), structHash)
            result := keccak256(ptr, 0x42)
        }
    }
}
