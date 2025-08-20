---
layout: single
---

---

! anchor timestamp

! content id="timestamp"

## Timestamp

Fetches the current system timestamp as microseconds since the UNIX epoch.


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

### Example

! codeblock title="solidity-sdk/src/Time.sol"
! codeblock import solidity "./src/Time.sol" lines="30-38"
! codeblock end

! content end