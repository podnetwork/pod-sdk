// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library EthGetBlockByNumberTypes {
    /**
     * @dev The address of the external eth get block by number precompile.
     */
    address constant PRECOMPILE_ADDRESS = address(uint160(uint256(keccak256("POD_EXTERNAL_ETH_GET_BLOCK_BY_NUMBER"))));

    /**
     * @dev The arguments for the external eth get block by number precompile.
     * @param blockNumber The block number to get.
     * @param transactionDetailFlag Whether to return full transaction details.
     */
    struct RpcArgs {
        bytes blockNumber;
        bool transactionDetailFlag;
    }

    /**
     * @dev The arguments for the external eth get block by number precompile.
     * @param chainId The chain id to search block by number for.
     * @param ethGetBlockByNumberArgs The arguments for the external eth get block by number precompile.
     */
    struct PrecompileArgs {
        uint256 chainId;
        RpcArgs ethGetBlockByNumberArgs;
    }

    /**
     * @dev The response from the external eth get block by number precompile.
     * @param difficulty The difficulty of the block.
     * @param extraData The extra data of the block.
     * @param gasLimit The gas limit of the block.
     * @param gasUsed The gas used of the block.
     * @param hash The hash of the block.
     * @param logsBloom The logs bloom of the block.
     * @param miner The miner of the block.
     * @param mixHash The mix hash of the block.
     * @param nonce The nonce of the block.
     * @param number The number of the block.
     * @param parentHash The parent hash of the block.
     * @param receiptsRoot The receipts root of the block.
     * @param sha3Uncles The sha3 uncles of the block.
     * @param size The size of the block.
     * @param stateRoot The state root of the block.
     * @param timestamp The timestamp of the block.
     * @param transactions The transactions of the block.
     * @param transactionsRoot The transactions root of the block.
     * @param uncles The uncles of the block.
     */
    struct RpcBlock {
        bytes difficulty;
        bytes extraData;
        bytes gasLimit;
        bytes gasUsed;
        bytes32 hash;
        bytes logsBloom;
        address miner;
        bytes32 mixHash;
        bytes nonce;
        bytes number;
        bytes32 parentHash;
        bytes32 receiptsRoot;
        bytes32 sha3Uncles;
        bytes size;
        bytes32 stateRoot;
        bytes timestamp;
        bytes32[] transactions;
        bytes32 transactionsRoot;
        bytes32[] uncles;
    }
}
