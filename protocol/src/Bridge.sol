// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBridge} from "./interfaces/IBridge.sol";
import {ProofLib} from "./lib/ProofLib.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Bridge
 * @notice Implementation of the deposit-withdraw bridge.
 * @dev This contract implements the IBridge interface and provides the functionality for
 * depositing and withdrawing tokens between chains.
 */
contract Bridge is IBridge, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes4 internal constant DEPOSIT_SELECTOR = bytes4(keccak256("deposit(address,uint256,address)"));
    uint256 internal constant PERMIT_LENGTH = 97; // deadline(32) + v(1) + r(32) + s(32)
    address public immutable BRIDGE_CONTRACT;
    uint256 public immutable CHAIN_ID;

    ContractState public contractState;
    address[] public whitelistedTokens;
    address public migratedContract;

    uint256 public depositIndex;
    uint256 public version;
    bytes32 public domainSeperator;

    uint64 public adversarialResilience;
    uint64 public validatorCount;

    mapping(address => TokenData) public tokenData;
    mapping(bytes32 => bool) public processedRequests;
    mapping(address => bool) public whitelistedCallContracts;
    mapping(address => bool) public activeValidators;

    /**
     * @dev Constructor.
     * @param _bridgeContract The address of the bridge contract on the other chain.
     * @param _validators Initial set of validators.
     * @param _adversarialResilience The adversarial resilience threshold.
     * @param _chainId The chain ID for domain separator.
     * @param _version The initial version for domain separator.
     */
    constructor(
        address _bridgeContract,
        address[] memory _validators,
        uint64 _adversarialResilience,
        uint256 _chainId,
        uint256 _version
    ) {
        if (_bridgeContract == address(0)) revert InvalidBridgeContract();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);

        BRIDGE_CONTRACT = _bridgeContract;
        CHAIN_ID = _chainId;

        // Initialize validators
        _addRemoveValidators(_validators, new address[](0));
        _setAdversarialResilience(_adversarialResilience);
        _updateVersion(_version);
    }

    function _updateVersion(uint256 newVersion) internal {
        version = newVersion;
        domainSeperator = keccak256(
            abi.encode(keccak256("pod network"), keccak256("attest_tx_bridge"), CHAIN_ID, version)
        );
    }

    function _addRemoveValidators(address[] memory addValidators, address[] memory removeValidators) internal {
        for (uint64 j = 0; j < removeValidators.length; ++j) {
            address validator = removeValidators[j];
            if (!activeValidators[validator]) {
                revert ValidatorDoesNotExist();
            }
            activeValidators[validator] = false;
            emit ValidatorRemoved(validator);
        }

        for (uint64 i = 0; i < addValidators.length; ++i) {
            address validator = addValidators[i];
            if (validator == address(0)) {
                revert ValidatorIsZeroAddress();
            }
            if (activeValidators[validator]) {
                revert DuplicateValidator();
            }
            activeValidators[validator] = true;
            emit ValidatorAdded(validator);
        }

        validatorCount = uint64(uint256(validatorCount) + addValidators.length - removeValidators.length);
    }

    function _setAdversarialResilience(uint64 _adversarialResilience) internal {
        if (_adversarialResilience == 0 || _adversarialResilience > validatorCount) {
            revert InvalidAdverserialResilience();
        }
        adversarialResilience = _adversarialResilience;
    }

    function _depositTxHash(address token, uint256 amount, address to, bytes32 _domainSeperator, bytes calldata proof)
        internal
        view
        returns (bytes32 result)
    {
        bytes4 selector = DEPOSIT_SELECTOR;
        address bridgeContract = BRIDGE_CONTRACT;

        uint256 lenTx = 32 + 32 + 32 + proof.length; // DOMAIN_SEPARATOR + bridgeContract + dataHash + proof
        uint256 lenData = 4 + 32 + 32 + 32; // DOMAIN_SEPARATOR + selector + token + amount + to
        bytes memory scratch = new bytes(lenTx > lenData ? lenTx : lenData); // reuse memory
        bytes32 dataHash;
        assembly {
            // Compute dataHash
            let ptr := add(scratch, 0x20)
            mstore(ptr, selector)
            mstore(add(ptr, 0x04), token)
            mstore(add(ptr, 0x24), amount)
            mstore(add(ptr, 0x44), to)

            dataHash := keccak256(ptr, 0x64)

            // Compute final hash
            mstore(ptr, _domainSeperator)
            mstore(add(ptr, 0x20), bridgeContract)
            mstore(add(ptr, 0x40), dataHash)
            calldatacopy(add(ptr, 0x60), proof.offset, proof.length)

            result := keccak256(ptr, lenTx)
        }
    }

    /**
     * @notice Update the validator set, adversarial resilience, and version.
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
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _addRemoveValidators(addValidators, removeValidators);
        _setAdversarialResilience(newResilience);
        _updateVersion(newVersion);
    }

    // forge-lint: disable-next-line(unwrapped-modifier-logic)
    modifier whenPublic() {
        if (contractState != ContractState.Public) revert ContractPaused();
        _;
    }

    // forge-lint: disable-next-line(unwrapped-modifier-logic)
    modifier whenOperational() {
        if (contractState >= ContractState.Paused) revert ContractPaused();
        _;
    }

    // forge-lint: disable-next-line(unwrapped-modifier-logic)
    modifier notMigrated() {
        if (contractState == ContractState.Migrated) revert ContractMigrated();
        _;
    }

    function _applyPermit(address token, address owner, uint256 amount, bytes calldata permit) internal {
        if (permit.length == 0) return;
        if (permit.length != PERMIT_LENGTH) revert InvalidPermitLength();

        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;

        assembly {
            deadline := calldataload(permit.offset)
            v := byte(0, calldataload(add(permit.offset, 32)))
            r := calldataload(add(permit.offset, 33))
            s := calldataload(add(permit.offset, 65))
        }

        try IERC20Permit(token).permit(owner, address(this), amount, deadline, v, r, s) {} catch {}
    }

    function _checkInLimits(TokenUsage storage usage, uint256 minAmount, uint256 maxTotalAmount, uint256 amount)
        internal
    {
        if (minAmount == 0) {
            revert InvalidTokenConfig();
        }

        if (amount < minAmount) {
            revert InvalidTokenAmount();
        }

        // Check limits and if exceeded, check if we can reset daily usage
        uint256 newConsumed = usage.consumed + amount;
        if (newConsumed > maxTotalAmount) {
            if (block.timestamp < usage.lastUpdated + 1 days || amount > maxTotalAmount) {
                revert DailyLimitExhausted();
            } else {
                usage.lastUpdated = block.timestamp;
                usage.consumed = amount;
            }
        } else {
            usage.consumed = newConsumed;
        }
    }

    function deposit(address token, uint256 amount, address to, bytes calldata permit)
        external
        whenPublic
        returns (bytes32)
    {
        if (to == address(0)) revert InvalidToAddress();

        TokenData storage t = tokenData[token];
        _checkInLimits(t.depositUsage, t.minAmount, t.depositLimit, amount);

        _applyPermit(token, msg.sender, amount, permit);
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        bytes32 id = bytes32(depositIndex++);

        emit Deposit(id, token, amount, to);

        return id;
    }

    /// @notice The callee contract on the destination chain must implement: deposit(address token, uint256 amount, address to)
    function depositAndCall(
        address token,
        uint256 amount,
        address callContract,
        uint256 reserveBalance,
        bytes calldata permit
    ) external whenPublic returns (bytes32) {
        if (!whitelistedCallContracts[callContract]) revert CallContractNotWhitelisted();
        if (amount < reserveBalance) revert AmountBelowReserve();

        TokenData storage t = tokenData[token];
        _checkInLimits(t.depositUsage, t.minAmount, t.depositLimit, amount);

        _applyPermit(token, msg.sender, amount, permit);
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        bytes32 id = bytes32(depositIndex++);

        emit DepositAndCall(id, token, amount, msg.sender, callContract, reserveBalance);

        return id;
    }

    /**
     * @notice Batch deposit tokens with permits and emit call events.
     * @dev The callee contract on the destination chain must implement: deposit(address token, uint256 amount, address to)
     *
     *      The deposits and permits arrays are ordered such that deposits with permits come first.
     *      For deposits[i] where i < permits.length, the corresponding permits[i] is applied.
     *      For deposits[i] where i >= permits.length, no permit is applied (requires prior approval).
     */
    function batchDepositAndCall(
        address token,
        DepositParams[] calldata deposits,
        PermitParams[] calldata permits,
        address callContract,
        uint256 reserveBalance
    ) external whenOperational onlyRole(RELAYER_ROLE) {
        if (!whitelistedCallContracts[callContract]) revert CallContractNotWhitelisted();
        if (deposits.length == 0) revert InvalidTokenAmount();

        TokenData storage t = tokenData[token];
        uint256 depositsLength = deposits.length;
        uint256 permitsLength = permits.length;

        for (uint256 i = 0; i < depositsLength; ++i) {
            DepositParams calldata d = deposits[i];

            if (d.amount < reserveBalance) revert AmountBelowReserve();
            if (d.account == address(0)) revert InvalidToAddress();

            _checkInLimits(t.depositUsage, t.minAmount, t.depositLimit, d.amount);

            // Apply permit only for deposits that have corresponding permit data (i < permitsLength)
            if (i < permitsLength) {
                PermitParams calldata p = permits[i];
                // Use permit to approve tokens (try/catch to handle frontrunning)
                try IERC20Permit(token).permit(d.account, address(this), d.amount, p.deadline, p.v, p.r, p.s) {} catch {}
            }

            IERC20(token).safeTransferFrom(d.account, address(this), d.amount);
            bytes32 id = bytes32(depositIndex++);

            emit DepositAndCall(id, token, d.amount, d.account, callContract, reserveBalance);
        }
    }

    function setCallContractWhitelist(address callContract, bool whitelisted) external onlyRole(DEFAULT_ADMIN_ROLE) {
        whitelistedCallContracts[callContract] = whitelisted;
    }

    function _configureTokenData(address token, uint256 minAmount, uint256 depositLimit, uint256 claimLimit) internal {
        if (minAmount == 0) {
            revert InvalidTokenConfig();
        }

        TokenUsage memory usage = TokenUsage({consumed: 0, lastUpdated: block.timestamp});
        TokenData memory data = TokenData({
            minAmount: minAmount,
            depositLimit: depositLimit,
            claimLimit: claimLimit,
            depositUsage: usage,
            claimUsage: usage,
            mirrorToken: tokenData[token].mirrorToken
        });
        tokenData[token] = data;
    }

    function configureToken(address token, uint256 minAmount, uint256 depositLimit, uint256 claimLimit)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (tokenData[token].minAmount == 0) {
            revert InvalidTokenConfig();
        }
        _configureTokenData(token, minAmount, depositLimit, claimLimit);
    }

    function setState(ContractState newState) external {
        ContractState currentState = contractState;

        // Cannot change state once migrated
        if (currentState == ContractState.Migrated) revert ContractMigrated();

        // Cannot set to Migrated via setState (use migrate function)
        if (newState == ContractState.Migrated) revert ContractMigrated();

        // Only admin can change to any state, pauser can only change to Paused
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            if (!hasRole(PAUSER_ROLE, msg.sender) || newState != ContractState.Paused) {
                revert AccessControlUnauthorizedAccount(msg.sender, DEFAULT_ADMIN_ROLE);
            }
        }
        contractState = newState;
        emit ContractStateChanged(currentState, newState);
    }

    function migrate(address _newContract) public notMigrated onlyRole(DEFAULT_ADMIN_ROLE) {
        if (contractState != ContractState.Paused) revert ContractNotPaused();

        ContractState oldState = contractState;
        contractState = ContractState.Migrated;
        migratedContract = _newContract;

        emit ContractStateChanged(oldState, ContractState.Migrated);
    }

    /**
     * @notice Transfer tokens to the migrated contract.
     * @dev Can only be called after migration. Can be called multiple times.
     * @param tokens Array of token addresses to transfer.
     */
    function transferTokensToMigrated(address[] calldata tokens) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (contractState != ContractState.Migrated) revert ContractNotPaused();

        address destination = migratedContract;
        uint256 length = tokens.length;
        for (uint256 i = 0; i < length; ++i) {
            address token = tokens[i];
            uint256 tokenBalance = IERC20(token).balanceOf(address(this));
            if (tokenBalance > 0) {
                IERC20(token).safeTransfer(destination, tokenBalance);
            }
        }
    }

    

    function claim(
        address token,
        uint256 amount,
        address to,
        bytes calldata aggregatedSignatures,
        bytes calldata proof
    ) public whenOperational {
        TokenData storage t = tokenData[token];
        _checkInLimits(t.claimUsage, t.minAmount, t.claimLimit, amount);

        address mirrorToken = t.mirrorToken;
        bytes32 txHash = _depositTxHash(mirrorToken, amount, to, domainSeperator, proof);

        // Check if already processed
        if (processedRequests[txHash]) revert RequestAlreadyProcessed();

        uint256 weight = ProofLib.computeTxWeight(txHash, aggregatedSignatures, activeValidators);
        require(weight >= validatorCount - adversarialResilience, "Not enough validator weight");

        processedRequests[txHash] = true;

        IERC20(token).safeTransfer(to, amount);
        emit Claim(txHash, token, mirrorToken, amount, to);
    }

    function batchClaim(address token, ClaimParams[] calldata claims) external whenOperational {
        if (claims.length == 0) revert InvalidTokenAmount();

        TokenData storage t = tokenData[token];
        address mirrorToken = t.mirrorToken;
        uint256 length = claims.length;

        for (uint256 i = 0; i < length; ++i) {
            ClaimParams calldata c = claims[i];

            _checkInLimits(t.claimUsage, t.minAmount, t.claimLimit, c.amount);

            bytes32 txHash = _depositTxHash(mirrorToken, c.amount, c.to, domainSeperator, c.proof);

            if (processedRequests[txHash]) revert RequestAlreadyProcessed();

            uint256 weight = ProofLib.computeTxWeight(txHash, c.aggregatedSignatures, activeValidators);
            require(weight >= validatorCount - adversarialResilience, "Not enough validator weight");

            processedRequests[txHash] = true;

            IERC20(token).safeTransfer(c.to, c.amount);
            emit Claim(txHash, token, mirrorToken, c.amount, c.to);
        }
    }

    /**
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
    ) external notMigrated onlyRole(DEFAULT_ADMIN_ROLE) {
        if (token == address(0) || mirrorToken == address(0) || tokenData[token].minAmount != 0) {
            revert InvalidTokenConfig();
        }
        tokenData[token].mirrorToken = mirrorToken;
        _configureTokenData(token, minAmount, depositLimit, claimLimit);
        whitelistedTokens.push(token);
    }
}
