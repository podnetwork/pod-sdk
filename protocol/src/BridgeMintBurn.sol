// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBridgeMintBurn} from "./interfaces/IBridgeMintBurn.sol";
import {Bridge} from "./abstract/Bridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {IERC20MintableAndBurnable} from "./interfaces/IERC20MintableAndBurnable.sol";
import {WrappedToken} from "./WrappedToken.sol";
import {console} from "forge-std/console.sol";

contract BridgeMintBurn is Bridge, IBridgeMintBurn {
    using SafeERC20 for IERC20;

    bytes32 constant MINTER_ROLE = keccak256("MINTER_ROLE");
    address constant ETH_EXTERNAL_ETH_GET_LOGS_PRECOMPILE =
        address(uint160(uint256(keccak256("ETH_EXTERNAL_ETH_GET_LOGS"))));
    uint96 constant SOURCE_CHAIN_ID = 1;
    bytes constant FINALIZED_BLOCK_BYTES = hex"66696e616c697a6564";

    struct EthGetLogsArgs {
        bytes fromBlock;
        bytes toBlock;
        address addr;
        bytes32 blockHash;
        bytes32[] topics;
    }

    struct ExternalEthGetLogsArgs {
        uint256 chainId;
        EthGetLogsArgs ethGetLogsArgs;
    }

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

    constructor() {}

    function handleDeposit(address token, uint256 amount) internal override {
        IERC20MintableAndBurnable(token).burnFrom(msg.sender, amount);
    }

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

        console.log("mirrorToken");
        console.logAddress(mirrorToken);
        console.log("decodedAmount");
        console.logUint(decodedAmount);
        console.log("decodedTo");
        console.logAddress(decodedTo);

        if (!_isValidTokenAmount(mirrorToken, decodedAmount, false)) revert InvalidTokenAmount();

        bytes32 requestId = _hashRequest(id, token, decodedAmount, decodedTo);

        if (processedRequests[requestId]) revert RequestAlreadyProcessed();

        processedRequests[requestId] = true;

        IERC20MintableAndBurnable(mirrorToken).mint(decodedTo, decodedAmount);

        emit Claim(id, mirrorToken, token, decodedAmount, decodedTo);
    }

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
