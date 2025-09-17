---
title: FastTypes
layout: single

url: /solidity-sdk/fast-types

toc:
  owned-counter: OwnedCounter
  shared-counter: SharedCounter
  balance: Balance
  uint256-set: Uint256Set
  address-set: AddressSet
---

! anchor fast-types
## FastTypes

The `FastTypes` library provides coordination-free data structures through precompiled contracts. All operations are designed to be commutative and safe under pod's consensus model which avoids coordination between the validators.

A smart contract written for pod must not depend on the order of transactions arriving to a validator, otherwise there may be inconsistencies between validators, which may lead to safety issues or a correct transaction to not be approved. However, if a smart contract is written to use only types from `FastTypes` as storage, then it is guaranteed to be safe despite lack of coordination.

To use the library, import the necessary types from `pod-sdk/FastTypes.sol`:

```solidity
import {SharedCounter} from "pod-sdk/FastTypes.sol";
```

---

! anchor owned-counter go-up=fast-types
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

! anchor shared-counter go-up=fast-types
### SharedCounter

Shared monotonically increasing values that support increment and threshold checking operations.

**Functions**

 * **increment(bytes32 key, uint256 value)**: Increase counter named `key` by `value`.
 * **requireGte(bytes32 key, uint256 value, string errorMessage)**: Revert if counter named `key` is less than `value`.

**Why is SharedCounter coordination-free?** While the SharedCounter allows transactions by different users to affect the same memory, it does not matter in which order the increments happen: if `reguireGte` is true for one validator it will remain true forever and will eventually be true for all other validators as well. Importantly, the shared counter does *not* allow decreasing the counter, or checking if it is smaller than some value (eg. reguireLte), because both would violate this principle.

---

! anchor balance go-up=fast-types
### Balance

A collection of `uint256` values, where every sender can decrement (spend) his value, but anyone can increment (debit) anyone else's value. This is a basic building block for building any kind of token balances. It does *not* enforce that incrementing value of one address must decrement some amount from another address.

**Functions**

 * **increment(address owner, bytes32 key, uint256 value)** Increase the balance of `owner` for `key` by `value`. Anyone can call.
 * **decrement(address owner, bytes32 key, uint256 value)** Decrease balance of `owner` for `key` by value. Only owner can call.
 * **requireGte(address owner, bytes32 key, string errorMessage)** Require that the balance of `owner` for `key` is at least `value`. Only owner can call.

See [Tokens](/examples/tokens) or [NFTs](/examples/nfts) for examples using the `Balance` type.

**Why is Balance coordination-free?** It is essentially a combination of SharedCounter and OwnedCounter.

---

! anchor uint256-set go-up=fast-types
### Uint256Set

Shared collection of uint256 values.

**Functions**
 
 * **add(uint256 value)** Add a value to the set.
 * **requireExists(uint256 value, string error)** Revert if `value` not in the set.
 * **requireLengthGte(uint256 length, string error)** Revert if size of set less than `length`.
 * **requireMaxValueGte(uint256 value, string error)** Revert if maximum value in set less than `value`.

**Why is Uint256Set coordination-free?** A set with `add` and `exists` operations is the most typical CRDT operation. It does not matter in which order elements are added to a set. However, removing elements is non-monotonic and requires coordination. Instead, deletion can be implemented by having a second set, the set of all deleted values.

---

! anchor address-set go-up=fast-types
### AddressSet

Shared collection of addresses.

**Functions**

 * **add(address addr)** Add address to the set.
 * **requireExists(address addr, string error)** Revert if address is not in the set.
 * **requireLengthGte(uint256 length, string error)** Revert if set does not contain at least `length` addresses.
