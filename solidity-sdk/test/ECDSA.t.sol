// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ECDSA} from "../src/libraries/ECDSA.sol";

contract ECDSATest is Test {
    function assertEq(ECDSA.Signature memory a, ECDSA.Signature memory b) internal pure {
        assertEq(a.v, b.v, "v mismatch");
        assertEq(a.r, b.r, "r mismatch");
        assertEq(a.s, b.s, "s mismatch");
    }

    function test_serialization(uint8 v, bytes32 r, bytes32 s) public pure {
        bytes memory serialized_signature = ECDSA._serialize_signature(v, r, s);
        (uint8 _v, bytes32 _r, bytes32 _s) = ECDSA._deserialize_signature(serialized_signature);
        assertEq(v, _v, "v mismatch");
        assertEq(r, _r, "r mismatch");
        assertEq(s, _s, "s mismatch");
    }

    function test_serialization(uint256 privateKey, bytes32 digest) public pure {
        vm.assume(privateKey != 0 && privateKey < SECP256K1_ORDER);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        test_serialization(v, r, s);
    }

    function test_aggregation(ECDSA.Signature[] memory signatures) public pure {
        vm.assume(signatures.length < 10);
        bytes[] memory serialized = ECDSA.serialize_signatures(signatures);
        bytes memory aggregate = ECDSA.aggregate_signatures(serialized);
        bytes[] memory _signatures = ECDSA.disaggregate_signatures(aggregate);
        assertEq(serialized.length, _signatures.length, "signature count mismatch");
        for (uint256 i = 0; i < signatures.length; i++) {
            assertEq(serialized[i], _signatures[i]);
        }
    }

    function test_verification(uint256[] memory privateKeys, bytes32 receiptRoot) public pure {
        vm.assume(privateKeys.length < 10);
        for (uint256 i = 0; i < privateKeys.length; i++) {
            vm.assume(privateKeys[i] != 0 && privateKeys[i] < SECP256K1_ORDER);
        }

        bytes[] memory signatures = new bytes[](privateKeys.length);
        address[] memory signers = new address[](privateKeys.length);
        for (uint256 i = 0; i < privateKeys.length; i++) {
            signers[i] = vm.addr(privateKeys[i]);
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKeys[i], receiptRoot);
            signatures[i] = ECDSA._serialize_signature(v, r, s);
            assertTrue(ECDSA.verify(signers[i], receiptRoot, ECDSA.Signature(v, r, s)));
        }

        bytes memory aggregateSignature = ECDSA.aggregate_signatures(signatures);
        assertTrue(ECDSA.verify(signers, receiptRoot, aggregateSignature));
    }
}
