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
  require-time-before: requireTimeBefore
  require-time-after: requireTimeAfter
---

# Solidity SDK Reference

To install:

```bash
 $ forge soldeer install pod-sdk~0.1.3 --url https://github.com/podnetwork/pod-sdk/releases/download/v0.1.3/solidity-sdk-v0.1.3.zip
```

! anchor fast-types

## Fast types

The `FastTypes` library provides order-independent data structures through precompiled contracts. All operations are designed to be commutative and safe under pod's consensus model.

A smart contract written for pod must not depend on the order of transactions arriving to a validator, otherwise there may be inconsistencies between validators, which may lead to safety issues or a correct transaction to not be approved by the validators. However, if a smart contract is written to use only types from `FastTypes` as storage, then it is guaranteed to be safe and not depend on the order of transaction execution.

To use the library, import the necessary types from `pod-sdk/FastTypes.sol`:

```solidity
import {SharedCounter} from "pod-sdk/FastTypes.sol";
```

---

! anchor shared-counter

### SharedCounter

Shared monotonically increasing values that support increment and threshold checking operations.

**Functions**

 * **increment(bytes32 key, uint256 value)**: Increase counter named `key` by `value`.
 * **requireGte(bytes32 key, uint256 value, string errorMessage)**: Revert if counter named `key` is less than `value`.

---

! anchor owned-counter

### OwnedCounter

A collection of owned `uint256` values. Functions revert if a sender is trying to manipulate the value owned by another address.

**Functions**

 * **set(address owner, bytes32 key, uint256 value)**: Set counter to `value`. Ignores previous values.
 * **increment(address owner, bytes32 key, uint256 value)**: Increment counter owned by `owner`, by `value`.
 * **decrement(address owner, bytes32 key, uint256 value)**: Decrement counter owned by `owner` by `value`.
 * **get(address owner, bytes32 key)**: Retrieve value of counter.

All functions revert if `tx.origin` does not equal `owner`. The `key` allows for every owner to have multiple values. The same key on different owners refers to different values.

---

! anchor balance

### Balance

A collection of `uint256` values, where every sender can decrement (spend) his value, but anyone can increment (debit) anyone else's value. This is a basic building block for building any kind of token balances. It does *not* enforce that incrementing value of one address must decrement some amount from another address.

**Functions**

 * **increment(address owner, bytes32 key, uint256 value)** Increase the balance of `owner` for `key` by `value`. Anyone can call.
 * **decrement(address owner, bytes32 key, uint256 value)** Decrease balance of `owner` for `key` by value. Only owner can call.
 * **requireGte(adress owner, bytes32 key, string errorMessage)** Require that the balance of `owner` for `key` is at least `value`. Only owner can call.

See [Tokens](/examples/tokens) or [NFTs](/examples/nfts) for examples using the `Balance` type.

---

! anchor uint256-set

### Uint256Set

Shared collection of uint256 values.

**Functions**
 
 * **add(uint256 value)** Add a value to the set.
 * **requireExists(uint256 value, string error)** Revert if `value` not in the set.
 * **requireLengthGte(uint256 length, string error)** Revert if size of set less than `length`.
 * **requireMaxValueGte(uint256 value, string error)** Revert if maximum value in set less than `value`.

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

To use, import `requireTimeAfter` or `requireTimeBefore` from `pod-sdk/Time.sol`:

```solidity
import {requireTimeAfter, requireTimeBefore} from "pod-sdk/Time.sol";
```

---

! anchor require-time-before

### requireTimeBefore

```solidity
function requireTimeBefore(uint256 timestamp, string memory message) view
```

Requires that the current timestamp is before the specified time.

**Parameters:**
- `timestamp`: Unix timestamp that must be in the future
- `message`: Error message if validation fails

**Behavior:**
- Validates that the current timestamp is less than the specified timestamp
- Uses validators' local timestamps - each validator has a different local time
- Ensures a supermajority of validators saw the transaction before the required time
- Reverts with the provided message if condition fails
- Accounts for validator clock differences across the network

See [Auctions](/examples/auctions) for an example that uses `requireTimeBefore`.

---

! anchor require-time-after

### requireTimeAfter

```solidity
function requireTimeAfter(uint256 timestamp, string memory message) view
```

Requires that the current timestamp is after the specified time.

**Parameters:**
- `timestamp`: Unix timestamp that must be in the past
- `message`: Error message if validation fails

**Behavior:**
- Validates that the current timestamp is greater than the specified timestamp
- Uses validators' local timestamps - each validator has a different local time
- Ensures a supermajority of validators saw the transaction after the required time
- Reverts with the provided message if condition fails
- Accounts for validator clock differences across the network
