// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Deploy the contract with the following command in the pod-sdk directory:
// forge create examples/ExternalEthCall.sol:ExternalEthCall --legacy --private-key $FAUCET_PRIVATE_KEY --gas-limit 1000000 --evm-version berlin --broadcast
contract ExternalEthCall {
    struct Transaction {
        address from;
        address to;
        uint256 gas;
        uint256 gasPrice;
        uint256 value;
        bytes data;
    }

    struct EthCallArgs {
        Transaction transaction;
        bytes blockNumber;
    }

    struct ExternalEthCallArgs {
        uint256 chainId;
        EthCallArgs ethCallArgs;
    }

    struct ExampleResponseFromPrecompile {
        bool isStakingPaused;
        bool isStakingLimitSet;
        uint256 currentStakeLimit;
        uint256 maxStakeLimit;
        uint256 maxStakeLimitGrowthBlocks;
        uint256 prevStakeLimit;
        uint256 prevStakeBlockNumber;
    }

    // Calling this:
    // cast call <DEPLOYED_CONTRACT_ADDRESS> "externalEthCallBalanceOf((uint256,((address,address,uint256,uint256,uint256,bytes),bytes)))" "(1,((0x0000000000000000000000000000000000000000,0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,0x0,0x0,0x0,0x70a08231000000000000000000000000F0211d1Bd0c8D208C6A5895FAC32D5534fdf317A),0x6c6174657374))"
    // -> returns uint256
    function externalEthCallBalanceOf(
        ExternalEthCallArgs memory args
    ) public view returns (uint256) {
        bytes memory inputData = abi.encode(args.chainId, args.ethCallArgs);

        address precompileAddress = address(
            uint160(uint256(keccak256("POD_EXTERNAL_ETH_CALL")))
        );

        (bool success, bytes memory output) = precompileAddress.staticcall{
            gas: gasleft()
        }(inputData);
        require(success, "Precompile call failed");

        uint256 balance = abi.decode(output, (uint256));

        return balance;
    }

    // cast call <DEPLOYED_CONTRACT_ADDRESS> "externalEthCallGetStruct((uint256,((address,address,uint256,uint256,uint256,bytes),bytes)))" "(1,((0x0000000000000000000000000000000000000000,0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84,0x0,0x0,0x0,0x665b4b0b),0x6c6174657374))"
    // -> returns (bool,bool,uint256,uint256,uint256,uint256,uint256)
    function externalEthCallGetStruct(
        ExternalEthCallArgs memory args
    ) public view returns (uint256) {
        bytes memory inputData = abi.encode(args.chainId, args.ethCallArgs);

        address precompileAddress = address(
            uint160(uint256(keccak256("POD_EXTERNAL_ETH_CALL")))
        );

        (bool success, bytes memory output) = precompileAddress.staticcall{
            gas: gasleft()
        }(inputData);
        require(success, "Precompile call failed");

        ExampleResponseFromPrecompile memory response = abi.decode(
            output,
            (ExampleResponseFromPrecompile)
        );

        uint256 sum = response.currentStakeLimit +
            response.maxStakeLimit +
            response.maxStakeLimitGrowthBlocks +
            response.prevStakeLimit +
            response.prevStakeBlockNumber;

        return sum;
    }
}
