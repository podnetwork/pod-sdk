---
title: requireQuorum
layout: simple

url: /solidity-sdk/quorum

toc:
  functions: Available Functions
  usage: Usage
  testing: Testing
---

! content id="solidity-quorum"

! anchor quorum
## requireQuorum

Validator-quorum guard for coordination-free checks. This function routes a boolean condition to a pod precompile that enforces supermajority agreement among validators. If the quorum is not met, the call reverts with the provided error message.

To use, import from `pod-sdk/Quorum.sol`:

```solidity
import {requireQuorum} from "pod-sdk/Quorum.sol";
```

### Functions
* **requireQuorum(bool input, string memory message)** evaluates a condition under pod's consensus rules.


! anchor require-quorum go-up=quorum
#### requireQuorum

`requireQuorum` evaluates a condition under pod's consensus rules:

- If a supermajority of validators agree the condition is true, the call proceeds.
- If the condition is false (or quorum is not met), execution reverts with `message`.

This allows application-level assertions (e.g., time guards, counters, membership checks) to be validated consistently across validators without explicit coordination.

```solidity
function requireQuorum(bool input, string memory message) view;
```

Use `requireQuorum` anywhere you would normally use `require`, but where correctness depends on validator agreement rather than a single local state check. Typical examples include:

- Time assertions (see [requireTimeAfter](/solidity-sdk#requireTimeAfter), [requireTimeBefore](/solidity-sdk#requireTimeBefore)).
- Monotonic data structure checks (see [FastTypes.SharedCounter.requireGte](/solidity-sdk#shared-counter)).


! anchor testing go-up=quorum
### Testing

When testing with Foundry, you can mock the quorum precompile using the helper from `pod-sdk/src/test/podTest.sol`:

```solidity
import {PodTest} from "pod-sdk/src/test/podTest.sol";
import {requireQuorum} from "pod-sdk/Quorum.sol";

contract MyTest is PodTest {
    function test_guard() public {
        podMockQuorum(); // sets up REQUIRE_QUORUM behavior
        requireQuorum(true, "should pass"); // succeeds
    }
}
```

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