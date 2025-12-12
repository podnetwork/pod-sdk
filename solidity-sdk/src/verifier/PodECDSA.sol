// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ECDSA} from "pod-sdk/verifier/ECDSA.sol";
import {MerkleTree} from "pod-sdk/verifier/MerkleTree.sol";
import {IPodRegistry} from "pod-protocol/interfaces/IPodRegistry.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

library PodECDSA {
    struct PodConfig {
        uint8 thresholdNumerator;
        uint8 thresholdDenominator;
        IPodRegistry registry;
    }

    struct Log {
        address addr;
        bytes32[] topics;
        bytes data;
    }

    struct CertifiedReceipt {
        bytes32 receiptRoot;
        bytes aggregateSignature;
        uint256[] sortedAttestationTimestamps;
    }

    struct Certificate {
        CertifiedReceipt certifiedReceipt;
        bytes32 leaf;
        MerkleTree.Proof proof;
    }

    struct CertifiedLog {
        Log log;
        uint256 logIndex;
        Certificate certificate;
    }

    struct MultiCertificate {
        CertifiedReceipt certifiedReceipt;
        bytes32[] leaves;
        MerkleTree.MultiProof proof;
    }

    error InvalidTimestamps();
    error InvalidCertificate();
    error InvalidThreshold();

    function hashLog(Log calldata log) public pure returns (bytes32) {
        return keccak256(abi.encode(log));
    }

    function _getMedianTimestamp(uint256[] memory sortedAttestationTimestamps) internal pure returns (uint256) {
        if (sortedAttestationTimestamps.length == 0) {
            revert InvalidTimestamps();
        }

        for (uint256 i = 0; i < sortedAttestationTimestamps.length - 1; i++) {
            if (sortedAttestationTimestamps[i] > sortedAttestationTimestamps[i + 1]) {
                revert InvalidTimestamps();
            }
        }

        if (sortedAttestationTimestamps.length % 2 == 1) {
            return sortedAttestationTimestamps[sortedAttestationTimestamps.length / 2];
        } else {
            return (sortedAttestationTimestamps[sortedAttestationTimestamps.length / 2]
                    + sortedAttestationTimestamps[sortedAttestationTimestamps.length / 2 - 1]) / 2;
        }
    }

    function verifyCertifiedReceipt(PodConfig calldata podConfig, CertifiedReceipt calldata certifiedReceipt)
        public
        view
        returns (bool)
    {
        uint256 medianTimestamp = _getMedianTimestamp(certifiedReceipt.sortedAttestationTimestamps);
        uint256 snapshotIndex = podConfig.registry.findSnapshotIndex(medianTimestamp);
        return verifyCertifiedReceipt(podConfig, certifiedReceipt, snapshotIndex);
    }

    function verifyCertifiedReceipt(
        PodConfig calldata podConfig,
        CertifiedReceipt calldata certifiedReceipt,
        uint256 snapshotIndex
    ) public view returns (bool) {
        if (
            podConfig.thresholdNumerator > podConfig.thresholdDenominator || podConfig.thresholdNumerator > 100
                || podConfig.thresholdDenominator > 100
        ) {
            revert InvalidThreshold();
        }

        address[] memory validators =
            ECDSA.recoverSigners(certifiedReceipt.receiptRoot, certifiedReceipt.aggregateSignature);

        uint256 medianTimestamp = _getMedianTimestamp(certifiedReceipt.sortedAttestationTimestamps);
        uint256 weight = podConfig.registry.computeWeight(validators, medianTimestamp, snapshotIndex);

        uint256 threshold = Math.mulDiv(
            podConfig.registry.getValidatorCountAtIndex(snapshotIndex),
            podConfig.thresholdNumerator,
            podConfig.thresholdDenominator,
            Math.Rounding.Ceil
        );

        return weight >= threshold;
    }

    function verifyCertificate(PodConfig calldata podConfig, Certificate calldata certificate)
        public
        view
        returns (bool)
    {
        uint256 medianTimestamp = _getMedianTimestamp(certificate.certifiedReceipt.sortedAttestationTimestamps);
        uint256 snapshotIndex = podConfig.registry.findSnapshotIndex(medianTimestamp);
        return verifyCertificate(podConfig, certificate, snapshotIndex);
    }

    function verifyCertificate(PodConfig calldata podConfig, Certificate calldata certificate, uint256 snapshotIndex)
        public
        view
        returns (bool)
    {
        return verifyCertifiedReceipt(podConfig, certificate.certifiedReceipt, snapshotIndex)
            && MerkleTree.verify(certificate.certifiedReceipt.receiptRoot, certificate.leaf, certificate.proof);
    }

    function verifyMultiCertificate(PodConfig calldata podConfig, MultiCertificate calldata certificate)
        public
        view
        returns (bool)
    {
        uint256 medianTimestamp = _getMedianTimestamp(certificate.certifiedReceipt.sortedAttestationTimestamps);
        uint256 snapshotIndex = podConfig.registry.findSnapshotIndex(medianTimestamp);
        return verifyMultiCertificate(podConfig, certificate, snapshotIndex);
    }

    function verifyMultiCertificate(
        PodConfig calldata podConfig,
        MultiCertificate calldata certificate,
        uint256 snapshotIndex
    ) public view returns (bool) {
        return verifyCertifiedReceipt(podConfig, certificate.certifiedReceipt, snapshotIndex)
            && MerkleTree.verifyMulti(certificate.certifiedReceipt.receiptRoot, certificate.leaves, certificate.proof);
    }

    function verifyCertifiedLog(PodConfig calldata podConfig, CertifiedLog calldata certifiedLog)
        public
        view
        returns (bool)
    {
        uint256 medianTimestamp =
            _getMedianTimestamp(certifiedLog.certificate.certifiedReceipt.sortedAttestationTimestamps);
        uint256 snapshotIndex = podConfig.registry.findSnapshotIndex(medianTimestamp);
        return verifyCertifiedLog(podConfig, certifiedLog, snapshotIndex);
    }

    function verifyCertifiedLog(PodConfig calldata podConfig, CertifiedLog calldata certifiedLog, uint256 snapshotIndex)
        public
        view
        returns (bool)
    {
        bytes32 logHash = hashLog(certifiedLog.log);

        bytes32 leaf = MerkleTree.hashLeaf(
            bytes(string.concat("log_hashes[", Strings.toString(certifiedLog.logIndex), "]")), logHash
        );

        if (leaf != certifiedLog.certificate.leaf) {
            revert InvalidCertificate();
        }

        return verifyCertificate(podConfig, certifiedLog.certificate, snapshotIndex);
    }
}
