// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBridge
 * @notice Interface for cross-chain token bridging contracts.
 * @dev This interface defines the standard contract for bridging tokens between chains.
 * It is implemented by the Bridge abstract contract and it standardizes an API
 * for the shared bridge functionality.
 */
interface IBridge {
    /**
     * @dev Error thrown when attempting to perform operations on an already migrated contract.
     */
    error ContractMigrated();

    /**
     * @dev Error thrown when the provided token amount is invalid (below minimum or exceeds limits).
     */
    error InvalidTokenAmount();

    /**
     * @dev Error thrown when the destination address is zero or invalid.
     */
    error InvalidToAddress();

    /**
     * @dev Error thrown when the token configuration is invalid.
     */
    error InvalidTokenConfig();

    /**
     * @dev Error thrown when the daily deposit or claim limit for a token has been exceeded.
     */
    error DailyLimitExhausted();

    /**
     * @dev Error thrown when attempting to process a claim for a token that has no mirror token mapping.
     */
    error MirrorTokenNotFound();

    /**
     * @dev Error thrown when attempting to process a request that has already been processed.
     */
    error RequestAlreadyProcessed();

    /**
     * @dev Error thrown when the bridge contract is invalid.
     */
    error InvalidBridgeContract();

    /**
     * @dev Error thrown when the deposit log is invalid.
     */
    error InvalidDepositLog();

    /**
     * @dev Error thrown when the nonce is invalid.
     */
    error InvalidNonce();

    /**
     * @dev Event emitted when a deposit is made.
     * @param id The request index.
     * @param token The token to bridge.
     * @param amount The amount of tokens to bridge.
     * @param to The address to send the tokens to.
     */
    event Deposit(bytes32 indexed id, address indexed token, uint256 amount, address indexed to);

    /**
     * @dev Event emitted when a native deposit is made.
     * @param id The request index.
     * @param amount The amount of native tokens to bridge.
     * @param to The address to send the native tokens to.
     */
    event DepositNative(bytes32 indexed id, uint256 amount, address indexed to);

    /**
     * @dev Event emitted when a claim is made.
     * @param id The request index.
     * @param mirrorToken The token on the source chain.
     * @param token The token on the destination chain.
     * @param amount The amount of tokens to bridge.
     * @param to The address to send the tokens to.
     */
    event Claim(bytes32 indexed id, address mirrorToken, address token, uint256 amount, address indexed to);

    /**
     * @dev Event emitted when a native claim is made.
     * @param id The request index.
     * @param amount The amount of native tokens to bridge.
     * @param to The address to send the native tokens to.
     */
    event ClaimNative(bytes32 indexed id, uint256 amount, address indexed to);

    /**
     * @dev Token limits.
     * @param minAmount The minimum amount of tokens that can be deposited.
     * @param deposit The daily deposit limit for the token.
     * @param claim The daily claim limit for the token.
     */
    struct TokenLimits {
        uint256 minAmount;
        uint256 deposit;
        uint256 claim;
    }

    /**
     * @dev Token usage.
     * @param consumed The amount of tokens that have been used.
     * @param lastUpdated The timestamp when the consumed limits were last updated.
     */
    struct TokenUsage {
        uint256 consumed;
        uint256 lastUpdated;
    }

    /**
     * @dev Token data.
     * @param limits The token limits.
     * @param deposit The token usage for deposits.
     * @param claim The token usage for claims.
     */
    struct TokenData {
        TokenLimits limits;
        TokenUsage deposit;
        TokenUsage claim;
    }

    /**
     * @dev Request information.
     * @param id The request index.
     * @param token The token to bridge.
     * @param amount The amount of tokens to bridge.
     * @param to The address to send the tokens to.
     */
    struct RequestInfo {
        uint256 id;
        address token;
        uint256 amount;
        address to;
    }

    /**
     * @dev Update a token's configuration information.
     * Token limits need to be set to half the desired value, due to users being able to deposit and claim at the boundry condition.
     * If the desired deposit limit is 1000 tokens, the limit should be set to 500 tokens.
     * For example, the limits are over the course of 1 day, and the limit reset at 12:00 AM UTC and suppose there are no bridging transactions
     * for that day until 11:58 PM UTC. Then a user can deposit the limit amount at 11:59 PM UTC, and then immediately
     * deposit the limit amount again at 12:00 AM UTC.
     * @notice Token can be disabled by setting deposit and claim limits to zero.
     * @notice Access is restricted to the admin.
     * @param token The token to configure.
     * @param limits The token's new configuration limits.
     */
    function configureToken(address token, TokenLimits calldata limits) external;

    /**
     * @dev Deposit tokens to bridge to the destination chain.
     * @notice Function used to bridge tokens to the destination chain.
     * @param token The token to bridge.
     * @param amount The amount of tokens to bridge.
     * @param to The address to receive the tokens on the destination chain.
     * @return id The request index.
     */
    function deposit(address token, uint256 amount, address to) external returns (bytes32);

    /**
     * @dev Deposit native tokens to bridge to the destination chain.
     * @notice Function used to bridge native tokens to the destination chain.
     * @param to The address to receive the tokens on the destination chain.
     * @return id The request index.
     */
    function depositNative(address to) external payable returns (bytes32);

    /**
     * @dev Pauses the contract.
     * @notice Access control is restricted to the pause role.
     */
    function pause() external;

    /**
     * @dev Unpauses the contract.
     * @notice Access control is restricted to the admin.
     */
    function unpause() external;

    /**
     * @dev Migrates the contract to a new address.
     * @param _newContract Address of the new contract.
     * @notice Access control is restricted to the admin.
     * @notice Migration can only be done once on this contract
     */
    function migrate(address _newContract) external;
}
