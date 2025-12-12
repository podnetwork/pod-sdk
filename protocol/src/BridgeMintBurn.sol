// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBridgeMintBurn} from "pod-protocol/interfaces/IBridgeMintBurn.sol";
import {Bridge} from "pod-protocol/abstract/Bridge.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {IERC20MintableAndBurnable} from "pod-protocol/interfaces/IERC20MintableAndBurnable.sol";
import {WrappedToken} from "pod-protocol/WrappedToken.sol";

/**
 * @title BridgeMintBurn
 * @notice Implementation of the mint-burn bridge.
 * @dev This contract implements the IBridgeMintBurn interface and provides the functionality for
 * minting and burning tokens between chains.
 */
abstract contract BridgeMintBurn is Bridge, IBridgeMintBurn {
    /**
     * @dev The role for the minter.
     */
    bytes32 constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /**
     * @dev The source chain id.
     */
    uint96 immutable SOURCE_CHAIN_ID;

    uint256 constant ANVIL_CHAIN_ID = 31337;

    /**
     * @dev "finalized" as bytes, or "latest" for anvil
     */
    bytes block_tag_bytes;

    /**
     * @dev Handles the deposit of tokens. The tokens are burned from the msg.sender.
     * @param token The token to deposit.
     * @param amount The amount of tokens to deposit.
     */
    function handleDeposit(address token, uint256 amount) internal override {
        // not implemented in solidity
    }

    /**
     * @inheritdoc Bridge
     */
    function handleDepositNative() internal override {
        // not implemented in solidity
    }

    /**
     * @inheritdoc IBridgeMintBurn
     */
    function claim(bytes32 id, address token, uint256 blockNumber) external override whenNotPaused {
        // not implemented in solidity
    }

    function _claim(bytes32 id, address token, uint256 blockNumber, bytes32[] memory topics)
        internal
        view
        returns (uint256 decodedAmount, address decodedTo, bytes32 requestId)
    {
        // not implemented in solidity
    }

    /**
     * @inheritdoc IBridgeMintBurn
     */
    function claimNative(bytes32 id, uint256 blockNumber) external override whenNotPaused {
        // not implemented in solidity
    }

    /**
     * @dev Handles the migration of tokens. The tokens and roles are transferred from the contract to the new contract.
     * @param _newContract The address of the new contract.
     */
    function handleMigrate(address _newContract) internal override {
        for (uint256 i = 0; i < whitelistedTokens.length; i++) {
            address token = whitelistedTokens[i];
            IAccessControl(token).grantRole(DEFAULT_ADMIN_ROLE, _newContract);
            IAccessControl(token).grantRole(MINTER_ROLE, _newContract);
            IAccessControl(token).grantRole(PAUSER_ROLE, _newContract);

            // TODO: uncomment this if we decide to allow for contracts larger than 24576 gas limit. This is required!
            // IAccessControl(token).renounceRole(DEFAULT_ADMIN_ROLE, address(this));
            // IAccessControl(token).renounceRole(MINTER_ROLE, address(this));
            // IAccessControl(token).renounceRole(PAUSER_ROLE, address(this));
        }
    }

    /**
     * @inheritdoc IBridgeMintBurn
     */
    function createAndWhitelistMirrorToken(
        string memory tokenName,
        string memory tokenSymbol,
        address existingToken,
        address mirrorToken,
        uint8 mirrorTokenDecimals,
        TokenLimits calldata limits
    ) external override onlyRole(DEFAULT_ADMIN_ROLE) returns (address token) {
        token = existingToken == address(0)
            ? address(new WrappedToken(tokenName, tokenSymbol, mirrorTokenDecimals))
            : existingToken;
        _whitelistToken(token, mirrorToken, limits);
    }
}
