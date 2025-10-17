// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBridge} from "./IBridge.sol";

/**
 * @title IBridgeMintBurn
 * @notice Interface for mint-burn bridge implementation.
 * @dev Extends IBridge to add token creation and claiming through external precompile verification.
 */
interface IBridgeMintBurn is IBridge {
    /**
     * @notice Create and whitelist a mirror token for bridging.
     * @param tokenName Name of the token to create.
     * @param tokenSymbol Symbol of the token to create.
     * @param existingToken Address of existing token (0 to create new).
     * @param mirrorToken Source chain token address.
     * @param mirrorTokenDecimals Decimals of the mirror token.
     * @param limits Daily limits for deposits and claims.
     * @return Address of the created or existing token.
     */
    function createAndWhitelistMirrorToken(
        string memory tokenName,
        string memory tokenSymbol,
        address existingToken,
        address mirrorToken,
        uint8 mirrorTokenDecimals,
        TokenLimits calldata limits
    ) external returns (address);

    /**
     * @notice Claim bridged tokens using external precompile verification.
     * @param id Deposit ID to claim.
     * @param token Source chain token address.
     * @param blockNumber The block number that contains the log to of the deposit.
     */
    function claim(uint256 id, address token, uint256 blockNumber) external;

    /**
     * @notice Claim native tokens using external precompile verification.
     * @param id Deposit ID to claim.
     * @param blockNumber The block number that contains the log to of the native deposit.
     */
    function claimNative(uint256 id, uint256 blockNumber) external;

    /**
     * @dev Event emitted when native tokens are burned.
     * @param sender The address that burned the native tokens.
     * @param value The amount of native tokens burned.
     */
    event BurnNative(address sender, uint256 value);

    /**
     * @dev Error thrown when the external precompile call fails.
     */
    error PrecompileCallFailed();

    /**
     * @dev Error thrown when the block is not finalized.
     */
    error BlockNotFinalized();
}
