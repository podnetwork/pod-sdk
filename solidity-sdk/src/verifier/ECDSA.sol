// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library ECDSA {
    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    function _serialize_signature(uint8 v, bytes32 r, bytes32 s) internal pure returns (bytes memory signature) {
        signature = new bytes(65);
        assembly {
            mstore(add(signature, 32), r)
            mstore(add(signature, 64), s)
            mstore8(add(signature, 96), v)
        }
    }

    function serialize_signature(Signature memory signature) internal pure returns (bytes memory) {
        return _serialize_signature(signature.v, signature.r, signature.s);
    }

    function serialize_signatures(Signature[] memory signatures) internal pure returns (bytes[] memory serialized) {
        serialized = new bytes[](signatures.length);
        for (uint256 i = 0; i < signatures.length; i++) {
            serialized[i] = _serialize_signature(signatures[i].v, signatures[i].r, signatures[i].s);
        }
    }

    function _deserialize_signature(bytes memory signature) internal pure returns (uint8 v, bytes32 r, bytes32 s) {
        require(signature.length == 65, "invalid signature length");
        assembly {
            let ptr := add(signature, 32)
            r := mload(ptr)
            s := mload(add(ptr, 32))
            v := byte(0, mload(add(ptr, 64)))
        }
    }

    function deserialize_signature(bytes memory signature) internal pure returns (Signature memory) {
        (uint8 v, bytes32 r, bytes32 s) = _deserialize_signature(signature);
        return Signature(v, r, s);
    }

    // Takes encoded ECDSA signatures and returns them concatenated.
    // Each signature should be 65 bytes long.
    function aggregate_signatures(bytes[] memory signatures) internal pure returns (bytes memory aggregate) {
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

    // Takes an aggregate signature and returns the decoded ECDSA signatures.
    function disaggregate_signatures(bytes memory aggregate) internal pure returns (bytes[] memory signatures) {
        require(aggregate.length % 65 == 0, "invalid aggregate length");

        uint256 signatureCount = aggregate.length / 65;
        signatures = new bytes[](signatureCount);

        assembly {
            let aggregatePtr := add(aggregate, 32)

            for { let i := 0 } lt(i, signatureCount) { i := add(i, 1) } {
                let signature := mload(64)
                mstore(signature, 65)

                mstore(add(signature, 32), mload(aggregatePtr))
                mstore(add(signature, 64), mload(add(aggregatePtr, 32)))
                mstore8(add(signature, 96), byte(0, mload(add(aggregatePtr, 64))))

                mstore(add(signatures, mul(32, add(i, 1))), signature)
                aggregatePtr := add(aggregatePtr, 65)
                mstore(64, add(signature, 97))
            }
        }
    }

    function recoverSigner(bytes32 digest, Signature memory signature) internal pure returns (address) {
        return ecrecover(digest, signature.v, signature.r, signature.s);
    }

    function recoverSigners(bytes32 digest, bytes memory aggregateSignature) internal pure returns (address[] memory) {
        bytes[] memory signatures = disaggregate_signatures(aggregateSignature);
        address[] memory signers = new address[](signatures.length);
        for (uint256 i = 0; i < signatures.length; i++) {
            signers[i] = recoverSigner(digest, deserialize_signature(signatures[i]));
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
}
