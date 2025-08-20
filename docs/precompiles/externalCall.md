---
layout: single
---

---

! anchor externalCall

! content id="externalCall"

## External Call

Calls a smart contract on another EVM-compatible chain via the configured validators's RPC URL. Input specifies chain ID, transaction fields, and a block tag/number; output is the raw result of the remote `eth_call`.

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

Base fee: 100

! content end


! content
! sticky

### Example

! codeblock title=""
```solidity
    address internal constant EXTERNAL_CALL_PRECOMPILE = address(
        uint160(uint256(keccak256("POD_EXTERNAL_ETH_CALL")))
    );

    function externalEthCall(
        uint256 chainId,
        address to,
        bytes memory data,
        bytes memory blockTag
    ) public view returns (bytes memory) {
        ExternalEthCallArgs memory args = ExternalEthCallArgs({
            chainId: chainId,
            ethCallArgs: EthCallArgs({
                blockNumber: blockTag,
                transaction: Transaction({
                    from: address(0),
                    to: to,
                    gas: 0,
                    gasPrice: 0,
                    value: 0,
                    data: data
                })
            })
        });

        bytes memory inputData = abi.encode(args);

        (bool success, bytes memory output) = EXTERNAL_CALL_PRECOMPILE.staticcall{ gas: gasleft() }(inputData);
        require(success, "Precompile call failed");
        return output;
    }
```
! codeblock end

! sticky end
! content end