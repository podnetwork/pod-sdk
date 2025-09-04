// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBridge} from "../interfaces/IBridge.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {console} from "forge-std/console.sol";

abstract contract Bridge is IBridge, AccessControl, Pausable {
    using SafeERC20 for IERC20;

    /// @dev The role ID for addresses that can pause the contract.
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    /// @dev The topic 0 (event signature) of the deposit event.
    bytes32 constant DEPOSIT_TOPIC_0 = keccak256("Deposit(uint256,address,uint256,address)");

    /// @dev Map token address to token info.
    mapping(address => TokenData) public tokenData;

    /// @dev Map mirror token address to token address.
    mapping(address => address) public mirrorTokens;

    /// @dev Map request hash to processed requests.
    mapping(bytes32 => bool) public processedRequests;

    /// @dev Array of all the whitelisted tokens.
    /// @notice A token in the list might not be active.
    address[] public whitelistedTokens;

    /// @dev The number of deposits.
    uint256 public depositIndex;

    /// @dev Address of the migrated contract.
    address public migratedContract;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    function handleDeposit(address token, uint256 amount) internal virtual;
    function handleMigrate(address _newContract) internal virtual;

    /// @dev Modifier to check that contract is not already migrated.
    modifier notMigrated() {
        if (migratedContract != address(0)) {
            revert ContractMigrated();
        }
        _;
    }

    function _isValidTokenAmount(address token, uint256 amount, bool isDeposit) internal returns (bool) {
        TokenData storage t = tokenData[token];

        if (t.limits.minAmount == 0 || amount < t.limits.minAmount) {
            return false;
        }

        if (isDeposit) {
            if (block.timestamp >= t.deposit.lastUpdated + 1 days) {
                t.deposit.lastUpdated = block.timestamp;
                t.deposit.consumed = 0;
            }

            if (t.deposit.consumed + amount > t.limits.deposit) {
                revert DailyLimitExhausted();
            }
            t.deposit.consumed += amount;
        } else if (!isDeposit) {
            if (block.timestamp >= t.claim.lastUpdated + 1 days) {
                t.claim.lastUpdated = block.timestamp;
                t.claim.consumed = 0;
            }

            if (t.claim.consumed + amount > t.limits.claim) {
                revert DailyLimitExhausted();
            }
            t.claim.consumed += amount;
        }
        return true;
    }

    function deposit(address token, uint256 amount, address to) external whenNotPaused returns (uint256 id) {
        if (!_isValidTokenAmount(token, amount, true)) revert InvalidTokenAmount();
        if (to == address(0)) revert InvalidToAddress();
        id = depositIndex++;
        handleDeposit(token, amount);
        emit Deposit(id, token, amount, to);
    }

    function _hashRequest(uint256 id, address token, uint256 amount, address to) internal pure returns (bytes32 hash) {
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, id)
            mstore(add(ptr, 0x20), shl(96, token))
            mstore(add(ptr, 0x34), amount)
            mstore(add(ptr, 0x54), shl(96, to))
            hash := keccak256(ptr, 0x68)
        }
    }

    function _configureTokenData(address token, TokenLimits calldata limits, bool newToken) internal {
        uint256 currMinAmount = tokenData[token].limits.minAmount;
        if (limits.minAmount == 0 || (newToken ? currMinAmount != 0 : currMinAmount == 0)) {
            revert InvalidTokenConfig();
        }

        TokenUsage memory depositUsage = TokenUsage(0, block.timestamp);
        TokenUsage memory claimUsage = TokenUsage(0, block.timestamp);
        // configuring token also resets the daily volume limit
        TokenData memory data = TokenData(limits, depositUsage, claimUsage);
        tokenData[token] = data;
    }

    /// @inheritdoc IBridge
    function configureToken(address token, TokenLimits calldata limits) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _configureTokenData(token, limits, false);
    }

    /// @dev Internal function to whitelist a new token.
    /// @param token Token that will be deposited in the contract.
    /// @param mirrorToken Token that will be deposited in the mirror contract.
    /// @param limits Token limits associated with the token.
    function _whitelistToken(address token, address mirrorToken, TokenLimits calldata limits) internal {
        if (mirrorTokens[mirrorToken] != address(0)) {
            revert InvalidTokenConfig();
        }

        _configureTokenData(token, limits, true);
        whitelistedTokens.push(token);
        mirrorTokens[mirrorToken] = token;
    }

    /// @inheritdoc IBridge
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @inheritdoc IBridge
    function unpause() external notMigrated onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @inheritdoc IBridge
    function migrate(address _newContract) public whenPaused notMigrated onlyRole(DEFAULT_ADMIN_ROLE) {
        handleMigrate(_newContract);
        migratedContract = _newContract;
    }
}
