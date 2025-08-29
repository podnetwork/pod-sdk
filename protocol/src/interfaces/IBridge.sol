// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBridge
 * @notice Interface for the Bridge contracts that allow for cross-chain communication.
 */
interface IBridge {
    error ContractMigrated();
    error InvalidTokenAmount();
    error InvalidToAddress();
    error InvalidTokenConfig();
    error DailyLimitExhausted();

    event Deposit(uint256 indexed id, address indexed token, uint256 amount, address to);
    event Withdraw(uint256 indexed id, address indexed mirrorToken, address indexed token, uint256 amount, address to);

    struct TokenLimits {
        uint256 minAmount; // The minimum amount of tokens that can be deposited.
        uint256 deposit; // The daily deposit limit for the token.
        uint256 withdraw; // The daily withdrawal limit for the token.
    }

    struct TokenUsage {
        uint256 consumed; // The amount of tokens that have been used.
        uint256 lastUpdated; // The timestamp when the consumed limits were last updated.
    }

    struct TokenData {
        TokenLimits limits;
        TokenUsage deposit;
        TokenUsage withdraw;
    }

    /// @dev Request information.
    /// @param id ID associated with the request.
    /// @param token Token requested.
    /// @param amount Amount of tokens requested.
    /// @param to Address to release the funds to.
    struct RequestInfo {
        uint256 id;
        address token;
        uint256 amount;
        address to;
    }

    /// @dev Returns the number of deposits.
    function depositIndex() external view returns (uint256);

    /// @dev Update a token's configuration information.
    /// @param limits The token's new configuration limits.
    /// @notice Set maxAmount to zero to disable the token.
    /// @notice Can only be called by the weak-admin.
    function configureToken(address token, TokenLimits calldata limits) external;

    /// @dev Deposit tokens to bridge to the other side.
    /// @param token Token being deposited.
    /// @param amount Amount of tokens being deposited.
    /// @param to Address to release the tokens to on the other side.
    /// @return The ID associated to the request.
    function deposit(address token, uint256 amount, address to) external returns (uint256);

    /// @dev Pauses the contract.
    /// @notice The contract can be paused by all addresses
    /// with pause role but can only be unpaused by the weak-admin.
    function pause() external;

    /// @dev Unpauses the contract.
    /// @notice The contract can be paused by all addresses
    /// with pause role but can only be unpaused by the weak-admin.
    function unpause() external;

    /// @dev Migrates the contract to a new address.
    /// @param _newContract Address of the new contract.
    /// @notice This function can only be called once in the lifetime of this
    /// contract by the admin.
    function migrate(address _newContract) external;
}
