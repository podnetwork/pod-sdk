// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title WrappedToken
 * @notice A contract for wrapping and unwrapping tokens.
 * @dev This contract is used to wrap and unwrap tokens between chains.
 */
contract WrappedToken is ERC20Burnable, ERC20Pausable, AccessControl {
    /**
     * @dev The role for the minter.
     */
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /**
     * @dev The role for the pauser.
     */
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /**
     * @dev The number of decimals of the token.
     */
    uint8 private immutable DECIMALS;

    /**
     * @dev Constructor.
     * @param name_ The name of the token.
     * @param symbol_ The symbol of the token.
     * @param decimals_ The number of decimals of the token.
     */
    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        DECIMALS = decimals_;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @inheritdoc ERC20
     */
    function decimals() public view override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @dev Mints tokens to an address.
     * @notice Access is restricted to the minter role.
     * @param to The address to mint tokens to.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount); // will revert when paused because ERC20Pausable guards _update
    }

    /**
     * @inheritdoc ERC20Pausable
     * @notice Access is restricted to the pauser role.
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @inheritdoc ERC20Pausable
     * @notice Access is restricted to the admin role.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @inheritdoc ERC20Pausable
     */
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) whenNotPaused {
        super._update(from, to, value);
    }
}
