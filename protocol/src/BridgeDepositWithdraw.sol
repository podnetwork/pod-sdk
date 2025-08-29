// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBridgeDepositWithdraw} from "./interfaces/IBridgeDepositWithdraw.sol";
import {Bridge} from "./abstract/Bridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract BridgeDepositWithdraw is Bridge, IBridgeDepositWithdraw {
    using SafeERC20 for IERC20;

    constructor() Bridge() {}

    function handleDeposit(address token, uint256 amount) internal override {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }

    function handleMigrate(address _newContract) internal override {
        for (uint256 i = 0; i < whitelistedTokens.length; i++) {
            address token = whitelistedTokens[i];
            uint256 tokenBalance = IERC20(token).balanceOf(address(this));
            if (tokenBalance > 0) {
                IERC20(token).safeTransfer(_newContract, tokenBalance);
            }
        }
    }

    function whiteListToken(address token, address mirrorToken, TokenLimits calldata limits)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _whitelistToken(token, mirrorToken, limits);
    }
}
