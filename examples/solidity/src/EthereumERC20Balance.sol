// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {Transaction, EthCallArgs, externalEthCall} from "pod-sdk/ExternalEthCall.sol";

/// @title EthereumERC20Balance
contract EthereumERC20Balance {
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

        bytes memory result = externalEthCall(ETH_CHAIN_ID, callArgs);
        return abi.decode(result, (uint256));
    }
}
