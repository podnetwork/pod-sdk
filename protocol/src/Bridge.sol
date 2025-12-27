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

    // The mock address for native deposit. EIP-7528
    address constant MOCK_ADDRESS_FOR_NATIVE_DEPOSIT = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    mapping(address => TokenData) public tokenData;
    mapping(address => address) public mirrorTokens;
    mapping(bytes32 => bool) public processedRequests;

    address[] public whitelistedTokens;
    address public migratedContract;
    address public bridgeContract; // bridge contract on the other chain

    uint256 public depositIndex;

    Registry immutable public REGISTRY;
    bytes32 private immutable BRIDGE_CONTRACT_HASH; // keccak256(abi.encode(bridgeContract))

    /**
     * @dev Constructor.
     * @param _registry The address of the Registry to use.
     * @param _bridgeContract The address of the bridge contract on the other chain.
     */
    constructor(address _registry, address _bridgeContract) {
        if (_bridgeContract == address(0)) revert InvalidBridgeContract();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        bridgeContract = _bridgeContract;

        REGISTRY = Registry(_registry);
        BRIDGE_CONTRACT_HASH = keccak256(abi.encode(_bridgeContract));
    }
    
    modifier notMigrated() {
        if (migratedContract != address(0)) {
            revert ContractMigrated();
        }
        _;
    }

    function checkInLimits(TokenUsage storage usage, uint256 minAmount, uint256 maxTotalAmount, uint256 amount)
        internal
    {
        if (amount < minAmount) {
            revert InvalidTokenAmount();
        }

        // Check limits and if exceeded, check if we can reset daily usage
        uint256 newConsumed = usage.consumed + amount;
        if (newConsumed > maxTotalAmount) {
            if (block.timestamp < usage.lastUpdated + 1 days || amount > maxTotalAmount)
                revert DailyLimitExhausted();
            else {
                usage.lastUpdated = block.timestamp;
                usage.consumed = amount;
            }
        } else {
            usage.consumed = newConsumed;
        }
    }

    function deposit(address token, uint256 amount, address to)
        external
        whenNotPaused
        returns (bytes32)
    {
        if (to == address(0)) revert InvalidToAddress();

        TokenData storage t = tokenData[token];
        if (t.limits.minAmount == 0) {
            revert InvalidTokenAmount(); 
        }
        checkInLimits(t.deposit, t.limits.minAmount, t.limits.deposit, amount);

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        bytes32 id = _getDepositId();
        emit Deposit(id, token, amount, to);
        return id;
    }

    function _configureTokenData(address token, TokenLimits memory limits, bool newToken) internal {
        uint256 currMinAmount = tokenData[token].limits.minAmount;
        if (limits.minAmount == 0 || (newToken ? currMinAmount != 0 : currMinAmount == 0)) {
            revert InvalidTokenConfig();
        }

        TokenUsage memory usage = TokenUsage({consumed: 0, lastUpdated: block.timestamp});
        TokenData memory data = TokenData({limits: limits, deposit: usage, claim: usage});
        tokenData[token] = data;
    }

    
    function configureToken(address token, TokenLimits memory limits) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _configureTokenData(token, limits, false);
    }

    function _whitelistToken(address token, address mirrorToken, TokenLimits memory limits) internal {
        if (mirrorTokens[mirrorToken] != address(0)) {
            revert InvalidTokenConfig();
        }

        _configureTokenData(token, limits, true);
        whitelistedTokens.push(token);
        mirrorTokens[mirrorToken] = token;
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
    
    
    function _getDepositId() internal returns (bytes32) {
        return bytes32(depositIndex++);
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

    /// @dev Hashes deposit input: selector + token + amount + to (100 bytes) using inline assembly
    /// Equivalent to keccak256(abi.encodePacked(bytes4(keccak256("deposit(address,uint256,address)")), abi.encode(token, amount, to)))
    function _hashDepositInput(address token, uint256 amount, address to) internal pure returns (bytes32 result) {
        bytes4 selector = bytes4(keccak256("deposit(address,uint256,address)"));
        assembly {
            let ptr := mload(0x40)
            // Store selector in first 4 bytes
            mstore(ptr, selector)
            // Store token (32 bytes) starting at byte 4
            mstore(add(ptr, 0x04), token)
            // Store amount (32 bytes) starting at byte 36
            mstore(add(ptr, 0x24), amount)
            // Store to (32 bytes) starting at byte 68
            mstore(add(ptr, 0x44), to)
            result := keccak256(ptr, 0x64) // 100 bytes = 0x64
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
        address localToken = mirrorTokens[token];
        if (localToken == address(0)) revert MirrorTokenNotFound();

        TokenData storage t = tokenData[localToken];
        checkInLimits(t.claim, t.limits.minAmount, t.limits.claim, amount);

        bytes32 data = _hashDepositInput(token, amount, to);
        bytes32 txHash = keccak256(abi.encodePacked(
            BRIDGE_CONTRACT_HASH,
            data,
            proof
        ));

        // Check if already processed
        if (processedRequests[txHash]) revert RequestAlreadyProcessed();

        (uint256 weight, uint256 n, uint256 f) = REGISTRY.computeTxWeight(txHash, aggregatedSignatures, committeeEpoch);
        require(weight >= n - f, "Not enough validator weight");

        processedRequests[txHash] = true;

        IERC20(localToken).safeTransfer(to, amount);
        emit Claim(txHash, localToken, token, amount, to);
    }

    /**
     * @param token Token that will be deposited in the contract (local/destination token).
     * @param mirrorToken Token that will be deposited in the mirror contract (source token).
     * @param limits Token limits associated with the token.
     */
    function whiteListToken(address token, address mirrorToken, TokenLimits calldata limits)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(token != address(0), "Token address cannot be zero");
        _whitelistToken(token, mirrorToken, limits);
    }
}
