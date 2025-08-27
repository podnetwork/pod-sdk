---
title: Context
layout: simple

url: /solidity-sdk/context

toc:
  functions: Available Functions
  gettxinfo: getTxInfo
---

! content id="solidity-context"

! anchor context
## Context

Utility to access pod's context information.

To use, import from `pod-sdk/Context.sol`:

```solidity
import {TxInfo, getTxInfo} from "pod-sdk/Context.sol";
```

### Functions
* **getTxInfo()** Get current transaction info.


! anchor gettxinfo go-up=context
### getTxInfo

Provides a lightweight interface to a precompile that exposes the current transaction's nonce and hash (as a TxInfo struct). This is useful for logging, replay protection logic, or deriving per-transaction identifiers.
Reverts if the precompile call fails or the return payload is not well-formed.

! codeblock
! codeblock import solidity "./src/Context.sol" lines=6-15,20
! codeblock end

! content end


! content
! sticky

### Example

```solidity
import {TxInfo, getTxInfo} from "pod-sdk/Context.sol";

function currentTxHash() view returns (bytes32) {
    TxInfo memory info = getTxInfo();
    return info.txHash;
}
```

! sticky end
! content end