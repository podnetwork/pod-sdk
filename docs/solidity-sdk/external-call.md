---
title: ExternalEthCall
layout: simple

url: /solidity-sdk/external-call

toc:
  functions: Available Functions
  external-eth-call: externalEthCall
---

! content id="solidity-external-call"

! anchor external-call
## ExternalEthCall

Call external Ethereum contracts from pod using a precompile. This utility takes an Ethereum-like transaction, forwards it to the configured chain, and returns the calldata result if successful.

To use, import the items from `pod-sdk/ExternalEthCall.sol`:

```solidity
import {externalEthCall, Transaction, EthCallArgs} from "pod-sdk/ExternalEthCall.sol";
```

### Functions
* **externalEthCall(uint256 chainId, EthCallArgs memory callArgs)** Performs an eth_call request on an external EVM compatible chain.


! anchor external-eth-call go-up=external-call
### externalEthCall

Executes a read-only call to a contract on an external Ethereum network and returns the raw return data.

**Parameters:**
- `chainId`: Chain ID of the target Ethereum network (e.g., 1 for Mainnet).
- `callArgs`: The `EthCallArgs` payload with transaction and block context.

**Behavior:**
- Forwards the call via a pod precompile to the specified network.
- Reverts if the precompile call fails or the external call is unsuccessful.
- Returns the returned bytes from the external call on success.


#### Types
- **Transaction**: Describes the Ethereum call parameters.
- **EthCallArgs**: Wraps a `Transaction` with the block number context.

! codeblock
! codeblock import solidity "./src/ExternalEthCall.sol" lines=6-33,40
! codeblock end

! content end


! content
! sticky

### Example

This example uses the POD_EXTERNAL_ETH_CALL precompile to run an eth_call on Ethereum mainnet, returning the USDC balance for a given account.

! codeblock title="examples/solidity/src/EthereumERC20Balance.sol"
! codeblock import solidity "./src/EthereumERC20Balance.sol"
! codeblock end

! sticky end
! content end