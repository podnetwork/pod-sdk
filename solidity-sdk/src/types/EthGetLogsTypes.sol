// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library EthGetLogsTypes {
    /**
     * @dev The address of the external eth get logs precompile.
     */
    address constant PRECOMPILE_ADDRESS = address(uint160(uint256(keccak256("POD_EXTERNAL_ETH_GET_LOGS"))));

    /**
     * @dev The arguments for the external eth get logs precompile.
     * @param fromBlock The block number to start searching from.
     * @param toBlock The block number to stop searching at.
     * @param addr The address to search logs for.
     * @param blockHash The block hash to search logs for.
     * @param topics The topics to search logs for.
     */
    struct RpcArgs {
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
    struct PrecompileArgs {
        uint256 chainId;
        RpcArgs ethGetLogsArgs;
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
}
