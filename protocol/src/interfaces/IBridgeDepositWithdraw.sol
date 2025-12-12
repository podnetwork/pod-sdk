// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBridge} from "./IBridge.sol";
import {MerkleTree} from "pod-sdk/verifier/MerkleTree.sol";
import {AttestedTx} from "pod-protocol/libraries/AttestedTx.sol";

/**
 * @title IBridgeDepositWithdraw
 * @notice Interface for deposit-withdraw bridge implementation.
 * @dev Extends IBridge to add token whitelisting and claiming through attested transaction verification.
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
     * @notice Claim bridged ERC20 tokens using an attested transaction proof from Pod.
     * @dev Verifies the deposit transaction via merkle proof and aggregated validator signatures.
     *      The caller must be the original depositor (msg.sender must match the 'from' in the merkle proof).
     *      Tokens are transferred to the specified recipient upon successful verification.
     * @param token The token address on Pod that was deposited.
     * @param amount The amount of tokens to claim.
     * @param to The address to receive the tokens (must match the 'to' specified in the deposit).
     * @param attested The attested transaction containing the transaction hash and committee epoch.
     * @param aggregated_signatures Concatenated 65-byte ECDSA signatures (r,s,v) from validators.
     * @param proof The Merkle multi-proof for verifying transaction fields (from, to, value, input).
     */
    function claim(
        address token,
        uint256 amount,
        address to,
        AttestedTx.AttestedTx calldata attested,
        bytes calldata aggregated_signatures,
        MerkleTree.MultiProof calldata proof
    ) external;

    /**
     * @notice Claim bridged native tokens using an attested transaction proof from Pod.
     * @dev Verifies the deposit transaction via merkle proof and aggregated validator signatures.
     *      The caller must be the original depositor (msg.sender must match the 'from' in the merkle proof).
     *      Native tokens are transferred to the specified recipient upon successful verification.
     * @param amount The amount of native tokens to claim.
     * @param to The address to receive the tokens (must match the 'to' specified in the deposit).
     * @param attested The attested transaction containing the transaction hash and committee epoch.
     * @param aggregated_signatures Concatenated 65-byte ECDSA signatures (r,s,v) from validators.
     * @param proof The Merkle multi-proof for verifying transaction fields (from, to, value, input).
     */
    function claimNative(
        uint256 amount,
        address to,
        AttestedTx.AttestedTx calldata attested,
        bytes calldata aggregated_signatures,
        MerkleTree.MultiProof calldata proof
    ) external;

    /**
     * @dev Error thrown when the certificate verification fails.
     */
    error InvalidCertificate();
}
