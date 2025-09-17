// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @dev An ethereum log object.
/// @param addr The address of the log's emitter.
/// @param topics The topics of the log, including the signature, if any.
/// @param data The raw data of the log.
/// @param blockNumber The block number.
/// @param transactionHash The transaction hash.
/// @param transactionIndex The transaction index in the block.
/// @param blockHash The block hash.
/// @param logIndex The log index.
/// @param removed Whether the log was removed.
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

/// @dev The arguments for `eth_getLogs`.
/// @param fromBlock The block number to start searching from.
/// @param toBlock The block number to stop searching at.
/// @param addr The address of the log's emitter.
/// @param blockHash The block hash to search within.
/// @param topics The topics of the log, including the signature, if any.
struct EthGetLogsArgs {
    bytes fromBlock;
    bytes toBlock;
    address addr;
    bytes32 blockHash;
    bytes32[] topics;
}

address constant EXTERNAL_ETH_GET_LOGS_PRECOMPILE = address(uint160(uint256(keccak256("POD_EXTERNAL_ETH_GET_LOGS"))));
uint256 constant ETH_CHAIN_ID = 1;

/// @notice Returns an array of event logs matching the given filter criteria.
/// @param args The arguments for `eth_getLogs`.
/// @return logs The array of event logs.
/// @dev Builds the input data and delegates to the external-get-logs precompile. Reverts on failure.
function getLogs(EthGetLogsArgs memory args) view returns (RpcLog[] memory) {
    bytes memory input = abi.encode(ETH_CHAIN_ID, args);

    (bool success, bytes memory data) = EXTERNAL_ETH_GET_LOGS_PRECOMPILE.staticcall(input);
    if (!success) {
        revert("ExternalEthGetLogs: call failed");
    }

    RpcLog[] memory logs = abi.decode(data, (RpcLog[]));

    return logs;
}
