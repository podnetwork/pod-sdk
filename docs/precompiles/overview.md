---
layout: single
---

# Precompiles
In pod, precompiles work similarly to Ethereum. We currently support all precompiles available in the Prague version of the EVM, plus some Pod-specific ones listed in the table below.


## Precompile Addressing Scheme
The address of each Pod precompile is derived from the precompile name as the last 20 bytes of the `keccak256` hash of the name.

```solidity
address constant POD_TIMESTAMP_PRECOMPILE = address(uint160(uint256(keccak256("POD_TIMESTAMP"))));
```
