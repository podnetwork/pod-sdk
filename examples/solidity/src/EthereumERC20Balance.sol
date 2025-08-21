// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";


/// @dev Encodes an Ethereum transaction call used by the precompile.
struct Transaction {
    address from;
    address to;
    uint256 gas;
    uint256 gasPrice;
    uint256 value;
    bytes data;
}

/// @dev Encapsulates call arguments and block selector for `eth_call`.
struct EthCallArgs {
    Transaction transaction;
    bytes blockNumber;
}

/// @title EthereumERC20Balance
contract EthereumERC20Balance {    
    address internal constant EXTERNAL_CALL_PRECOMPILE = address(uint160(uint256(keccak256("POD_EXTERNAL_ETH_CALL"))));
    uint256 internal constant ETH_CHAIN_ID = 1;
    address internal constant ETH_USDC_CONTRACT = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    /// @notice Returns the USDC balance for `account` on Ethereum mainnet.
    /// @param account The account to query on Ethereum.
    /// @return balance The USDC balance in base units.
    /// @dev Builds ERC-20 calldata and delegates to the external-call precompile. Reverts on failure.
    function getUSDCBalanceEthereum(address account) public view returns (uint256) {
        bytes memory data = bytes.concat(IERC20.balanceOf.selector, abi.encode(account));

        EthCallArgs memory callArgs = EthCallArgs({
            transaction: Transaction({
                from: address(0),
                to: ETH_USDC_CONTRACT,
                gas: 100000,
                gasPrice: 1000,
                value: 0,
                data: data
            }),
            blockNumber: bytes("latest")
        });

        bytes memory inputData = abi.encode(ETH_CHAIN_ID, callArgs);
        (bool success, bytes memory output) = EXTERNAL_CALL_PRECOMPILE.staticcall{ gas: gasleft() }(inputData);
        require(success, "Precompile call failed");
        return abi.decode(output, (uint256));
    }
}