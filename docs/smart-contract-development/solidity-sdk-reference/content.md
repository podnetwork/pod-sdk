---
title: Solidity SDK Reference
layout: single

url: /solidity-sdk/reference

toc:
  installation: Installation
  counter: Counter
  owned: Owned
  set: Set
  constant: Constant
  time-operations: Time Operations
---

! anchor installation

# Solidity SDK Reference

! anchor counter

## Fast Types

The `FastTypes` library provides order-independent data structures through precompiled contracts. All operations are designed to be commutative and safe under pod's consensus model.

### Counter

A monotonically increasing counter that supports increment and threshold checking operations.

### Data Structure

```solidity
struct Counter {
    bytes32 key;
}
```

**Fields:**
- `key`: Unique identifier for this counter instance

### Functions

#### increment

```solidity
function increment(Counter memory c, uint256 value) public
```

Increments the counter by the specified value.

**Parameters:**
- `c`: Counter instance to increment
- `value`: Amount to add to the counter

**Behavior:**
- Atomically increases the counter value
- Operations are commutative - order of increments doesn't affect final result
- Reverts if the operation fails

#### requireGte

```solidity
function requireGte(Counter memory c, uint256 value) public view
```

Requires that the counter value is greater than or equal to the specified threshold.

**Parameters:**
- `c`: Counter instance to check
- `value`: Minimum required value

**Behavior:**
- Reverts if counter value is less than the specified value
- Read-only operation that doesn't modify state

! anchor owned

### Owned

Data storage with ownership semantics, restricting access to the transaction originator.

### Data Structure

```solidity
struct Owned {
    bytes32 key;
    address owner;
}
```

**Fields:**
- `key`: Unique identifier for this owned data instance
- `owner`: Address that owns this data (must match `tx.origin`)

### Modifier

#### isOwner

```solidity
modifier isOwner(Owned memory owned)
```

Restricts function access to the owner of the data.

**Behavior:**
- Requires `owned.owner == tx.origin`
- Reverts with "Not the owner" if condition fails

### Functions

#### set

```solidity
function set(Owned memory o, bytes32 value) public isOwner(o)
```

Sets the value for owned data.

**Parameters:**
- `o`: Owned instance to modify
- `value`: Value to store

**Behavior:**
- Only callable by the owner
- Overwrites any existing value
- Reverts if caller is not the owner

#### get

```solidity
function get(Owned memory o) public view isOwner(o) returns (bytes32)
```

Retrieves the value from owned data.

**Parameters:**
- `o`: Owned instance to read from

**Returns:**
- `bytes32`: The stored value

**Behavior:**
- Only callable by the owner
- Read-only operation
- Reverts if caller is not the owner

! anchor set

### Set

A collection data structure for managing unique elements with insertion and existence checking.

### Data Structure

```solidity
struct Set {
    bytes32 key;
}
```

**Fields:**
- `key`: Unique identifier for this set instance

### Functions

#### insert

```solidity
function insert(Set memory s, bytes32 value) public
```

Inserts an element into the set.

**Parameters:**
- `s`: Set instance to modify
- `value`: Element to insert

**Behavior:**
- Adds the element to the set if not already present
- Idempotent - inserting the same element multiple times has no additional effect
- Operations are commutative - order of insertions doesn't affect final set

#### requireExist

```solidity
function requireExist(Set memory s, bytes32 value) public view
```

Requires that an element exists in the set.

**Parameters:**
- `s`: Set instance to check
- `value`: Element to verify existence of

**Behavior:**
- Reverts if the element is not in the set
- Read-only operation that doesn't modify state

! anchor constant

### Constant

Write-once data storage for immutable values.

### Data Structure

```solidity
struct Constant {
    bytes32 key;
}
```

**Fields:**
- `key`: Unique identifier for this constant instance

### Functions

#### set

```solidity
function set(Constant memory c, bytes32 value) public
```

Sets the constant value (can only be called once per key).

**Parameters:**
- `c`: Constant instance to initialize
- `value`: Value to store permanently

**Behavior:**
- Can only be called once per key
- Subsequent calls with the same key will revert
- Creates immutable storage

#### requireGet

```solidity
function requireGet(Constant memory c) public view returns (bytes32)
```

Retrieves the constant value, requiring that it has been set.

**Parameters:**
- `c`: Constant instance to read from

**Returns:**
- `bytes32`: The stored constant value

**Behavior:**
- Reverts if the constant has not been set
- Read-only operation
- Guarantees the returned value is immutable

! anchor time-operations

## Time Operations

Time-based utilities for working with pod's timestamp consensus model. These functions handle time validation across pod's distributed validator network.

### Functions

#### requireTimeAfter

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

#### requireTimeBefore

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
