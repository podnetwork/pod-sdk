// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {EthGetLogsTypes} from "pod-sdk/types/EthGetLogsTypes.sol";
import {EthGetBlockByNumberTypes} from "pod-sdk/types/EthGetBlockByNumberTypes.sol";
import {TxInfo, getTxInfo} from "pod-sdk/Context.sol";
import {HexUtils} from "./HexUtils.sol";

library PodPrecompileHelper {
    error PrecompileCallFailed();

    /**
     * @dev The address of the external pod mint balance precompile.
     */
    address constant POD_MINT_BALANCE_PRECOMPILE_ADDRESS = address(uint160(uint256(keccak256("POD_MINT_BALANCE"))));

    /**
     * @dev Mints tokens to the caller.
     * @param amount The amount of tokens to mint.
     * @return success Whether the minting was successful.
     */
    function mint(uint256 amount) external view returns (bool) {
        (bool success,) = POD_MINT_BALANCE_PRECOMPILE_ADDRESS.staticcall(abi.encode(amount));
        return success;
    }

    /**
     * @dev Gets the finalized block number.
     * @return blockNumber The finalized block number.
     */
    function getFinalizedBlockNumber() internal view returns (uint256) {
        (bool success, bytes memory output) = EthGetBlockByNumberTypes.PRECOMPILE_ADDRESS.staticcall(
            abi.encode(
                EthGetBlockByNumberTypes.PrecompileArgs(
                    1, EthGetBlockByNumberTypes.RpcArgs(hex"66696e616c697a6564", false)
                )
            )
        );
        if (!success) revert PrecompileCallFailed();
        return HexUtils.uintFromBigEndian(abi.decode(output, (EthGetBlockByNumberTypes.RpcBlock)).number);
    }

    /**
     * @dev Gets the logs.
     * @param blockNumber The block number to get the logs for.
     * @param topics The topics to get the logs for.
     * @param bridgeContract The bridge contract to get the logs for.
     * @return logs The logs.
     */
    function getLogs(uint256 chainId, uint256 blockNumber, bytes32[] memory topics, address bridgeContract)
        internal
        view
        returns (EthGetLogsTypes.RpcLog[] memory)
    {
        bytes memory n = HexUtils.toBytesMinimal(blockNumber);
        (bool success, bytes memory output) = EthGetLogsTypes.PRECOMPILE_ADDRESS.staticcall(
            abi.encode(
                EthGetLogsTypes.PrecompileArgs(
                    chainId, EthGetLogsTypes.RpcArgs(n, n, bridgeContract, bytes32(0), topics)
                )
            )
        );
        if (!success) revert PrecompileCallFailed();

        EthGetLogsTypes.RpcLog[] memory logs = abi.decode(output, (EthGetLogsTypes.RpcLog[]));

        return logs;
    }

    function getTxHash() internal view returns (uint256) {
        TxInfo memory txInfo = getTxInfo();
        return uint256(txInfo.txHash);
    }
}
