---
layout: simple
---

! content id="timestamp"

! anchor timestamp
## Timestamp

Fetches the current system timestamp as microseconds since the UNIX epoch.

### Address

0x423Bb123D9d5143e662606Fd343b6766d7BCf721


### Inputs

None.

### Output

! table style1
| Byte range         | Name      | Description                                                |
| ------------------ | --------- | ---------------------------------------------------------- |
| [0; 31] (32 bytes) | timestamp | `uint128` microsecond timestamp, right aligned to 32 bytes |
! table end

### Errors

- Out of gas if provided gas is less than base cost.
- "time before unix epoch" if the system time is earlier than the UNIX epoch.

### Gas Cost

Base fee: 100

! content end


! content
! sticky

### Example

! codeblock title="solidity-sdk/src/Time.sol"
! codeblock import solidity "./src/Time.sol" lines="6-7,30-38"
! codeblock end

! sticky end
! content end