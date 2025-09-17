---
layout: single
---

! anchor precompiles-overview
# Precompiles
In pod, precompiles work similarly to Ethereum. We currently support all precompiles available in the Prague version of the EVM, plus some Pod-specific ones listed in the table below.

Recommendation: We recommend interacting with precompiles via the Pod Solidity SDK rather than calling them directly, as the SDK provides typed interfaces and safer defaults. See the [Solidity SDK documentation](/solidity-sdk).


## Precompile Addressing Scheme
The address of each Pod precompile is derived from the precompile name as the last 20 bytes of the `keccak256` hash of the name.

```solidity
address constant POD_TIMESTAMP_PRECOMPILE = address(uint160(uint256(keccak256("POD_TIMESTAMP"))));
```
