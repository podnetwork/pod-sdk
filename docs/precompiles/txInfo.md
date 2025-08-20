---
layout: single
---

---

! anchor txInfo

! content id="txInfo"

## Transaction Information

Fetches information about the current transaction.
Current implementation provides:
- nonce
- transaction hash

### Inputs

None.

### Output

! table style1
| Byte range         | Name      | Description                                |
| ------------------ | --------- | ------------------------------------------ |
| [0; 31] (32 bytes) | nonce     | `uint64` transaction nonce, right aligned  |
| [32; 63] (32 bytes)| txHash    | transaction hash                           |
! table end

> Note: If the precompile is used in a call, txHash is 0x00

### Errors

- Out of gas if provided gas is less than base cost.

### Gas Cost

Base fee: 100

### Example

! codeblock title="solidity-sdk/src/Context.sol"
! codeblock import solidity "./src/Context.sol" lines="4-5,11-15,20-30"
! codeblock end

! content end