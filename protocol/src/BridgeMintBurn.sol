// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBridgeMintBurn} from "./interfaces/IBridgeMintBurn.sol";
import {Bridge} from "./abstract/Bridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {IERC20MintableAndBurnable} from "./interfaces/IERC20MintableAndBurnable.sol";
import {WrappedToken} from "./WrappedToken.sol";
import {EthGetLogsTypes} from "pod-sdk/types/EthGetLogsTypes.sol";
import {EthGetBlockByNumberTypes} from "pod-sdk/types/EthGetBlockByNumberTypes.sol";
import {PodMintBalance} from "./libraries/PodMintBalance.sol";
import {TxInfo, getTxInfo} from "pod-sdk/Context.sol";
import {HexUtils} from "./libraries/HexUtils.sol";

/**
 * @title BridgeMintBurn
 * @notice Implementation of the mint-burn bridge.
 * @dev This contract implements the IBridgeMintBurn interface and provides the functionality for
 * minting and burning tokens between chains.
 */
contract BridgeMintBurn is Bridge, IBridgeMintBurn {
    /**
     * @dev The role for the minter.
     */
    bytes32 constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /**
     * @dev The source chain id.
     */
    uint96 constant SOURCE_CHAIN_ID = 1;

    /**
     * @dev "finalized" as bytes
     */
    bytes constant FINALIZED_BLOCK_BYTES = hex"66696e616c697a6564";

    /**
     * @dev Constructor.
     */
    constructor(address _bridgeContract) Bridge(_bridgeContract) {}

    /**
     * @dev Handles the deposit of tokens. The tokens are burned from the msg.sender.
     * @param token The token to deposit.
     * @param amount The amount of tokens to deposit.
     */
    function handleDeposit(address token, uint256 amount) internal override {
        IERC20MintableAndBurnable(token).burnFrom(msg.sender, amount);
    }

    /**
     * @dev Internal function to get the deposit ID.
     * @return id The request ID of the deposit.
     */
    function _getDepositId() internal view override returns (uint256) {
        TxInfo memory txInfo = getTxInfo();
        return uint256(txInfo.txHash);
    }

    function _getFinalizedBlockNumber() internal view returns (uint256) {
        (bool success, bytes memory output) = EthGetBlockByNumberTypes.PRECOMPILE_ADDRESS.staticcall(
            abi.encode(
                EthGetBlockByNumberTypes.PrecompileArgs(
                    SOURCE_CHAIN_ID, EthGetBlockByNumberTypes.RpcArgs(FINALIZED_BLOCK_BYTES, false)
                )
            )
        );
        if (!success) revert PrecompileCallFailed();

        EthGetBlockByNumberTypes.RpcBlock memory rpcBlock = abi.decode(output, (EthGetBlockByNumberTypes.RpcBlock));

        return HexUtils.uintFromBigEndian(rpcBlock.number);
    }

    function _getLogs(uint256 blockNumber, bytes32[] memory topics)
        internal
        view
        returns (EthGetLogsTypes.RpcLog[] memory)
    {
        bytes memory precompileArgs;
        bytes memory blockNumberBytes = HexUtils.toBytesMinimal(blockNumber);
        precompileArgs = abi.encode(
            EthGetLogsTypes.PrecompileArgs(
                SOURCE_CHAIN_ID,
                EthGetLogsTypes.RpcArgs(blockNumberBytes, blockNumberBytes, address(bridgeContract), bytes32(0), topics)
            )
        );
        (bool success, bytes memory output) = EthGetLogsTypes.PRECOMPILE_ADDRESS.staticcall(precompileArgs);
        if (!success) revert PrecompileCallFailed();
        EthGetLogsTypes.RpcLog[] memory logs = abi.decode(output, (EthGetLogsTypes.RpcLog[]));

        if (logs.length != 1) revert InvalidDepositLog();
        if (logs[0].addr != bridgeContract) revert InvalidBridgeContract();

        return logs;
    }

    /**
     * @inheritdoc IBridgeMintBurn
     */
    function claim(uint256 id, address token, uint256 blockNumber) external override whenNotPaused {
        bytes32[] memory topics = new bytes32[](3);
        topics[0] = DEPOSIT_TOPIC_0;
        topics[1] = bytes32(id);
        topics[2] = bytes32(uint256(uint160(token)));

        uint256 finalizedBlockNumber = _getFinalizedBlockNumber();

        if (blockNumber > finalizedBlockNumber) {
            revert BlockNotFinalized();
        }

        EthGetLogsTypes.RpcLog[] memory logs = _getLogs(blockNumber, topics);

        (uint256 decodedAmount, address decodedTo) = abi.decode(logs[0].data, (uint256, address));

        address mirrorToken = mirrorTokens[token];
        if (mirrorToken == address(0)) revert MirrorTokenNotFound();

        if (!_isValidTokenAmount(mirrorToken, decodedAmount, false)) revert InvalidTokenAmount();

        bytes32 requestId = _hashRequest(id, token, decodedAmount, decodedTo);

        if (processedRequests[requestId]) revert RequestAlreadyProcessed();

        processedRequests[requestId] = true;

        IERC20MintableAndBurnable(mirrorToken).mint(decodedTo, decodedAmount);

        emit Claim(id, mirrorToken, token, decodedAmount, decodedTo);
    }

    /**
     * @inheritdoc IBridgeMintBurn
     */
    function claimNative(uint256 id, uint256 blockNumber) external override whenNotPaused {
        bytes32[] memory topics = new bytes32[](2);
        topics[0] = DEPOSIT_NATIVE_TOPIC_0;
        topics[1] = bytes32(id);

        uint256 finalizedBlockNumber = _getFinalizedBlockNumber();

        if (blockNumber > finalizedBlockNumber) {
            revert BlockNotFinalized();
        }

        EthGetLogsTypes.RpcLog[] memory logs = _getLogs(blockNumber, topics);

        (uint256 decodedAmount, address decodedTo) = abi.decode(logs[0].data, (uint256, address));

        if (decodedAmount < 0.01 ether) revert InvalidAmount();

        bytes32 requestId = _hashRequest(id, address(0), decodedAmount, decodedTo);
        if (processedRequests[requestId]) revert RequestAlreadyProcessed();

        if (decodedTo != msg.sender) revert InvalidToAddress();

        processedRequests[requestId] = true;

        // mint the native tokens to msg.sender
        if (!PodMintBalance.mint(decodedAmount)) revert PrecompileCallFailed();

        emit ClaimNative(id, decodedAmount, decodedTo);
    }

    /**
     * @dev Handles the migration of tokens. The tokens and roles are transferred from the contract to the new contract.
     * @param _newContract The address of the new contract.
     */
    function handleMigrate(address _newContract) internal override {
        for (uint256 i = 0; i < whitelistedTokens.length; i++) {
            address token = whitelistedTokens[i];
            IAccessControl(token).grantRole(DEFAULT_ADMIN_ROLE, _newContract);
            IAccessControl(token).grantRole(MINTER_ROLE, _newContract);
            IAccessControl(token).grantRole(PAUSER_ROLE, _newContract);

            IAccessControl(token).renounceRole(DEFAULT_ADMIN_ROLE, address(this));
            IAccessControl(token).renounceRole(MINTER_ROLE, address(this));
            IAccessControl(token).renounceRole(PAUSER_ROLE, address(this));
        }
    }

    /**
     * @inheritdoc IBridgeMintBurn
     */
    function createAndWhitelistMirrorToken(
        string memory tokenName,
        string memory tokenSymbol,
        address existingToken,
        address mirrorToken,
        uint8 mirrorTokenDecimals,
        TokenLimits calldata limits
    ) external returns (address token) {
        token = existingToken == address(0)
            ? address(new WrappedToken(tokenName, tokenSymbol, mirrorTokenDecimals))
            : existingToken;
        _whitelistToken(token, mirrorToken, limits);
    }
}
