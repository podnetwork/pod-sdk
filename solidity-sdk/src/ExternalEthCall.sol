// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

address constant POD_EXTERNAL_ETH_CALL = address(uint160(uint256(keccak256("POD_EXTERNAL_ETH_CALL"))));

/**
 * @notice An Ethereum transaction data structure.
 * @param from The address of the sender.
 * @param to The address of the contract to call.
 * @param gas The gas limit for the transaction.
 * @param gasPrice The gas price in wei for the transaction.
 * @param value The value in wei to send with the transaction.
 * @param data The calldata to send with the transaction.
 */
struct Transaction {
    address from;
    address to;
    uint256 gas;
    uint256 gasPrice;
    uint256 value;
    bytes data;
}

/**
 * @notice The arguments used to call an external Ethereum contract.
 * @param transaction The transaction to call the external contract with.
 * @param blockNumber The block number to use for the transaction.
 */
struct EthCallArgs {
    Transaction transaction;
    bytes blockNumber;
}

/**
 * @notice Call an external Ethereum contract.
 * @param chainId The chain ID of the Ethereum network.
 * @param callArgs The arguments used to call the external contract.
 * @return The result of the external call. Reverts if the call fails.
 */
function externalEthCall(uint256 chainId, EthCallArgs memory callArgs) view returns (bytes memory) {
    (bool success, bytes memory output) =
        POD_EXTERNAL_ETH_CALL.staticcall{gas: gasleft()}(abi.encode(chainId, callArgs));
    require(success, "Precompile call failed");
    return output;
}
