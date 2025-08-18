---
title: Solidity SDK Reference
layout: single

url: /solidity-sdk/reference

toc:
  shared-counter: SharedCounter
  owned-counter: OwnedCounter
  balance: Balance
  uint256-set: Uint256Set
  address-set: AddressSet
  time: Time
---

# Solidity SDK Reference

The Solidity SDK is available at the pod-sdk [github repository](https://github.com/podnetwork/pod-sdk.git).

For example, to install with forge use:

```bash
 $ forge install podnetwork/pod-sdk
```

! anchor fast-types

## Fast types

The `FastTypes` library provides coordination-free data structures through precompiled contracts. All operations are designed to be commutative and safe under pod's consensus model which avoids coordination between the validators.

A smart contract written for pod must not depend on the order of transactions arriving to a validator, otherwise there may be inconsistencies between validators, which may lead to safety issues or a correct transaction to not be approved. However, if a smart contract is written to use only types from `FastTypes` as storage, then it is guaranteed to be safe despite lack of coordination.

To use the library, import the necessary types from `pod-sdk/FastTypes.sol`:

```solidity
import {SharedCounter} from "pod-sdk/FastTypes.sol";
```

---

! anchor owned-counter

### OwnedCounter

A collection of owned `uint256` values. It can be considered as one `bytes32 => uint256` mapping for each transaction sender. Functions revert if a sender is trying to manipulate the value owned by another address.

**Functions**

 * **set(address owner, bytes32 key, uint256 value)**: Set counter to `value`. Ignores previous values.
 * **increment(address owner, bytes32 key, uint256 value)**: Increment counter owned by `owner`, by `value`.
 * **decrement(address owner, bytes32 key, uint256 value)**: Decrement counter owned by `owner` by `value`.
 * **get(address owner, bytes32 key)**: Retrieve value of counter.

All functions revert if `tx.origin` does not equal `owner`. The `key` allows for every owner to have multiple values. The same key on different owners refers to different values.

**Why is OwnedCounter coordination-free?** If two transactions were sent by different users then they cannot access the same key, and if they were sent by the same user they are already ordered by the account nonce.

---

! anchor shared-counter

### SharedCounter

Shared monotonically increasing values that support increment and threshold checking operations.

**Functions**

 * **increment(bytes32 key, uint256 value)**: Increase counter named `key` by `value`.
 * **requireGte(bytes32 key, uint256 value, string errorMessage)**: Revert if counter named `key` is less than `value`.

**Why is SharedCounter coordination-free?** While the SharedCounter allows transactions by different users to affect the same memory, it does not matter in which order the increments happen: if `reguireGte` is true for one validator it will remain true forever and will eventually be true for all other validators as well. Importantly, the shared counter does *not* allow decreasing the counter, or checking if it is smaller than some value (eg. reguireLte), because both would violate this principle.

---

! anchor balance

### Balance

A collection of `uint256` values, where every sender can decrement (spend) his value, but anyone can increment (debit) anyone else's value. This is a basic building block for building any kind of token balances. It does *not* enforce that incrementing value of one address must decrement some amount from another address.

**Functions**

 * **increment(address owner, bytes32 key, uint256 value)** Increase the balance of `owner` for `key` by `value`. Anyone can call.
 * **decrement(address owner, bytes32 key, uint256 value)** Decrease balance of `owner` for `key` by value. Only owner can call.
 * **requireGte(adress owner, bytes32 key, string errorMessage)** Require that the balance of `owner` for `key` is at least `value`. Only owner can call.

See [Tokens](/examples/tokens) or [NFTs](/examples/nfts) for examples using the `Balance` type.

**Why is Balance coordination-free?** It is essentially a combination of SharedCounter and OwnedCounter.

---

! anchor uint256-set

### Uint256Set

Shared collection of uint256 values.

**Functions**
 
 * **add(uint256 value)** Add a value to the set.
 * **requireExists(uint256 value, string error)** Revert if `value` not in the set.
 * **requireLengthGte(uint256 length, string error)** Revert if size of set less than `length`.
 * **requireMaxValueGte(uint256 value, string error)** Revert if maximum value in set less than `value`.

**Why is Uint256Set coordination-free?** A set with `add` and `exists` operations is the most typical CRDT operation. It does not matter in which order elements are added to a set. However, removing elements is non-monotonic and requires coordination. Instead, deletion can be implemented by having a second set, the set of all deleted values.

---

! anchor address-set

### AddressSet

Shared collection of addresses.

**Functions**

 * **add(address addr)** Add address to the set.
 * **requireExists(address addr, string error)** Revert if address is not in the set.
 * **requireLengthGte(uint256 length, string error)** Revert if set does not contain at least `length` addresses.

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
```

For example:

```solidity
Time.Timestamp ts = Time.currentTime();
bool isZero = ts.isZero();
```

**Functions**

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
  * **requireTimeBefore(Time.Timestamp timestamp, string message)**: Require current time is before `timestamp`.
  * **requireTimeAtMost(Time.Timestamp timestamp, string message)**: Require current time is at most `timestamp`.
  * **requireTimeAfter(Time.Timestamp timestamp, string message)**: Require current time is after `timestamp`.
  * **requireTimeAtLeast(Time.Timestamp timestamp, string message)**: Require current time is at least `timestamp`.

---

### Time guards

Helpers to assert time-based conditions using validators' local timestamps and quorum checks.

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
