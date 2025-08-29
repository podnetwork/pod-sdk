// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBridgeMintBurn} from "./interfaces/IBridgeMintBurn.sol";
import {Bridge} from "./abstract/Bridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {IERC20MintableAndBurnable} from "./interfaces/IERC20MintableAndBurnable.sol";
import {WrappedToken} from "./WrappedToken.sol";

contract BridgeMintBurn is Bridge, IBridgeMintBurn {
    using SafeERC20 for IERC20;

    bytes32 constant TOKEN_PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 constant TOKEN_MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() Bridge() {}

    function handleDeposit(address token, uint256 amount) internal override {
        IERC20MintableAndBurnable(token).burnFrom(msg.sender, amount);
    }

    function handleBridging(address token, uint256 amount, address to, bytes calldata data) internal override {
        IERC20MintableAndBurnable(token).mint(to, amount);
    }

    function handleMigrate(address _newContract) internal override {
        // Transfer ownership of all the token contracts to the new address.
        for (uint256 i = 0; i < whitelistedTokens.length; i++) {
            address token = whitelistedTokens[i];
            // Grant the new contracts all the roles.
            IAccessControl(token).grantRole(DEFAULT_ADMIN_ROLE, _newContract);
            IAccessControl(token).grantRole(TOKEN_MINTER_ROLE, _newContract);
            IAccessControl(token).grantRole(TOKEN_PAUSER_ROLE, _newContract);

            // Renounce all roles from the existing contract.
            IAccessControl(token).renounceRole(DEFAULT_ADMIN_ROLE, address(this));
            IAccessControl(token).renounceRole(TOKEN_MINTER_ROLE, address(this));
            IAccessControl(token).renounceRole(TOKEN_PAUSER_ROLE, address(this));
        }
    }

    function whitelistToken(address token, address mirrorToken, TokenLimits calldata limits)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 a = 5;
    }

    function createAndWhitelistMirrorToken(
        string memory tokenName,
        string memory tokenSymbol,
        address existingToken,
        address mirrorToken,
        uint8 mirrorTokenDecimals,
        TokenLimits calldata limits
    ) external returns (address token) {
        token = existingToken == address(0)
            ? address(new WrappedToken(tokenName, tokenSymbol, mirrorTokenDecimals))
            : existingToken;
        _whitelistToken(token, mirrorToken, limits);
    }
}
