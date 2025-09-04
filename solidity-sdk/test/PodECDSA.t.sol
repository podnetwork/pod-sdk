// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {PodECDSA} from "../src/verifier/PodECDSA.sol";
import {ECDSA} from "../src/verifier/ECDSA.sol";
import {MerkleTree} from "../src/verifier/MerkleTree.sol";
import {PodRegistry} from "../src/verifier/PodRegistry.sol";
import {console} from "forge-std/console.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

contract PodECDSATest is Test {
    PodRegistry public podRegistry;
    address OWNER = address(0x123abc);

    uint256[] public validatorPrivateKeys = new uint256[](128);

    function setUp() public {
        address[] memory initialValidators = new address[](validatorPrivateKeys.length);

        for (uint256 i = 0; i < validatorPrivateKeys.length; i++) {
            validatorPrivateKeys[i] = uint256(i + 1);
            initialValidators[i] = vm.addr(validatorPrivateKeys[i]);
        }

        vm.prank(OWNER);
        podRegistry = new PodRegistry(initialValidators);
    }

    function test_verify() public view {
        bytes32 receiptRoot = 0x5511dff743741cf4814cb39fa20ec04f304218d45c8c2bd6639a9437af3bf12a;
        bytes[] memory signatures = new bytes[](validatorPrivateKeys.length);
        uint256[] memory attestationTimestamps = new uint256[](validatorPrivateKeys.length);
        for (uint256 i = 0; i < validatorPrivateKeys.length; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(validatorPrivateKeys[i], receiptRoot);
            signatures[i] = ECDSA._serialize_signature(v, r, s);
            attestationTimestamps[i] = i + 1;
        }

        bytes memory aggregateSignature = ECDSA.aggregate_signatures(signatures);

        bytes32[] memory path = new bytes32[](4);
        path[0] = 0xee3969409fd1dfd738d58c00e3661c39744fa85849319eb8683e8452f8d45818;
        path[1] = 0x5a820d75a7f9254ee0d1db8fddc479e5a4d2f0e2b7888f84d6f86bc6a5996480;
        path[2] = 0x0548f7b572c844d2a714bf152d5af2edaee83ca9386bc8c1d22b8e4e0ef07234;
        path[3] = 0x8bae1d5c44209274bc7cacebf0cef93dac1d82d9f46c8ce3b6432607eb7682e7;

        bytes32 leaf =
            MerkleTree.hashLeaf("logs[0].address", 0xe4774a087b3f35fd4dc3e664aeebe3e28f7b45b805ff2d3c6867951001cc6b74);
        assertEq(leaf, 0xd9c74aa19994428cc9b9f72b363dfd58a156391e783e8cb1eebc64ff6387eb15);

        PodECDSA.Certificate memory certificate = PodECDSA.Certificate({
            leaf: leaf,
            certifiedReceipt: PodECDSA.CertifiedReceipt({
                receiptRoot: receiptRoot,
                aggregateSignature: aggregateSignature,
                sortedAttestationTimestamps: attestationTimestamps
            }),
            proof: MerkleTree.Proof({path: path})
        });

        PodECDSA.PodConfig memory podConfig =
            PodECDSA.PodConfig({thresholdNumerator: 2, thresholdDenominator: 3, registry: podRegistry});
        assertTrue(PodECDSA.verifyCertificate(podConfig, certificate));
    }

    function test_verifyMulti() public view {
        bytes32 receiptRoot = 0xa3a78fbdee5849d00cf13b73978d417d1832737562353e7d7448d149c563d411;
        bytes[] memory signatures = new bytes[](validatorPrivateKeys.length);
        uint256[] memory attestationTimestamps = new uint256[](validatorPrivateKeys.length);
        for (uint256 i = 0; i < validatorPrivateKeys.length; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(validatorPrivateKeys[i], receiptRoot);
            signatures[i] = ECDSA._serialize_signature(v, r, s);
            attestationTimestamps[i] = i + 1;
        }

        bytes memory aggregateSignature = ECDSA.aggregate_signatures(signatures);

        bytes32[] memory path = new bytes32[](5);
        path[0] = 0x771a5d864efdb63278bc79d2131e2275c79e3ee18318dd2bdd418b3f5d1ee7eb;
        path[1] = 0xee3969409fd1dfd738d58c00e3661c39744fa85849319eb8683e8452f8d45818;
        path[2] = 0xefe389dc0a6c8730fed25045d140abbc612dfd1734239997105ba5efe1ed6859;
        path[3] = 0xb313387946819d0658059010e8386d8379d606960e4d787dd04b4ebdf6eea0c9;
        path[4] = 0x6aeb610015fba6726f0812ee6cde07150a1d60f8667f80666888d4a5ed3cac0a;

        bool[] memory flags = new bool[](6);
        flags[0] = false;
        flags[1] = false;
        flags[2] = false;
        flags[3] = false;
        flags[4] = true;
        flags[5] = false;

        bytes32 logAddressLeaf =
            MerkleTree.hashLeaf("logs[0].address", 0xe4774a087b3f35fd4dc3e664aeebe3e28f7b45b805ff2d3c6867951001cc6b74);
        assertEq(logAddressLeaf, 0xd9c74aa19994428cc9b9f72b363dfd58a156391e783e8cb1eebc64ff6387eb15);
        bytes32 logDataLeaf =
            MerkleTree.hashLeaf("logs[0].data.data", 0x5fe7f977e71dba2ea1a68e21057beebb9be2ac30c6410aa38d4f3fbe41dcffd2);
        assertEq(logDataLeaf, 0x98aac89fa67dcf1589d1adddba4ac3d86bb03a9b800c5b676a590905e1c71fd2);

        bytes32[] memory leaves = new bytes32[](2);
        if (logAddressLeaf < logDataLeaf) {
            leaves[0] = logAddressLeaf;
            leaves[1] = logDataLeaf;
        } else {
            leaves[0] = logDataLeaf;
            leaves[1] = logAddressLeaf;
        }

        PodECDSA.MultiCertificate memory certificate = PodECDSA.MultiCertificate({
            leaves: leaves,
            certifiedReceipt: PodECDSA.CertifiedReceipt({
                receiptRoot: receiptRoot,
                aggregateSignature: aggregateSignature,
                sortedAttestationTimestamps: attestationTimestamps
            }),
            proof: MerkleTree.MultiProof({path: path, flags: flags})
        });

        PodECDSA.PodConfig memory podConfig =
            PodECDSA.PodConfig({thresholdNumerator: 2, thresholdDenominator: 3, registry: podRegistry});
        assertTrue(PodECDSA.verifyMultiCertificate(podConfig, certificate));
    }

    function test_verifyLog() public view {
        bytes32 receiptRoot = 0x32bf7ef0c0291bc3b73afd18a62cca74ff8ee51c801b8b619c360e1c1dac9c84;
        bytes[] memory signatures = new bytes[](validatorPrivateKeys.length);
        uint256[] memory attestationTimestamps = new uint256[](validatorPrivateKeys.length);
        for (uint256 i = 0; i < validatorPrivateKeys.length; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(validatorPrivateKeys[i], receiptRoot);
            signatures[i] = ECDSA._serialize_signature(v, r, s);
            attestationTimestamps[i] = i + 1;
        }

        bytes memory aggregateSignature = ECDSA.aggregate_signatures(signatures);

        PodECDSA.CertifiedReceipt memory receipt = PodECDSA.CertifiedReceipt({
            receiptRoot: receiptRoot,
            aggregateSignature: aggregateSignature,
            sortedAttestationTimestamps: attestationTimestamps
        });

        bytes32[] memory topics = new bytes32[](4);
        topics[0] = 0x71a5674c44b823bc0df08201dfeb2e8bdf698cd684fd2bbaa79adcf2c99fc186;
        topics[1] = 0x0000000000000000000000000000000000000000000000000000000067dc55a9;
        topics[2] = 0x00000000000000000000000013791790bef192d14712d627f13a55c4abee52a4;
        topics[3] = 0x00000000000000000000000000000000000000000000000000000000cfb8ab4d;

        bytes memory data = hex"0000000000000000000000000000000000000000000000000de0b6b3a7640000";

        PodECDSA.Log memory log =
            PodECDSA.Log({addr: 0x217F5658c6ecC27D439922263AD9Bb8e992e0373, topics: topics, data: data});

        bytes32[] memory path = new bytes32[](5);
        path[0] = 0x0177fef4eb615dc3b054c47369eb6c0c0a3e63740da7cf01a1533b59fa7df56a;
        path[1] = 0xfa1311bca6b8f6ad7a93e452b060ad385381418b41ff3bfd0dd59a867bcc6454;
        path[2] = 0xc07741a890a492237a58e2d945522d31e0f605ad0a6b4aa384a8fa03ee2ab025;
        path[3] = 0x696b407b636d040080fee2626d8c11c31057df67335272fa156aec00d5f52964;
        path[4] = 0x5172a2f7de51c9895f36d79528d12c2b3524d374d345c7a77e8ceac31c7928f8;

        MerkleTree.Proof memory proof = MerkleTree.Proof({path: path});

        bytes32 logHash = PodECDSA.hashLog(log);
        bytes32 leaf = MerkleTree.hashLeaf(bytes("log_hashes[0]"), logHash);

        PodECDSA.CertifiedLog memory certifiedLog = PodECDSA.CertifiedLog({
            log: log,
            logIndex: 0,
            certificate: PodECDSA.Certificate({leaf: leaf, certifiedReceipt: receipt, proof: proof})
        });

        PodECDSA.PodConfig memory podConfig =
            PodECDSA.PodConfig({thresholdNumerator: 2, thresholdDenominator: 3, registry: podRegistry});

        assertTrue(PodECDSA.verifyCertifiedLog(podConfig, certifiedLog));
    }

    function test_hashLog() public pure {
        bytes32[] memory topics = new bytes32[](2);
        topics[0] = 0x84bee513033536a8de8a8260e2674a4a3eebd61ddce74615fdeca8a1499f5efe;
        topics[1] = 0x18ed9725cd4e356a6aa0f7b9cc48d76f8c2219bacfccdb781df3fb3e71699a50;
        PodECDSA.Log memory log =
            PodECDSA.Log({addr: 0x217F5658c6ecC27D439922263AD9Bb8e992e0373, topics: topics, data: hex"01"});

        assertEq(PodECDSA.hashLog(log), 0x01863af86eec26cec7e83925382f100ecf80cda979aed17146631c6fba129816);
    }

    function test_verifyRecentWithSnapshotIndex() public {
        bytes32 receiptRoot = 0x32bf7ef0c0291bc3b73afd18a62cca74ff8ee51c801b8b619c360e1c1dac9c84;
        bytes[] memory signatures = new bytes[](validatorPrivateKeys.length);
        uint256[] memory attestationTimestamps = new uint256[](validatorPrivateKeys.length);
        for (uint256 i = 0; i < validatorPrivateKeys.length; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(validatorPrivateKeys[i], receiptRoot);
            signatures[i] = ECDSA._serialize_signature(v, r, s);
            attestationTimestamps[i] = i + 1;
        }

        uint256 medianTimestamp = attestationTimestamps[attestationTimestamps.length / 2];

        vm.warp(medianTimestamp - 1);

        vm.prank(OWNER);
        podRegistry.addValidator(vm.addr(0x123abc));

        bytes memory aggregateSignature = ECDSA.aggregate_signatures(signatures);

        PodECDSA.CertifiedReceipt memory receipt = PodECDSA.CertifiedReceipt({
            receiptRoot: receiptRoot,
            aggregateSignature: aggregateSignature,
            sortedAttestationTimestamps: attestationTimestamps
        });

        PodECDSA.PodConfig memory podConfig =
            PodECDSA.PodConfig({thresholdNumerator: 2, thresholdDenominator: 3, registry: podRegistry});
        assertTrue(PodECDSA.verifyCertifiedReceipt(podConfig, receipt, 1));
        assertTrue(podRegistry.getHistoryLength() == 2);
    }

    function test_verifyWithOldSnapshot() public {
        bytes32 receiptRoot = 0x32bf7ef0c0291bc3b73afd18a62cca74ff8ee51c801b8b619c360e1c1dac9c84;
        bytes[] memory signatures = new bytes[](validatorPrivateKeys.length);
        uint256[] memory attestationTimestamps = new uint256[](validatorPrivateKeys.length);
        for (uint256 i = 0; i < validatorPrivateKeys.length; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(validatorPrivateKeys[i], receiptRoot);
            signatures[i] = ECDSA._serialize_signature(v, r, s);
            attestationTimestamps[i] = i + 1;
        }

        bytes memory aggregateSignature = ECDSA.aggregate_signatures(signatures);

        uint256 medianTimestamp = attestationTimestamps[attestationTimestamps.length / 2];

        PodECDSA.CertifiedReceipt memory receipt = PodECDSA.CertifiedReceipt({
            receiptRoot: receiptRoot,
            aggregateSignature: aggregateSignature,
            sortedAttestationTimestamps: attestationTimestamps
        });

        uint256 snapshotIndex = podRegistry.findSnapshotIndex(medianTimestamp);

        vm.warp(medianTimestamp + 2);
        vm.startPrank(OWNER);
        podRegistry.addValidator(vm.addr(0x123abcd));
        vm.warp(block.timestamp + medianTimestamp);
        podRegistry.addValidator(vm.addr(0x456defa));
        vm.warp(block.timestamp + medianTimestamp);
        podRegistry.addValidator(vm.addr(0x789abcd));
        vm.warp(block.timestamp + medianTimestamp);
        vm.stopPrank();

        PodECDSA.PodConfig memory podConfig =
            PodECDSA.PodConfig({thresholdNumerator: 2, thresholdDenominator: 3, registry: podRegistry});
        assertTrue(PodECDSA.verifyCertifiedReceipt(podConfig, receipt, snapshotIndex));
        assertTrue(PodECDSA.verifyCertifiedReceipt(podConfig, receipt));
        assertTrue(podRegistry.getHistoryLength() == 4);
    }

    function test_verify_RevertIfNoTresholdSignatures() public view {
        bytes32 receiptRoot = 0x32bf7ef0c0291bc3b73afd18a62cca74ff8ee51c801b8b619c360e1c1dac9c84;
        uint256 threshold = Math.mulDiv(validatorPrivateKeys.length, 2, 3, Math.Rounding.Ceil);
        bytes[] memory signatures = new bytes[](threshold - 1);
        uint256[] memory attestationTimestamps = new uint256[](threshold - 1);
        for (uint256 i = 0; i < threshold - 1; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(validatorPrivateKeys[i], receiptRoot);
            signatures[i] = ECDSA._serialize_signature(v, r, s);
            attestationTimestamps[i] = i + 1;
        }

        bytes memory aggregateSignature = ECDSA.aggregate_signatures(signatures);

        PodECDSA.CertifiedReceipt memory receipt = PodECDSA.CertifiedReceipt({
            receiptRoot: receiptRoot,
            aggregateSignature: aggregateSignature,
            sortedAttestationTimestamps: attestationTimestamps
        });

        PodECDSA.PodConfig memory podConfig =
            PodECDSA.PodConfig({thresholdNumerator: 2, thresholdDenominator: 3, registry: podRegistry});
        assertFalse(PodECDSA.verifyCertifiedReceipt(podConfig, receipt));
    }

    function test_verifyExactThresholdSignatures() public view {
        bytes32 receiptRoot = 0x32bf7ef0c0291bc3b73afd18a62cca74ff8ee51c801b8b619c360e1c1dac9c84;
        uint256 threshold = Math.mulDiv(validatorPrivateKeys.length, 4, 5, Math.Rounding.Ceil);
        bytes[] memory signatures = new bytes[](threshold);
        uint256[] memory attestationTimestamps = new uint256[](threshold);
        for (uint256 i = 0; i < threshold; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(validatorPrivateKeys[i], receiptRoot);
            signatures[i] = ECDSA._serialize_signature(v, r, s);
            attestationTimestamps[i] = i + 1;
        }

        bytes memory aggregateSignature = ECDSA.aggregate_signatures(signatures);

        PodECDSA.CertifiedReceipt memory receipt = PodECDSA.CertifiedReceipt({
            receiptRoot: receiptRoot,
            aggregateSignature: aggregateSignature,
            sortedAttestationTimestamps: attestationTimestamps
        });

        PodECDSA.PodConfig memory podConfig =
            PodECDSA.PodConfig({thresholdNumerator: 4, thresholdDenominator: 5, registry: podRegistry});
        assertTrue(PodECDSA.verifyCertifiedReceipt(podConfig, receipt));
    }

    function test_verify_RevertIfUnsortedMedianTimestamp() public {
        bytes32 receiptRoot = 0x32bf7ef0c0291bc3b73afd18a62cca74ff8ee51c801b8b619c360e1c1dac9c84;
        bytes[] memory signatures = new bytes[](validatorPrivateKeys.length);
        uint256[] memory attestationTimestamps = new uint256[](validatorPrivateKeys.length);
        for (uint256 i = 0; i < validatorPrivateKeys.length; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(validatorPrivateKeys[i], receiptRoot);
            signatures[i] = ECDSA._serialize_signature(v, r, s);
            attestationTimestamps[i] = i + 1;
        }

        attestationTimestamps[0] = 2;
        attestationTimestamps[1] = 1;

        bytes memory aggregateSignature = ECDSA.aggregate_signatures(signatures);

        PodECDSA.CertifiedReceipt memory receipt = PodECDSA.CertifiedReceipt({
            receiptRoot: receiptRoot,
            aggregateSignature: aggregateSignature,
            sortedAttestationTimestamps: attestationTimestamps
        });

        PodECDSA.PodConfig memory podConfig =
            PodECDSA.PodConfig({thresholdNumerator: 2, thresholdDenominator: 3, registry: podRegistry});

        vm.expectRevert(abi.encodeWithSignature("InvalidTimestamps()"));
        PodECDSA.verifyCertifiedReceipt(podConfig, receipt);
    }

    function _getReceipt() internal view returns (PodECDSA.CertifiedReceipt memory) {
        bytes32 receiptRoot = 0x32bf7ef0c0291bc3b73afd18a62cca74ff8ee51c801b8b619c360e1c1dac9c84;
        bytes[] memory signatures = new bytes[](validatorPrivateKeys.length);
        uint256[] memory attestationTimestamps = new uint256[](validatorPrivateKeys.length);
        for (uint256 i = 0; i < validatorPrivateKeys.length; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(validatorPrivateKeys[i], receiptRoot);
            signatures[i] = ECDSA._serialize_signature(v, r, s);
            attestationTimestamps[i] = i + 1;
        }

        bytes memory aggregateSignature = ECDSA.aggregate_signatures(signatures);

        PodECDSA.CertifiedReceipt memory receipt = PodECDSA.CertifiedReceipt({
            receiptRoot: receiptRoot,
            aggregateSignature: aggregateSignature,
            sortedAttestationTimestamps: attestationTimestamps
        });

        return receipt;
    }

    function test_verify_RevertIfInvalidThreshold() public {
        PodECDSA.CertifiedReceipt memory receipt = _getReceipt();
        PodECDSA.PodConfig memory podConfig =
            PodECDSA.PodConfig({thresholdNumerator: 101, thresholdDenominator: 100, registry: podRegistry});
        vm.expectRevert(abi.encodeWithSignature("InvalidThreshold()"));
        PodECDSA.verifyCertifiedReceipt(podConfig, receipt);

        podConfig = PodECDSA.PodConfig({thresholdNumerator: 100, thresholdDenominator: 101, registry: podRegistry});
        vm.expectRevert(abi.encodeWithSignature("InvalidThreshold()"));
        PodECDSA.verifyCertifiedReceipt(podConfig, receipt);

        podConfig = PodECDSA.PodConfig({thresholdNumerator: 0, thresholdDenominator: 0, registry: podRegistry});
        vm.expectRevert();
        PodECDSA.verifyCertifiedReceipt(podConfig, receipt);

        podConfig = PodECDSA.PodConfig({thresholdNumerator: 87, thresholdDenominator: 55, registry: podRegistry});
        vm.expectRevert(abi.encodeWithSignature("InvalidThreshold()"));
        PodECDSA.verifyCertifiedReceipt(podConfig, receipt);
    }
}
