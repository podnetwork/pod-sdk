// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ECDSA} from "./ECDSA.sol";
import {MerkleTree} from "./MerkleTree.sol";
import {IPodRegistry} from "./PodRegistry.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

library PodECDSA {
    struct PodConfig {
        uint256 quorum;
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

    function hashLog(Log calldata log) public pure returns (bytes32) {
        return keccak256(abi.encode(log));
    }

    function verifyCertifiedReceipt(PodConfig calldata podConfig, CertifiedReceipt calldata certifiedReceipt)
        public
        view
        returns (bool)
    {
        address[] memory validators =
            ECDSA.recoverSigners(certifiedReceipt.receiptRoot, certifiedReceipt.aggregateSignature);
        return podConfig.registry.computeWeight(validators) >= podConfig.quorum;
    }

    function verifyCertificate(PodConfig calldata podConfig, Certificate calldata certificate)
        public
        view
        returns (bool)
    {
        return verifyCertifiedReceipt(podConfig, certificate.certifiedReceipt)
            && MerkleTree.verify(certificate.certifiedReceipt.receiptRoot, certificate.leaf, certificate.proof);
    }

    function verifyMultiCertificate(PodConfig calldata podConfig, MultiCertificate calldata certificate)
        public
        view
        returns (bool)
    {
        return verifyCertifiedReceipt(podConfig, certificate.certifiedReceipt)
            && MerkleTree.verifyMulti(certificate.certifiedReceipt.receiptRoot, certificate.leaves, certificate.proof);
    }

    function verifyCertifiedLog(PodConfig calldata podConfig, CertifiedLog calldata certifiedLog)
        public
        view
        returns (bool)
    {
        bytes32 logHash = hashLog(certifiedLog.log);

        bytes32 leaf = MerkleTree.hashLeaf(
            bytes(string.concat("log_hashes[", Strings.toString(certifiedLog.logIndex), "]")), logHash
        );

        require(leaf == certifiedLog.certificate.leaf, "Invalid certificate");

        return verifyCertificate(podConfig, certifiedLog.certificate);
    }
}
