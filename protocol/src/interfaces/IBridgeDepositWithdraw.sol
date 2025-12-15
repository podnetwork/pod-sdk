// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBridge} from "./IBridge.sol";
import {MerkleTree} from "pod-sdk/verifier/MerkleTree.sol";

/**
 * @title IBridgeDepositWithdraw
 * @notice Interface for deposit-withdraw bridge implementation.
 * @dev Extends IBridge to add token whitelisting and claiming through attested transaction verification.
 *      Supports token-to-token, token-to-native, and native-to-token bridging.
 *      Use MOCK_ADDRESS_FOR_NATIVE_DEPOSIT for token or mirrorToken to indicate native currency.
 */
interface IBridgeDepositWithdraw is IBridge {
    /**
     * @notice Whitelist a token for bridging.
     * @dev Use MOCK_ADDRESS_FOR_NATIVE_DEPOSIT for token to indicate native currency.
     *      - token=MOCK_ADDRESS_FOR_NATIVE_DEPOSIT: source mirrorToken maps to local native currency.
     * @param token Token that will be deposited in the contract (local/destination token).
     * @param mirrorToken Token that will be deposited in the mirror contract (source token).
     * @param limits Daily limits for deposits and claims.
     */
    function whiteListToken(address token, address mirrorToken, TokenLimits calldata limits) external;

    /**
     * @notice Claim bridged tokens using an attested transaction proof from Pod.
     * @dev Verifies the deposit transaction via merkle proof and aggregated validator signatures.
     *      The transaction hash (AttestedTx.hash) is computed from the merkle proof.
     *      Anyone can call this function to claim on behalf of the original depositor.
     *      If mirrorToken is address(0), native tokens are transferred; otherwise ERC20 tokens.
     * @param token The token address on Pod that was deposited.
     * @param amount The amount of tokens that were deposited on Pod (and to claim).
     * @param to The address to receive the tokens (must match the 'to' specified in the deposit).
     * @param committeeEpoch The committee epoch for validator signature verification.
     * @param aggregatedSignatures Concatenated 65-byte ECDSA signatures (r,s,v) from validators.
     * @param proof The Merkle multi-proof for verifying transaction fields (to, input).
     */
    function claim(
        address token,
        uint256 amount,
        address to,
        uint64 committeeEpoch,
        bytes calldata aggregatedSignatures,
        MerkleTree.MultiProof calldata proof
    ) external;

    /**
     * @notice Claim for a native deposit on the source chain.
     * @dev Verifies the depositNative transaction via merkle proof and aggregated validator signatures.
     *      The transaction hash (AttestedTx.hash) is computed from the merkle proof.
     *      Anyone can call this function to claim on behalf of the original depositor.
     *      If mirrorTokens[MOCK_ADDRESS_FOR_NATIVE_DEPOSIT] is set, ERC20 tokens are transferred; otherwise native tokens.
     *      To configure native-to-token bridging, call whiteListToken(MOCK_ADDRESS_FOR_NATIVE_DEPOSIT, tokenAddress, limits).
     * @param amount The deposited amount to claim.
     * @param to The address to receive the tokens (must match the 'to' specified in the deposit).
     * @param committeeEpoch The committee epoch for validator signature verification.
     * @param aggregatedSignatures Concatenated 65-byte ECDSA signatures (r,s,v) from validators.
     * @param proof The Merkle multi-proof for verifying transaction fields (to, value, input).
     */
    function claimNative(
        uint256 amount,
        address to,
        uint64 committeeEpoch,
        bytes calldata aggregatedSignatures,
        MerkleTree.MultiProof calldata proof
    ) external;

    /**
     * @dev Error thrown when the certificate verification fails.
     */
    error InvalidCertificate();
}
