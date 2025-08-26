---
title: Time library
layout: single

url: /solidity-sdk/time

toc:
  functions: Available Functions
  requireTimeBefore: requireTimeBefore
  requireTimeAfter: requireTimeAfter
  requireTimeAtLeast: requireTimeAtLeast
  requireTimeAtMost: requireTimeAtMost
---


! anchor time
## Time

The `Time` package provides utilities for working with time on pod. These utilities work by accessing the local time on each validator, which depends on the time that they first see a transaction.

They ensure that a supermajority of the validators agree on a statement (for example, that the transaction was sent before (or after) a certain time. They also ensure that even if some small minority of validators did not see the transaction in time but later (for example, due to connectivity issues), they will still accept the transaction and execute the same code as the supermajority.

Timestamps in this package use microseconds and are represented by the `Time.Timestamp` type. Obtain one with `Time.currentTime()` or construct with `Time.fromSeconds`, `Time.fromMillis`, or `Time.fromMicros`.

To use the library, import `Time` (and optionally the time guards) from `pod-sdk/Time.sol`:

```solidity
import {Time, requireTimeAfter, requireTimeAtLeast, requireTimeBefore, requireTimeAtMost} from "pod-sdk/Time.sol";
```

Add the `using ... for ...` directive to enable method-style usage on `Time.Timestamp`:

```solidity
using Time for Time.Timestamp;

Time.Timestamp ts = Time.currentTime();
bool isZero = ts.isZero();
```

! anchor functions  go-up=time
### Functions

  * **currentTime()**: Get current timestamp in microseconds as `Time.Timestamp`.
  * **min()**: Minimum possible `Time.Timestamp` value.
  * **max()**: Maximum possible `Time.Timestamp` value.
  * **isZero(Time.Timestamp timestamp)**: Return true if `timestamp` is zero.
  * **fromSeconds(uint64 seconds_)**: Create `Time.Timestamp` from seconds.
  * **fromMillis(uint64 milliseconds)**: Create `Time.Timestamp` from milliseconds.
  * **fromMicros(uint64 microseconds)**: Create `Time.Timestamp` from microseconds.
  * **toSeconds(Time.Timestamp timestamp)**: Convert to whole seconds (truncates microseconds).
  * **addSeconds(Time.Timestamp timestamp, uint64 seconds_)**: Add seconds to a timestamp.
  * **addMillis(Time.Timestamp timestamp, uint64 milliseconds)**: Add milliseconds to a timestamp.
  * **addMicros(Time.Timestamp timestamp, uint64 microseconds)**: Add microseconds to a timestamp.
  * **subSeconds(Time.Timestamp timestamp, uint64 seconds_)**: Subtract seconds (reverts on underflow).
  * **subMillis(Time.Timestamp timestamp, uint64 milliseconds)**: Subtract milliseconds (reverts on underflow).
  * **subMicros(Time.Timestamp timestamp, uint64 microseconds)**: Subtract microseconds (reverts on underflow).
  * **eq(Time.Timestamp a, Time.Timestamp b)**: Return true if timestamps are equal.
  * **gt(Time.Timestamp a, Time.Timestamp b)**: Return true if `a` is greater than `b`.
  * **lt(Time.Timestamp a, Time.Timestamp b)**: Return true if `a` is less than `b`.
  * **gte(Time.Timestamp a, Time.Timestamp b)**: Return true if `a` is greater than or equal to `b`.
  * **lte(Time.Timestamp a, Time.Timestamp b)**: Return true if `a` is less than or equal to `b`.
  * **between(Time.Timestamp timestamp, Time.Timestamp lower, Time.Timestamp upper)**: Return true if within `[lower, upper]` (reverts if `lower > upper`).
  * **diffMicros(Time.Timestamp a, Time.Timestamp b)**: Absolute difference in microseconds.
  * **diffMillis(Time.Timestamp a, Time.Timestamp b)**: Absolute difference in milliseconds.
  * **diffSeconds(Time.Timestamp a, Time.Timestamp b)**: Absolute difference in seconds.
  * **min(Time.Timestamp a, Time.Timestamp b)**: Smaller of two timestamps.
  * **max(Time.Timestamp a, Time.Timestamp b)**: Larger of two timestamps.

---

### Time guards

Helpers to assert time-based conditions using validators' local timestamps and quorum checks.

! anchor requireTimeBefore  go-up=time
#### requireTimeBefore

```solidity
function requireTimeBefore(Time.Timestamp timestamp, string memory message) view
```

Requires that the current timestamp is before the specified time.

**Parameters:**
- `timestamp`: `Time.Timestamp` (microseconds) that must be in the future. Use `Time.fromSeconds`, `Time.fromMillis`, or `Time.fromMicros` to construct.
- `message`: Error message if validation fails

**Behavior:**
- Validates that the current timestamp is less than the specified timestamp
- Uses validators' local timestamps - each validator has a different local time
- Ensures a supermajority of validators saw the transaction before the required time
- Reverts with the provided message if condition fails
- Accounts for validator clock differences across the network

See [Auctions](/examples/auctions) for an example that uses `requireTimeBefore`.

---

! anchor requireTimeAfter  go-up=time
#### requireTimeAfter

```solidity
function requireTimeAfter(Time.Timestamp timestamp, string memory message) view
```

Requires that the current timestamp is after the specified time.

**Parameters:**
- `timestamp`: `Time.Timestamp` (microseconds) that must be in the past. Use `Time.fromSeconds`, `Time.fromMillis`, or `Time.fromMicros` to construct.
- `message`: Error message if validation fails

**Behavior:**
- Validates that the current timestamp is greater than the specified timestamp
- Uses validators' local timestamps - each validator has a different local time
- Ensures a supermajority of validators saw the transaction after the required time
- Reverts with the provided message if condition fails
- Accounts for validator clock differences across the network

See [Voting](/examples/voting) for an example that uses `requireTimeAfter`.

---

! anchor requireTimeAtLeast  go-up=time
#### requireTimeAtLeast

```solidity
function requireTimeAtLeast(Time.Timestamp timestamp, string memory message) view
```

Requires that the current timestamp is greater than or equal to the specified time.

**Parameters:**
- `timestamp`: `Time.Timestamp` (microseconds) that must be in the past or present. Use `Time.fromSeconds`, `Time.fromMillis`, or `Time.fromMicros` to construct.
- `message`: Error message if validation fails

**Behavior:**
- Validates that the current timestamp is greater than or equal to the specified timestamp
- Uses validators' local timestamps - each validator has a different local time
- Ensures a supermajority of validators saw the transaction at or after the required time
- Reverts with the provided message if condition fails
- Accounts for validator clock differences across the network

See [Optimistic Auction](/examples/optimistic-auction) for an example that uses `requireTimeAtLeast`.

---

! anchor requireTimeAtMost  go-up=time
#### requireTimeAtMost

```solidity
function requireTimeAtMost(Time.Timestamp timestamp, string memory message) view
```

Requires that the current timestamp is less than or equal to the specified time.

**Parameters:**
- `timestamp`: `Time.Timestamp` (microseconds) that must be in the future or present. Use `Time.fromSeconds`, `Time.fromMillis`, or `Time.fromMicros` to construct.
- `message`: Error message if validation fails

**Behavior:**
- Validates that the current timestamp is less than or equal to the specified timestamp
- Uses validators' local timestamps - each validator has a different local time
- Ensures a supermajority of validators saw the transaction at or before the required time
- Reverts with the provided message if condition fails
- Accounts for validator clock differences across the network

See [Optimistic Auction](/examples/optimistic-auction) for an example that uses `requireTimeAtMost`.
