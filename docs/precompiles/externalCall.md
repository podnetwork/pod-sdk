---
layout: simple
---

! content id="externalCall"

! anchor externalCall go-up
## External Call

Calls a smart contract on another EVM-compatible chain via the configured validators's RPC URL. Input specifies chain ID, transaction fields, and a block tag/number; output is the raw result of the remote `eth_call`.

### Address

0x8712E00C337971f876621faB9326908fdF330d77

### Inputs

! table style1
| Byte range         | Name                | Description                                                                                               |
| ------------------ | ------------------- | --------------------------------------------------------------------------------------------------------- |
| [0; I size]        | input (I)           | struct ExternalEthCallArgs defining the targeted chain and the arguments of the call (see details below)  |
! table end

The ExternalEthCallArgs struct is defined as:
```solidity
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
```

### Output

Raw bytes returned by the remote `eth_call`.

! table style1
| Byte range         | Name       | Description                 |
| ------------------ | ---------- | --------------------------- |
| [0; R size]        | result (R) | Remote `eth_call` return    |
! table end

### Errors

- Out of gas if provided gas is less than base cost.
- Empty input.
- Input decoding failed.
- No RPC URL configured for the specified chain ID.
- Invalid argument: block number/tag format.
- Invalid argument: `to` is zero.

### Gas Cost

Static gas: 100

! content end


! content
! sticky

### Example

! codeblock title="solidity-sdk/src/ExternalEthCall.sol"
! codeblock import solidity "./src/ExternalEthCall.sol" lines=4-5,15-23,29-33,40-44
! codeblock end

! sticky end
! content end