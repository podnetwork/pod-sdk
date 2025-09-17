---
layout: simple
---

! content id="externalGetLogs"

! anchor externalGetLogs go-up
## External Get Logs 

Calls a smart contract on another EVM-compatible chain via the configured validators's RPC URL. Input specifies chain ID and log filter parameters; output is the raw result of the remote `eth_getLogs`.

### Address

0x9d2268c492bd5c3cc3c5190165005df0f043c076

### Inputs

! table style1
| Byte range         | Name                | Description                                                                                                  |
| ------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| [0; I size]        | input (I)           | struct ExternalEthGetLogsArgs defining the targeted chain and the log filter parameters (see details below)  |
! table end

The ExternalEthGetLogsArgs struct is defined as:
```solidity

struct EthGetLogsArgs {
    bytes fromBlock;
    bytes toBlock;
    address addr;
    bytes32 blockHash;
    bytes32[] topics;
}

struct ExternalEthGetLogsArgs {
    uint256 chainId;
    EthGetLogsArgs ethGetLogsArgs;
}
```

### Output

The resulting array of logs returned by the remote `eth_getLogs`, abi-encoded

! table style1
| Byte range         | Name       | Description                    |
| ------------------ | ---------- | ------------------------------ |
| [0; R size]        | result (R) | Remote `eth_getLogs` return    |
! table end

### Errors

- Out of gas if provided gas is less than base cost.
- Empty input.
- Input decoding failed.
- No RPC URL configured for the specified chain ID.
- Invalid argument: block number/tag format.

### Gas Cost

Static gas: 100

! content end


! content
! sticky

### Example

This example uses the POD_EXTERNAL_ETH_GET_LOGS precompile to run an eth_getLogs on Ethereum mainnet, returning the resulting logs array for the given log filter. 

! codeblock title="examples/solidity/src/GetLogs.sol"
! codeblock import solidity "./src/GetLogs.sol"
! codeblock end

! sticky end
! content end