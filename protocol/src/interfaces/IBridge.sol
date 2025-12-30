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
     * @dev Event emitted when a deposit is made.
     * @param id The request index.
     * @param token The token to bridge (address(0) for native).
     * @param amount The amount of tokens to bridge.
     * @param to The address to send the tokens to.
     */
    event Deposit(bytes32 indexed id, address indexed token, uint256 amount, address indexed to);

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
     * @param minAmount The minimum amount for deposits and claims.
     * @param depositLimit The daily deposit limit.
     * @param claimLimit The daily claim limit.
     * @param deposit The deposit usage data.
     * @param claim The claim usage data.
     * @param mirrorToken The address of the token on the source chain.
     */
    struct TokenData {
        uint256 minAmount;
        uint256 depositLimit;
        uint256 claimLimit;
        TokenUsage depositUsage;
        TokenUsage claimUsage;
        address mirrorToken; // Address of the token on the source chain
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
     * @param minAmount The minimum amount for deposits and claims.
     * @param depositLimit The daily deposit limit.
     * @param claimLimit The daily claim limit.
     */
    function configureToken(address token, uint256 minAmount, uint256 depositLimit, uint256 claimLimit) external;

    /**
     * @dev Deposit tokens to bridge to the destination chain.
     * @notice Function used to bridge tokens to the destination chain.
     *         Use token=address(0) for native deposits (must send msg.value).
     * @param token The token to bridge (address(0) for native).
     * @param amount The amount of tokens to bridge (ignored for native, uses msg.value).
     * @param to The address to receive the tokens on the destination chain.
     * @return id The request index.
     */
    function deposit(address token, uint256 amount, address to) external returns (bytes32);

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

    /**
     * @notice Whitelist a token for bridging.
     * @dev Use MOCK_ADDRESS_FOR_NATIVE_DEPOSIT for token to indicate native currency.
     *      - token=MOCK_ADDRESS_FOR_NATIVE_DEPOSIT: source mirrorToken maps to local native currency.
     * @param token Token that will be deposited in the contract (local/destination token).
     * @param mirrorToken Token that will be deposited in the mirror contract (source token).
     * @param minAmount Minimum amount for deposits and claims.
     * @param depositLimit Daily deposit limit.
     * @param claimLimit Daily claim limit.
     */
    function whiteListToken(
        address token,
        address mirrorToken,
        uint256 minAmount,
        uint256 depositLimit,
        uint256 claimLimit
    ) external;

    /**
     * @notice Claim bridged tokens using an attested transaction proof from Pod.
     * @dev Verifies the deposit transaction via merkle proof and aggregated validator signatures.
     *      The transaction hash (AttestedTx.hash) is computed from the merkle proof.
     *      Anyone can call this function to claim on behalf of the original depositor.
     *      If mirrorToken is address(0), native tokens are transferred; otherwise ERC20 tokens.
     * @param token The token address on Pod that was deposited.
     * @param amount The amount of tokens that were deposited on Pod (and to claim).
     * @param to The address to receive the tokens (must match the 'to' specified in the deposit).
     * @param committeeEpoch The committee epoch for validator signature verification.
     * @param aggregatedSignatures Concatenated 65-byte ECDSA signatures (r,s,v) from validators.
     * @param proof The Merkle multi-proof for verifying transaction fields (to, input).
     */
    function claim(
        address token,
        uint256 amount,
        address to,
        uint64 committeeEpoch,
        bytes calldata aggregatedSignatures,
        bytes calldata proof
    ) external;
}
