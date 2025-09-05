// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBridgeMintBurn} from "./interfaces/IBridgeMintBurn.sol";
import {Bridge} from "./abstract/Bridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {IERC20MintableAndBurnable} from "./interfaces/IERC20MintableAndBurnable.sol";
import {WrappedToken} from "./WrappedToken.sol";

/**
 * @title BridgeMintBurn
 * @notice Implementation of the mint-burn bridge.
 * @dev This contract implements the IBridgeMintBurn interface and provides the functionality for
 * minting and burning tokens between chains.
 */
contract BridgeMintBurn is Bridge, IBridgeMintBurn {
    using SafeERC20 for IERC20;

    /**
     * @dev The role for the minter.
     */
    bytes32 constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /**
     * @dev The address of the external eth get logs precompile.
     */
    address constant ETH_EXTERNAL_ETH_GET_LOGS_PRECOMPILE =
        address(uint160(uint256(keccak256("ETH_EXTERNAL_ETH_GET_LOGS"))));

    /**
     * @dev The source chain id.
     */
    uint96 constant SOURCE_CHAIN_ID = 1;

    /**
     * @dev "finalized" as bytes
     */
    bytes constant FINALIZED_BLOCK_BYTES = hex"66696e616c697a6564";

    /**
     * @dev The arguments for the external eth get logs precompile.
     * @param fromBlock The block number to start searching from.
     * @param toBlock The block number to stop searching at.
     * @param addr The address to search logs for.
     * @param blockHash The block hash to search logs for.
     * @param topics The topics to search logs for.
     */
    struct EthGetLogsArgs {
        bytes fromBlock;
        bytes toBlock;
        address addr;
        bytes32 blockHash;
        bytes32[] topics;
    }

    /**
     * @dev The arguments for the external eth get logs precompile.
     * @param chainId The chain id to search logs for.
     * @param ethGetLogsArgs The arguments for the external eth get logs precompile.
     */
    struct ExternalEthGetLogsArgs {
        uint256 chainId;
        EthGetLogsArgs ethGetLogsArgs;
    }

    /**
     * @dev The response from the external eth get logs precompile.
     * @param addr The address of the log.
     * @param topics The topics of the log.
     * @param data The data of the log.
     * @param blockNumber The block number of the log.
     * @param transactionHash The transaction hash of the log.
     * @param transactionIndex The transaction index of the log.
     * @param blockHash The block hash of the log.
     * @param logIndex The log index of the log.
     * @param removed Whether the log was removed.
     */
    struct RpcLog {
        address addr;
        bytes32[] topics;
        bytes data;
        bytes blockNumber;
        bytes32 transactionHash;
        bytes transactionIndex;
        bytes32 blockHash;
        bytes logIndex;
        bool removed;
    }

    /**
     * @dev Constructor.
     */
    constructor() {}

    /**
     * @dev Handles the deposit of tokens. The tokens are burned from the msg.sender.
     * @param token The token to deposit.
     * @param amount The amount of tokens to deposit.
     */
    function handleDeposit(address token, uint256 amount) internal override {
        IERC20MintableAndBurnable(token).burnFrom(msg.sender, amount);
    }

    /**
     * @inheritdoc IBridgeMintBurn
     */
    function claim(uint256 id, address token, bytes calldata blockNumberFrom) public whenNotPaused {
        bytes32[] memory topics = new bytes32[](3);
        topics[0] = DEPOSIT_TOPIC_0;
        topics[1] = bytes32(id);
        topics[2] = bytes32(uint256(uint160(token)));

        (bool success, bytes memory output) = ETH_EXTERNAL_ETH_GET_LOGS_PRECOMPILE.staticcall(
            abi.encode(
                ExternalEthGetLogsArgs(
                    SOURCE_CHAIN_ID,
                    EthGetLogsArgs(blockNumberFrom, FINALIZED_BLOCK_BYTES, address(token), bytes32(0), topics)
                )
            )
        );
        if (!success) revert PrecompileCallFailed();

        RpcLog[] memory logs = abi.decode(output, (RpcLog[]));

        if (logs.length == 0) revert NoDepositsFound();
        if (logs.length > 1) revert MultipleDepositsWithSameId();

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
