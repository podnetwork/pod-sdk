// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBridge} from "../interfaces/IBridge.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Bridge
 * @notice Abstract base contract for cross-chain token bridging implementations.
 * @dev This contract implements the IBridge interface and provides common functionality
 * for bridging tokens between chains. It serves as a base contract for both
 * BridgeMintBurn and BridgeDepositWithdraw concrete implementations.
 *
 * The contract uses the Template Method design pattern (https://refactoring.guru/design-patterns/template-method)
 * where the core deposit and migrate functions are implemented here, but delegate specific token handling logic to
 * the callback functions (handleDeposit and handleMigrate) that must be implemented by concrete contracts.
 */
abstract contract Bridge is IBridge, AccessControl, Pausable {
    /**
     * @dev The role ID for addresses that can pause the contract.
     */
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /**
     * @dev The topic 0 (event signature) of the deposit event.
     */
    bytes32 constant DEPOSIT_TOPIC_0 = keccak256("Deposit(uint256,address,uint256,address)");

    /**
     * @dev The topic 0 (event signature) of the deposit native event.
     */
    bytes32 constant DEPOSIT_NATIVE_TOPIC_0 = keccak256("DepositNative(uint256,uint256,address)");

    /**
     * @dev The topic 0 (event signature) of the address for native deposit event.
     */
    address constant MOCK_ADDRESS_FOR_NATIVE_DEPOSIT =
        address(uint160(uint256(keccak256("MOCK_ADDRESS_FOR_NATIVE_DEPOSIT"))));

    /**
     * @dev Map token address to token data.
     */
    mapping(address => TokenData) public tokenData;

    /**
     * @dev Map source chain token address to destination chain token address.
     */
    mapping(address => address) public mirrorTokens;

    /**
     * @dev Map request hash to processed requests.
     */
    mapping(bytes32 => bool) public processedRequests;

    /**
     * @dev Array of all the whitelisted tokens.
     * @notice A token in the list can be disabled.
     */
    address[] public whitelistedTokens;

    /**
     * @dev Map nonce to used nonces.
     */
    mapping(uint256 => bool) public usedNonces;

    /**
     * @dev Address of the migrated contract.
     */
    address public migratedContract;

    /**
     * @dev The address of the bridge contract on the other chain.
     */
    address public bridgeContract;

    /**
     * @dev Constructor.
     * @notice Grants the DEFAULT_ADMIN_ROLE and PAUSER_ROLE to the msg.sender.
     */
    constructor(address _bridgeContract, TokenLimits memory nativeTokenLimits) {
        if (_bridgeContract == address(0)) revert InvalidBridgeContract();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        bridgeContract = _bridgeContract;
        _configureTokenData(MOCK_ADDRESS_FOR_NATIVE_DEPOSIT, nativeTokenLimits, true);
    }

    /**
     * @dev Internal function to handle the deposit of tokens.
     * This is a callback defining the different token handling logic for the different bridge contracts.
     * @param token The token to deposit.
     * @param amount The amount of tokens to deposit.
     */
    function handleDeposit(address token, uint256 amount) internal virtual;

    /**
     * @dev Internal function to get the deposit ID.
     * This is a callback defining the different deposit ID logic for the different bridge contracts.
     * @return id The request ID of the deposit.
     */
    function _getDepositId() internal virtual returns (uint256);

    /**
     * @dev Internal function to handle the migration of tokens.
     * This is a callback defining the different token handling logic for the different bridge contracts.
     * @param _newContract The address of the new contract.
     */
    function handleMigrate(address _newContract) internal virtual;

    /**
     * @dev Modifier to check that contract has not been migrated.
     * @dev Reverts with ContractMigrated if the contract has already been migrated.
     */
    modifier notMigrated() {
        if (migratedContract != address(0)) {
            revert ContractMigrated();
        }
        _;
    }

    /**
     * @dev Internal function to check if the token amount is valid.
     * @param token The token to check.
     * @param amount The amount of tokens to check.
     * @param isDeposit Whether the amount is for a deposit or a claim.
     * @return True if the token amount is valid, false otherwise.
     * @dev Reverts with DailyLimitExhausted if the daily token deposit or claim limit is exhausted.
     */
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

    /**
     * @inheritdoc IBridge
     */
    function deposit(address token, uint256 amount, address to) external override whenNotPaused {
        if (!_isValidTokenAmount(token, amount, true)) revert InvalidTokenAmount();
        if (to == address(0)) revert InvalidToAddress();
        uint256 id = _getDepositId();
        handleDeposit(token, amount);
        emit Deposit(id, token, amount, to);
    }

    /**
     * @inheritdoc IBridge
     */
    function depositNative(address to) external payable override whenNotPaused {
        if (!_isValidTokenAmount(MOCK_ADDRESS_FOR_NATIVE_DEPOSIT, msg.value, true)) revert InvalidTokenAmount();
        uint256 id = _getDepositId();
        emit DepositNative(id, msg.value, to);
    }

    /**
     * @dev Internal function to hash a request.
     * @param id The request index.
     * @param token The token to hash.
     * @param amount The amount of tokens to hash.
     * @param to The address to hash.
     * @return hash The hash of the request used for uniquely identifying a bridging request.
     */
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

    /**
     * @dev Internal function to configure the token data.
     * @param token The token to configure.
     * @param limits The token limits to configure.
     * @param newToken Whether the token is new.
     */
    function _configureTokenData(address token, TokenLimits memory limits, bool newToken) internal {
        uint256 currMinAmount = tokenData[token].limits.minAmount;
        if (limits.minAmount == 0 || (newToken ? currMinAmount != 0 : currMinAmount == 0)) {
            revert InvalidTokenConfig();
        }

        TokenUsage memory depositUsage = TokenUsage(0, block.timestamp);
        TokenUsage memory claimUsage = TokenUsage(0, block.timestamp);

        TokenData memory data = TokenData(limits, depositUsage, claimUsage);
        tokenData[token] = data;
    }

    /**
     * @inheritdoc IBridge
     */
    function configureToken(address token, TokenLimits memory limits) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _configureTokenData(token, limits, false);
    }

    /**
     * @dev Internal function to whitelist a new token.
     * @param token Token that will be deposited in the contract.
     * @param mirrorToken Token that will be deposited in the mirror contract.
     * @param limits Token limits associated with the token.
     */
    function _whitelistToken(address token, address mirrorToken, TokenLimits memory limits) internal {
        if (mirrorTokens[mirrorToken] != address(0)) {
            revert InvalidTokenConfig();
        }

        _configureTokenData(token, limits, true);
        whitelistedTokens.push(token);
        mirrorTokens[mirrorToken] = token;
    }

    /**
     * @inheritdoc IBridge
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @inheritdoc IBridge
     */
    function unpause() external notMigrated onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @inheritdoc IBridge
     */
    function migrate(address _newContract) public whenPaused notMigrated onlyRole(DEFAULT_ADMIN_ROLE) {
        handleMigrate(_newContract);
        migratedContract = _newContract;
    }
}
