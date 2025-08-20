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

! codeblock title=""
```solidity
address internal constant EXTERNAL_CALL_PRECOMPILE = address(uint160(uint256(keccak256("POD_EXTERNAL_ETH_CALL"))));

uint256 internal constant ETH_CHAIN_ID = 1;
address internal constant USDC_CONTRACT = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

function getUSDCBalanceEthereum(address account) public view returns (uint256) {
    bytes memory data = bytes.concat(IERC20.balanceOf.selector, abi.encode(account));

    ExternalEthCallArgs memory callArgs = ExternalEthCallArgs({
        chainId: ETH_CHAIN_ID,
        ethCallArgs: EthCallArgs({
            blockNumber: bytes("latest"),
            transaction: Transaction({
                from: address(0),
                to: USDC_CONTRACT,
                data: data,
                gas: 0,
                gasPrice: 0,
                value: 0
            })
        })
    });

    bytes memory inputData = abi.encode(callArgs);

    (bool success, bytes memory output) = EXTERNAL_CALL_PRECOMPILE.staticcall{ gas: gasleft() }(inputData);
    require(success, "Precompile call failed");
    return abi.decode(output, (uint256));
}
```
! codeblock end

! sticky end
! content end