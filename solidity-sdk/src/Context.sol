// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

address constant POD_TX_INFO = address(uint160(uint256(keccak256("POD_TX_INFO"))));

/**
 * @notice The transaction info struct
 * @param nonce The nonce of the current transaction
 * @param txHash The hash of the current transaction
 */
struct TxInfo {
    uint64 nonce;
    bytes32 txHash;
}

/**
 * @notice Get information about the current transaction
 * @return The nonce and txHash of the current transaction (as a TxInfo struct)
 */
function getTxInfo() view returns (TxInfo memory) {
    (bool success, bytes memory output) = POD_TX_INFO.staticcall("");
    // checks that the precompile call succeeded
    require(success, "Precompile failed");
    // check that the output is the correct length (2 words)
    require(output.length == 0x40, "Precompile return is incorrect");

    // decode the output into a TxInfo struct
    TxInfo memory info = abi.decode(output, (TxInfo));
    return info;
}
