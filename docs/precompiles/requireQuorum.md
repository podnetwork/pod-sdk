---
layout: simple
---

! content id="requireQuorum"

! anchor requireQuorum
## Require Quorum

Two-round, quorum-based validation. Round 1: each validator checks the single ABI-encoded boolean; if `false`, the call reverts, if `true`, the validator succeeds and produces an attestation for the client. Round 2: once the client presents a quorum of these attestations, the precompile accepts regardless of the boolean because the quorum proves sufficient validator approval.

### Address

0x6AD9145E866c7A7DcCc6c277Ea86abBD268FBAc9

### Inputs

! table style1
| Byte range         | Name      | Description                           |
| ------------------ | --------- | ------------------------------------- |
| [0; 31] (32 bytes) | input     | Boolean to be evaluated by validators |
! table end

> Note: `input` must be deterministic across validators for the same state and call data.

### Output

None.

### Errors

- Out of gas if provided gas is less than fixed base cost.
- Invalid input length (must be exactly 32 bytes).
- Round 1: reverts if `input == false` (quorum requirement not met).
- Round 2: succeeds regardless of `input` when quorum attestations are provided.

### Gas Cost

Base fee: 100

! content end


! content
! sticky

### Example

! codeblock title="solidity-sdk/src/Quorum.sol"
! codeblock import solidity "./src/Quorum.sol" lines="4-7,12-13"
! codeblock end

! sticky end
! content end