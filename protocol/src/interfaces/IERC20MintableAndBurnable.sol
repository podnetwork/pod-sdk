// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IERC20MintableAndBurnable
 * @notice Interface for ERC20 tokens that can be minted and burned.
 * @dev This interface extends the IERC20 interface and adds mint and burn functionality.
 */
interface IERC20MintableAndBurnable is IERC20 {
    /**
     * @notice Mints tokens to an address.
     * @param to The address to mint tokens to.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) external;

    /**
     * @notice Burns tokens from an address.
     * @param account The address to burn tokens from.
     * @param amount The amount of tokens to burn.
     */
    function burnFrom(address account, uint256 amount) external;
}
