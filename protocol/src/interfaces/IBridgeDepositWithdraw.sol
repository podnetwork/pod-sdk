// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBridge} from "./IBridge.sol";
import {PodECDSA} from "pod-sdk/verifier/PodECDSA.sol";
import {MerkleTree} from "pod-sdk/verifier/MerkleTree.sol";
import {AttestedTx} from "pod-protocol/libraries/AttestedTx.sol";

/**
 * @title IBridgeDepositWithdraw
 * @notice Interface for deposit-withdraw bridge implementation.
 * @dev Extends IBridge to add token whitelisting and claiming through certified log verification.
 */
interface IBridgeDepositWithdraw is IBridge {
    /**
     * @notice Whitelist a token for bridging.
     * @param token Source chain token address.
     * @param mirrorToken Destination chain token address.
     * @param limits Daily limits for deposits and claims.
     */
    function whiteListToken(address token, address mirrorToken, TokenLimits calldata limits) external;

    /**
     * @notice Claim bridged tokens using a certified log proof.
     * @param certifiedLog The proof of the deposit represented as a pod certified log.
     */
    function claim(PodECDSA.CertifiedLog calldata certifiedLog) external;

    function claimNative(uint256 amount, AttestedTx.AttestedTx calldata attested, bytes calldata aggregated_signatures, MerkleTree.MultiProof calldata proof) external;

    /**
     * @dev Error thrown when the certificate verification fails.
     */
    error InvalidCertificate();
}
