// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBridge} from "./interfaces/IBridge.sol";
import {Registry} from "./Registry.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BridgeDepositWithdraw
 * @notice Implementation of the deposit-withdraw bridge.
 * @dev This contract implements the IBridgeDepositWithdraw interface and provides the functionality for
 * depositing and withdrawing tokens between chains.
 */
contract Bridge is IBridge, AccessControl, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes4 internal constant DEPOSIT_SELECTOR = bytes4(keccak256("deposit(address,uint256,address)"));

    // The mock address for native deposit. EIP-7528
    address constant MOCK_ADDRESS_FOR_NATIVE_DEPOSIT = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    mapping(address => TokenData) public tokenData;
    mapping(bytes32 => bool) public processedRequests;

    address[] public whitelistedTokens;
    address public migratedContract;

    uint256 public depositIndex;

    Registry public immutable REGISTRY;
    address public immutable BRIDGE_CONTRACT;
    bytes32 public immutable DOMAIN_SEPARATOR;

    /**
     * @dev Constructor.
     * @param _registry The address of the Registry to use.
     * @param _bridgeContract The address of the bridge contract on the other chain.
     */
    constructor(address _registry, address _bridgeContract, uint256 _bridgeNetworkChainId) {
        if (_bridgeContract == address(0)) revert InvalidBridgeContract();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);

        REGISTRY = Registry(_registry);
        BRIDGE_CONTRACT = _bridgeContract;
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(keccak256("pod network"), keccak256("attest_tx"), keccak256("1"), _bridgeNetworkChainId)
        );
    }

    modifier notMigrated() {
        _notMigrated();
        _;
    }

    function _notMigrated() internal view {
        if (migratedContract != address(0)) {
            revert ContractMigrated();
        }
    }

    function checkInLimits(TokenUsage storage usage, uint256 minAmount, uint256 maxTotalAmount, uint256 amount)
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

    function deposit(address token, uint256 amount, address to) external whenNotPaused returns (bytes32) {
        if (to == address(0)) revert InvalidToAddress();

        TokenData storage t = tokenData[token];
        checkInLimits(t.depositUsage, t.minAmount, t.depositLimit, amount);

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        bytes32 id = bytes32(depositIndex++);

        emit Deposit(id, msg.sender, to, token, amount);

        return id;
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

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external notMigrated onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function migrate(address _newContract) public whenPaused notMigrated onlyRole(DEFAULT_ADMIN_ROLE) {
        handleMigrate(_newContract);
        migratedContract = _newContract;
    }

    function handleMigrate(address _newContract) internal {
        for (uint256 i = 0; i < whitelistedTokens.length; i++) {
            address token = whitelistedTokens[i];
            uint256 tokenBalance = IERC20(token).balanceOf(address(this));
            if (tokenBalance > 0) {
                IERC20(token).safeTransfer(_newContract, tokenBalance);
            }
        }
    }

    function depositTxHash(address token, uint256 amount, address to, bytes calldata proof)
        internal
        view
        returns (bytes32 result)
    {
        bytes4 selector = DEPOSIT_SELECTOR;
        address bridgeContract = BRIDGE_CONTRACT;
        bytes32 domainSeperator = DOMAIN_SEPARATOR;

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
            mstore(ptr, domainSeperator)
            mstore(add(ptr, 0x20), bridgeContract)
            mstore(add(ptr, 0x40), dataHash)
            calldatacopy(add(ptr, 0x60), proof.offset, proof.length)

            result := keccak256(ptr, lenTx)
        }
    }

    function claim(
        address token,
        uint256 amount,
        address to,
        uint64 committeeEpoch,
        bytes calldata aggregatedSignatures,
        bytes calldata proof
    ) public whenNotPaused {
        TokenData storage t = tokenData[token];
        checkInLimits(t.claimUsage, t.minAmount, t.claimLimit, amount);

        address mirrorToken = t.mirrorToken;
        bytes32 txHash = depositTxHash(mirrorToken, amount, to, proof);

        // Check if already processed
        if (processedRequests[txHash]) revert RequestAlreadyProcessed();

        (uint256 weight, uint256 n, uint256 f) = REGISTRY.computeTxWeight(txHash, aggregatedSignatures, committeeEpoch);
        require(weight >= n - f, "Not enough validator weight");

        processedRequests[txHash] = true;

        IERC20(token).safeTransfer(to, amount);
        emit Claim(txHash, to, token, amount);
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
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (token == address(0) || mirrorToken == address(0) || tokenData[token].minAmount != 0) {
            revert InvalidTokenConfig();
        }
        tokenData[token].mirrorToken = mirrorToken;
        _configureTokenData(token, minAmount, depositLimit, claimLimit);
        whitelistedTokens.push(token);
    }
}
