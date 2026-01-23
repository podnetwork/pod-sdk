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
     * @dev Error thrown when attempting to process a request that has already been processed.
     */
    error RequestAlreadyProcessed();

    /**
     * @dev Error thrown when the bridge contract is invalid.
     */
    error InvalidBridgeContract();

    /**
     * @dev Error thrown when amount is less than reserve balance.
     */
    error AmountBelowReserve();

    /**
     * @dev Error thrown when the call contract is not whitelisted.
     */
    error CallContractNotWhitelisted();

    /**
     * @dev Error thrown when the permit bytes length is invalid.
     */
    error InvalidPermitLength();

    /**
     * @dev Error thrown when the contract is paused.
     */
    error ContractPaused();

    /**
     * @dev Error thrown when the contract is not paused (required for migration).
     */
    error ContractNotPaused();

    /**
     * @dev Error thrown when trying to add a zero address as validator.
     */
    error ValidatorIsZeroAddress();

    /**
     * @dev Error thrown when trying to remove a validator that doesn't exist.
     */
    error ValidatorDoesNotExist();

    /**
     * @dev Error thrown when trying to add a validator that already exists.
     */
    error DuplicateValidator();

    /**
     * @dev Error thrown when the adversarial resilience is invalid.
     */
    error InvalidAdverserialResilience();

    /**
     * @dev Error thrown when there are not enough validator signatures.
     */
    error InsufficientValidatorWeight();

    /**
     * @dev Contract state enum.
     * @param Public - Normal operation, all functions available.
     * @param Private - Only batch deposit and claim functions available.
     * @param Paused - No operations allowed.
     * @param Migrated - Contract has been migrated, no operations allowed.
     */
    enum ContractState {
        Public,
        Private,
        Paused,
        Migrated
    }

    /**
     * @dev Event emitted when the contract state changes.
     */
    event ContractStateChanged(ContractState oldState, ContractState newState);

    /**
     * @dev Event emitted when a validator is added.
     */
    event ValidatorAdded(address indexed validator);

    /**
     * @dev Event emitted when a validator is removed.
     */
    event ValidatorRemoved(address indexed validator);

    /**
     * @dev Event emitted when the validator config is updated.
     */
    event ValidatorConfigUpdated(uint256 oldVersion, uint256 newVersion);

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
     * @dev Event emitted when a batch deposit and call is made.
     * @param id The request index.
     * @param token The token being deposited.
     * @param amount The amount of tokens deposited.
     * @param to The address to receive the tokens on the destination chain.
     * @param callContract The contract to call on the destination chain.
     * @param reserveBalance The minimum reserve balance required for this deposit.
     */
    event DepositAndCall(
        bytes32 indexed id,
        address indexed token,
        uint256 amount,
        address indexed to,
        address callContract,
        uint256 reserveBalance
    );

    /**
     * @dev Deposit parameters for batch operations.
     * @param account The address whose tokens will be deposited.
     * @param amount The amount of tokens to deposit.
     */
    struct DepositParams {
        address account;
        uint256 amount;
    }

    /**
     * @dev Permit parameters for ERC20 permit signatures.
     * @param deadline The deadline for the permit signature.
     * @param v The v component of the signature.
     * @param r The r component of the signature.
     * @param s The s component of the signature.
     */
    struct PermitParams {
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    /**
     * @dev Claim parameters for batch claim operations (same token).
     * @param amount The amount of tokens to claim.
     * @param to The address to receive the tokens.
     * @param aggregatedSignatures Concatenated validator signatures.
     * @param proof The Merkle proof for verifying the deposit.
     */
    struct ClaimParams {
        uint256 amount;
        address to;
        bytes aggregatedSignatures;
        bytes proof;
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
     * @param permit Tightly packed permit data (97 bytes: deadline + v + r + s) or empty for no permit.
     * @return id The request index.
     */
    function deposit(address token, uint256 amount, address to, bytes calldata permit) external returns (bytes32);

    /**
     * @notice Deposit tokens with permit and emit a call event for the destination chain.
     * @dev Can be called by any user. Uses ERC20 permit if provided.
     *      The callee contract on the destination chain must implement: deposit(address token, uint256 amount, address to)
     * @param token The token to deposit.
     * @param amount The amount of tokens to deposit.
     * @param callContract The contract address to call on the destination chain.
     * @param reserveBalance The minimum balance required for the deposit.
     * @param permit Tightly packed permit data (97 bytes: deadline + v + r + s) or empty for no permit.
     * @return id The request index.
     */
    function depositAndCall(
        address token,
        uint256 amount,
        address callContract,
        uint256 reserveBalance,
        bytes calldata permit
    ) external returns (bytes32);

    /**
     * @notice Batch deposit tokens with permits and emit call events.
     * @dev Uses ERC20 permit to approve tokens from multiple accounts in a single transaction.
     *      Each deposit must have an amount >= reserveBalance.
     *      Restricted to RELAYER_ROLE.
     *
     *      The callee contract on the destination chain must implement: deposit(address token, uint256 amount, address to)
     *
     *      The deposits and permits arrays are ordered such that deposits with permits come first.
     *      For deposits[i] where i < permits.length, the corresponding permits[i] is applied.
     *      For deposits[i] where i >= permits.length, no permit is applied (requires prior approval).
     *
     * @param token The token to deposit.
     * @param deposits Array of deposit parameters containing account and amount.
     * @param permits Array of permit parameters. Must be <= deposits.length.
     * @param callContract The contract address to call on the destination chain.
     * @param reserveBalance The minimum balance required for each deposit.
     */
    function batchDepositAndCall(
        address token,
        DepositParams[] calldata deposits,
        PermitParams[] calldata permits,
        address callContract,
        uint256 reserveBalance
    ) external;

    /**
     * @notice Whitelist or remove a call contract for batch deposit operations.
     * @param callContract The contract address to whitelist or remove.
     * @param whitelisted True to whitelist, false to remove.
     */
    function setCallContractWhitelist(address callContract, bool whitelisted) external;

    /**
     * @dev Sets the contract state.
     * @notice Access control is restricted to the admin for most transitions.
     *         PAUSER_ROLE can transition to Paused state.
     * @param newState The new contract state.
     */
    function setState(ContractState newState) external;

    /**
     * @dev Migrates the contract to a new address.
     * @param _newContract Address of the new contract.
     * @notice Access control is restricted to the admin.
     * @notice Migration can only be done once on this contract
     */
    function migrate(address _newContract) external;

    /**
     * @notice Transfer tokens to the migrated contract.
     * @dev Can only be called after migration by the admin. Can be called multiple times.
     * @param tokens Array of token addresses to transfer.
     */
    function transferTokensToMigrated(address[] calldata tokens) external;

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
     * @param aggregatedSignatures Concatenated 65-byte ECDSA signatures (r,s,v) from validators.
     * @param proof The Merkle multi-proof for verifying transaction fields (to, input).
     */
    function claim(
        address token,
        uint256 amount,
        address to,
        bytes calldata aggregatedSignatures,
        bytes calldata proof
    ) external;

    /**
     * @notice Batch claim multiple bridged token transfers for the same token.
     * @dev Processes multiple claims efficiently. Each claim is verified independently.
     * @param token The local token to claim.
     * @param claims Array of claim parameters to process.
     */
    function batchClaim(address token, ClaimParams[] calldata claims) external;

    /**
     * @notice Update the validator set, adversarial resilience, and version.
     * @dev Access control is restricted to the admin.
     * @param newResilience The new adversarial resilience threshold.
     * @param newVersion The new version (updates domain separator).
     * @param addValidators Validators to add.
     * @param removeValidators Validators to remove.
     */
    function updateValidatorConfig(
        uint64 newResilience,
        uint256 newVersion,
        address[] memory addValidators,
        address[] memory removeValidators
    ) external;
}
