---
layout: simple
---

! content id="requireQuorum"

! anchor requireQuorum go-up
## Require Quorum

The Require Quorum precompile supports the two-round commit–execute flow used by pod.
It allows the enforcing a boolean check during the first round and skip it during the second round, once a quorum of validator approvals has been collected.

This is ideal for scenarios where an action must first be validated by a majority of validators before it can be executed deterministically in the second round.

#### How it works:

**Round 1 – Commit Phase:**  
Validators check the input boolean.  
   . If `false`, the call reverts.  
   . If `true`, an attestation is signed.

**Round 2 – Execute Phase:**  
The client submits a quorum of these attestations.  
The precompile then accepts unconditionally, ensuring the transaction succeeds regardless of the boolean input.

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

Static gas: 100

! content end


! content
! sticky

### Example

The example contract shows a balance-gated action:
-	In Round 1, validators check if the caller has at least 1 ether.
-	In Round 2, after quorum attestations are collected, the action can be executed without rechecking the balance.

! codeblock title="examples/solidity/src/QuorumRestrictedAction.sol"
! codeblock import solidity "./src/QuorumRestrictedAction.sol"
! codeblock end

! sticky end
! content end