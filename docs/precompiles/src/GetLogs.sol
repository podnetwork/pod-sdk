// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @dev Log object returned by `eth_getLogs`.
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

/// @dev Encapsulates call arguments for `eth_getLogs`.
struct EthGetLogsArgs {
    bytes fromBlock;
    bytes toBlock;
    address addr;
    bytes32 blockHash;
    bytes32[] topics;
}

/// @title ExternalEthGetLogs
contract ExternalEthGetLogs {
    address internal constant EXTERNAL_ETH_GET_LOGS_PRECOMPILE =
        address(uint160(uint256(keccak256("POD_EXTERNAL_ETH_GET_LOGS"))));
    uint256 internal constant ETH_CHAIN_ID = 1;

    /// @notice Returns an array of event logs matching the given filter criteria.
    /// @param args The arguments for `eth_getLogs`.
    /// @return logs The array of event logs.
    /// @dev Builds the input data and delegates to the external-get-logs precompile. Reverts on failure.
    function getLogs(EthGetLogsArgs memory args) public view returns (RpcLog[] memory) {
        bytes memory input = abi.encode(ETH_CHAIN_ID, args);

        (bool success, bytes memory data) = EXTERNAL_ETH_GET_LOGS_PRECOMPILE.staticcall(input);
        if (!success) {
            revert("ExternalEthGetLogs: call failed");
        }

        RpcLog[] memory logs = abi.decode(data, (RpcLog[]));

        return logs;
    }
}
