---
title: Writing Smart Contracts
layout: single

url: /solidity-sdk/overview

toc:
  overview: Overview
  order-independence: Order Independence on pod
  installation: Solidity SDK Installation
  fast-types: Fast Types
  time-operations: Time Operations
---

! anchor overview

# Writing Smart Contracts

## Overview

Writing smart contracts for pod requires understanding its unique consensus model. Unlike traditional blockchains that enforce strict transaction ordering, pod uses weak consensus where transactions can have temporal flexibility while maintaining safety guarantees.

This approach enables optimal performance and throughput, but requires developers to design contracts that can handle flexible transaction ordering correctly.

! anchor order-independence

## Order Independence on pod

pod's consensus model allows transactions to be processed in slightly different orders by different validators. This flexibility is what enables pod's exceptional performance characteristics, but it means smart contracts must be designed to handle:

- Transactions that may execute in different sequences
- Concurrent execution without conflicts
- State changes that are commutative and order-independent

Contracts that depend on strict transaction ordering may produce inconsistent states across validators. To ensure correctness, developers should design contracts where the final state doesn't depend on the exact execution order of transactions.

! anchor solidity-sdk

## Solidity SDK

The pod Solidity SDK provides two main categories of utilities to help developers write order-independent smart contracts:

**Fast Types**: Specialized data structures that guarantee order-independent behavior. Smart contracts that use only these types for storage operations are guaranteed to be safe and correct on pod network, achieving optimal performance while maintaining consistency.

**Time Operations**: Utilities for working with pod's timestamp-based consensus model. Since pod doesn't use traditional blocks, time-sensitive operations need special handling to account for distributed timestamps and potential clock differences between validators.

! anchor installation

## Installation

Add the pod Solidity SDK to your project:

```bash
forge install podnetwork/pod-sdk
```

Add to your `remappings.txt`:
```
pod-sdk/=lib/pod-sdk/solidity-sdk/src/
```

Import in your contracts:
```solidity
import {FastTypes} from "pod-sdk/FastTypes.sol";
import {requireTimeBefore, requireTimeAfter} from "pod-sdk/Time.sol";
```

! anchor fast-types

## Fast Types

### Counter
A numeric counter that can only be incremented and checked. Perfect for tracking totals, votes, or any monotonically increasing values. Counters are safe under pod's consensus because increment operations are commutative - the order doesn't affect the final result.

### Owned
Data structures with ownership semantics that restrict access to the transaction originator. Only the owner can read or modify the data, making operations naturally independent and safe for concurrent execution since different owners never conflict.

### Set
A collection for managing unique elements. Sets support insertion and existence checking, with operations that are naturally commutative - adding the same elements in different orders produces the same final set.

### Constant
Write-once data storage for immutable values. Once set, the value cannot be changed, eliminating any ordering dependencies since there's only one write operation per key.

! anchor time-operations

## Time Operations

The time utilities help you work with pod's timestamp-based consensus model. These utilities ensure your time-sensitive operations work correctly across pod's validator network, handling the nuances of distributed timestamps while maintaining the performance benefits of pod's architecture.

Time operations are essential when building contracts that depend on deadlines, time windows, or temporal ordering of events.